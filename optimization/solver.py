import os
import json
import time
import psycopg2
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import math
from sklearn.cluster import KMeans
import numpy as np
from google.cloud import pubsub_v1

# Configuration
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5433')
DB_NAME = os.getenv('DB_NAME', 'routedb')
DB_USER = os.getenv('DB_USER', 'user')
DB_PASS = os.getenv('DB_PASS', 'password')

# Velocidade média urbana em metros por minuto (30 km/h = 500 m/min)
AVERAGE_SPEED_M_PER_MIN = 500

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calcula a distância real em metros entre dois pontos usando a fórmula de Haversine.
    Muito mais preciso que distância euclidiana para coordenadas geográficas.
    """
    R = 6371000  # Raio da Terra em metros
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c  # Distância em metros


def cluster_locations(locations, n_clusters=None):
    """
    Agrupa localizações por proximidade geográfica usando K-means.
    Retorna os labels de cluster para cada localização.
    """
    if len(locations) <= 1:
        return [0] * len(locations)
    
    # Converte para array numpy 
    coords = np.array(locations)
    
    # Determina número de clusters automaticamente se não especificado
    if n_clusters is None:
        # 1 cluster para cada 5-7 entregas, mínimo 2, máximo 5
        n_clusters = max(2, min(5, len(locations) // 5))
    
    n_clusters = min(n_clusters, len(locations))
    
    if n_clusters < 2:
        return [0] * len(locations)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(coords)
    
    return labels.tolist()


def create_data_model(cursor):
    """Stores the data for the problem."""
    # We allow re-optimization even if confirmed, to handle late updates ("changes after confirmation").

    data = {}

    # 1. Fetch Orders (Pending or already assigned to today's route)
    cursor.execute("""
        SELECT id, lat, lon, demand, time_windows, service_duration, customer_id, customer_name 
        FROM orders 
        WHERE status = 'pending' 
           OR route_id IN (SELECT id FROM routes WHERE route_date = CURRENT_DATE AND status = 'draft')
        ORDER BY id
    """)
    orders = cursor.fetchall()
    
    _locations = []
    _demands = []
    _time_windows = []
    _service_times = []
    _ids = [] 
    _order_metadata = {} # Map node_index -> {customer_id, customer_name}
    
    # --- PROCESS ORDERS ---
    for i, o in enumerate(orders):
        oid, lat, lon, demand, tw_json, duration, cust_id, cust_name = o
        _locations.append((lat, lon))
        _demands.append(demand)
        _ids.append(oid)
        _service_times.append(duration)
        
        # Store metadata (node_index corresponds to i here)
        _order_metadata[i] = {
            "customer_id": cust_id,
            "customer_name": cust_name,
            "order_id": oid,
            "type": "order"
        }
        
        # Parse time windows. Expected JSON: [[start, end], ...] or [{"start": 480, "end": 660}, ...]
        tws = tw_json if tw_json else []
        node_windows = []
        
        if tws and len(tws) > 0:
            if isinstance(tws, list):
                 # Case 1: Flat list [start, end] (Legacy/Simple)
                 if len(tws) == 2 and isinstance(tws[0], int) and isinstance(tws[1], int):
                      node_windows.append((tws[0], tws[1]))
                 else:
                     # Case 2: List of windows [[s, e], [s, e]] or [{...}, {...}]
                     for tw in tws:
                         start, end = 0, 1440
                         if isinstance(tw, dict):
                             start = tw.get('start', 0)
                             end = tw.get('end', 1440)
                         elif isinstance(tw, list) and len(tw) >= 2:
                             start = tw[0]
                             end = tw[1]
                         node_windows.append((start, end))
            else:
                 node_windows.append((0, 1440))
        
        if not node_windows:
            node_windows.append((0, 1440))
            
        # Sort windows by start time to handle gaps correctly
        node_windows.sort(key=lambda x: x[0])
        _time_windows.append(node_windows)

    # --- PROCESS VEHICLES ---
    data['vehicle_capacities'] = []
    data['vehicle_ids'] = []
    data['starts'] = []
    data['ends'] = []
    
    # Columns expected: id, capacity, start_lat, start_lon, end_lat, end_lon
    # Assuming the migration script has run and columns exist.
    cursor.execute("SELECT id, capacity, start_lat, start_lon, end_lat, end_lon FROM vehicles")
    vehicles = cursor.fetchall()
    
    for v in vehicles:
        vid, cap, start_lat, start_lon, end_lat, end_lon = v
        data['vehicle_capacities'].append(cap)
        data['vehicle_ids'].append(vid)
        
        # Add START node
        start_idx = len(_locations)
        _locations.append((start_lat, start_lon))
        _demands.append(0) # Depots have no demand
        _service_times.append(0)
        _time_windows.append([(0, 1440)]) # Depot open all day
        data['starts'].append(start_idx)
        _order_metadata[start_idx] = {"type": "depot_start", "vehicle_id": vid}
        
        # Add END node
        end_idx = len(_locations)
        _locations.append((end_lat, end_lon))
        _demands.append(0)
        _service_times.append(0)
        _time_windows.append([(0, 1440)]) 
        data['ends'].append(end_idx)
        _order_metadata[end_idx] = {"type": "depot_end", "vehicle_id": vid}


    data['num_vehicles'] = len(vehicles)
    data['locations'] = _locations
    data['time_windows'] = _time_windows
    data['demands'] = _demands
    data['service_times'] = _service_times
    data['_ids'] = _ids 
    data['_order_metadata'] = _order_metadata
    
    # 3. Compute clusters (Optional - strictly for orders)
    # We only cluster the order nodes (0 to len(orders)-1)
    if len(orders) > 1:
        cluster_labels = cluster_locations([loc for i, loc in enumerate(_locations) if i < len(orders)])
        # Pad with 0 for vehicle nodes (so length matches _locations)
        data['cluster_labels'] = cluster_labels + [0] * (len(_locations) - len(orders))
    else:
        data['cluster_labels'] = [0] * len(_locations)
    
    return data


def compute_haversine_distance_matrix(locations):
    """
    Cria matriz de distâncias usando Haversine (distância real em metros).
    """
    n = len(locations)
    distances = {}
    
    for i in range(n):
        distances[i] = {}
        for j in range(n):
            if i == j:
                distances[i][j] = 0
            else:
                lat1, lon1 = locations[i]
                lat2, lon2 = locations[j]
                # Distância em metros
                dist_meters = haversine_distance(lat1, lon1, lat2, lon2)
                distances[i][j] = int(dist_meters)
    
    return distances


def compute_time_matrix(locations, speed=AVERAGE_SPEED_M_PER_MIN):
    """
    Cria matriz de tempo de viagem em minutos.
    Baseado na distância Haversine e velocidade média urbana.
    """
    distance_matrix = compute_haversine_distance_matrix(locations)
    time_matrix = {}
    
    for i in distance_matrix:
        time_matrix[i] = {}
        for j in distance_matrix[i]:
            # Converte metros para minutos de viagem
            time_matrix[i][j] = int(distance_matrix[i][j] / speed)
    
    return time_matrix


def optimize():
    print("Connecting to DB...")
    try:
        conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS)
        conn.autocommit = True
        cursor = conn.cursor()
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    data = create_data_model(cursor)
    
    if data is None: # Skipped
        conn.close()
        return

    if data['num_vehicles'] == 0:
        print("No vehicles found.")
        conn.close()
        return
    if len(data['locations']) <= data['num_vehicles'] * 2: 
        # Only vehicle nodes, no orders?
        # Actually logic checked 'orders' length earlier technically but let's be safe
        pass

    num_orders = len(data['_ids'])
    print(f"Optimizing route for {num_orders} orders with {data['num_vehicles']} vehicles")
    
    # Create the routing index manager.
    # Uses explicit Start and End nodes for each vehicle
    manager = pywrapcp.RoutingIndexManager(len(data['locations']),
                                           data['num_vehicles'], 
                                           data['starts'],
                                           data['ends'])

    # Create Routing Model.
    routing = pywrapcp.RoutingModel(manager)

    # 1. Distance Callback (usando Haversine real)
    distance_matrix = compute_haversine_distance_matrix(data['locations'])
    time_matrix = compute_time_matrix(data['locations'])
    
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # 2. Demand Callback
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return data['demands'][from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    
    # Add Capacity constraint.
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # null capacity slack
        data['vehicle_capacities'],  # vehicle maximum capacities
        True,  # start cumul to zero
        'Capacity')

    # 3. Time Windows Constraint
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        # Tempo de viagem + tempo de serviço no nó de origem
        travel_time = time_matrix[from_node][to_node]
        service_time = data['service_times'][from_node]
        return travel_time + service_time

    time_callback_index = routing.RegisterTransitCallback(time_callback)
    
    # Tempo máximo cumulativo = fim do dia (1440 minutos = 24h)
    # As janelas de entrega são em minutos desde meia-noite
    max_cumulative_time = 1440
    
    routing.AddDimension(
        time_callback_index,
        120,  # allow waiting time (até 2 horas)
        max_cumulative_time,  # maximum cumulative time
        False,  # Don't force start cumul to zero
        'Time')
    
    time_dimension = routing.GetDimensionOrDie('Time')
    
    # Add time window constraints for each location
    for location_idx, windows in enumerate(data['time_windows']):
        # If it's a vehicle start/end node, treat carefully
        is_depot = (location_idx in data['starts']) or (location_idx in data['ends'])
        
        index = manager.NodeToIndex(location_idx)
        # NodeToIndex returns -1 if node is not handled by manager (shouldn't happen here usually)
        if index == -1: 
            continue
        
        if not windows:
            continue
            
        # Global Range: Start of first window to End of last window
        global_start = windows[0][0]
        global_end = windows[-1][1]
        
        if is_depot:
            # Hard constraints for depot/start/end (usually 0-1440)
            time_dimension.CumulVar(index).SetRange(global_start, global_end)
        else:
            # SOFT TIME WINDOWS LOGIC for Orders:
            hard_end = min(global_end + 30, 1440) 
            time_dimension.CumulVar(index).SetRange(global_start, hard_end)
            time_dimension.SetCumulVarSoftUpperBound(index, global_end, 1000)
            
            # Remove gaps between windows
            if len(windows) > 1:
                for i in range(len(windows) - 1):
                    gap_start = windows[i][1]
                    gap_end = windows[i+1][0]
                    if gap_end > gap_start:
                         # Attempt to remove interval for gaps
                         # Note: RemoveInterval might be tricky with soft upper bounds if not careful, 
                         # but mostly works on the domain.
                         try:
                             time_dimension.CumulVar(index).RemoveInterval(gap_start, gap_end)
                         except:
                             pass

    
    for vehicle_id in range(data['num_vehicles']):
        # We don't need to manually set Start/End time windows loop here as they are covered above
        # by the general location loop (since they are in _locations).
        
        # Add Fixed Cost per Vehicle
        routing.SetFixedCostOfVehicle(100000, vehicle_id)
        
    # LOAD BALANCING (Time Dimension)
    time_dimension.SetGlobalSpanCostCoefficient(2)

    # 4. Infeasibility Handling: Allow dropping nodes
    # "Sempre Permita 'Dropar' Nós (Penalty)" from best-practice.md
    penalty = 1_000_000  # High penalty to ensure dropped only if necessary
    
    # Iterate over ORDERS only. 
    # Current structure: _locations order is [Order1...OrderN, V1Start...VnEnd]
    # We should only allow dropping ORDERS, not Depots/Starts/Ends.
    # Orders indices in _locations are 0 to num_orders-1
    for i in range(len(data['_ids'])): 
         node_index = i # In new structure, 0..N-1 are orders
         # Safety check
         if node_index not in data['starts'] and node_index not in data['ends']:
             routing.AddDisjunction([manager.NodeToIndex(node_index)], penalty)

    # Setting first solution heuristic.
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    # PATH_CHEAPEST_ARC is recommended by best-practice.md as the fastest and most efficient default.
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)
    
    # Adiciona metaheurística para melhorar a solução inicial
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH)
    search_parameters.time_limit.seconds = 30  # Limita a 30 segundos
    
    # Ative o log para entender o progresso (Recommended by best-practice.md)
    search_parameters.log_search = True

    # Solve the problem.
    print("Solving...")
    solution = routing.SolveWithParameters(search_parameters)

    # Print solution on console.
    if solution:
        total_distance = 0
        
        print(f"Solution found! Objective: {solution.ObjectiveValue()}")
        solution_output = {"vehicles": []}
        
        all_routed_order_ids = []

        for vehicle_id in range(data['num_vehicles']):
            index = routing.Start(vehicle_id)
            route = []
            route_distance = 0
            
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                time_var = time_dimension.CumulVar(index)
                
                step = {
                    "node_index": node_index,
                    "min_time": solution.Min(time_var),
                    "max_time": solution.Max(time_var)
                }
                
                meta = data['_order_metadata'].get(node_index, {})
                
                # Identify if it's an order or start
                if meta.get("type") == "order":
                     step["order_id"] = meta.get("order_id")
                     step["customer_id"] = meta.get("customer_id")
                     step["customer_name"] = meta.get("customer_name")
                     all_routed_order_ids.append(step["order_id"])
                
                route.append(step)
                
                # Calculate arc distance
                next_index = solution.Value(routing.NextVar(index))
                route_distance += routing.GetArcCostForVehicle(index, next_index, vehicle_id)
                     
                index = next_index
            
            # Handle End Node (at loop exit, 'index' is End node)
            node_index = manager.IndexToNode(index)
            time_var = time_dimension.CumulVar(index)
            step = {
                "node_index": node_index,
                "min_time": solution.Min(time_var),
                "max_time": solution.Max(time_var),
                "type": "end"
            }
            route.append(step)
            
            total_distance += route_distance
            
            # Only add vehicle if it serviced real orders (route length > 2 usually means Start -> Order -> End)
            # If route length == 2 (Start -> End), it's empty.
            if len(route) > 2:  
                print(f"Vehicle {data['vehicle_ids'][vehicle_id]}: {len(route)} stops, {route_distance/1000:.1f} km")
            
            solution_output["vehicles"].append({
                "vehicle_db_id": data['vehicle_ids'][vehicle_id],
                "route": route,
                "total_distance_m": route_distance
            })
        
        print(f"\nTotal distance: {total_distance/1000:.1f} km")
        print(f"Total orders routed: {len(all_routed_order_ids)}")
            
        # Save to DB (Upsert)
        json_str = json.dumps(solution_output)
        
        # Upsert Logic
        cursor.execute("SELECT id FROM routes WHERE route_date = CURRENT_DATE AND status = 'draft' LIMIT 1")
        row = cursor.fetchone()
        
        route_id = None
        if row:
            route_id = row[0]
            cursor.execute("UPDATE routes SET solution_json = %s, created_at = CURRENT_TIMESTAMP WHERE id = %s", (json_str, route_id))
            print(f"Updated existing draft route {route_id}.")
        else:
            cursor.execute("INSERT INTO routes (solution_json, route_date, status) VALUES (%s, CURRENT_DATE, 'draft') RETURNING id", (json_str,))
            route_id = cursor.fetchone()[0]
            print(f"Created new route {route_id}.")

        # Update Order Statuses
        cursor.execute("UPDATE orders SET status = 'pending', route_id = NULL WHERE route_id = %s", (route_id,))
        
        if all_routed_order_ids:
             cursor.execute("UPDATE orders SET status = 'routed', route_id = %s WHERE id = ANY(%s)", (route_id, all_routed_order_ids))
        
        print("Solution saved to database (Upserted).")

    else:
        print("No solution found !")

    conn.close()

def main():
    print("Starting optimization worker...")
    
    # Check if run as one-off script
    if os.environ.get("RUN_ONCE") == "true":
         optimize()
         return

    # Pub/Sub Listener
    if not os.getenv("PUBSUB_EMULATOR_HOST"):
        os.environ["PUBSUB_EMULATOR_HOST"] = "localhost:8085"
    
    project_id = "route-go-project"
    topic_id = "route-events"
    subscription_id = "solver-sub"
    
    subscriber = pubsub_v1.SubscriberClient()
    publisher = pubsub_v1.PublisherClient()
    
    topic_path = publisher.topic_path(project_id, topic_id)
    subscription_path = subscriber.subscription_path(project_id, subscription_id)
    
    try:
        publisher.create_topic(name=topic_path)
    except:
        pass

    try:
        subscriber.create_subscription(name=subscription_path, topic=topic_path)
    except:
        pass

    def callback(message):
        print(f"Received message: {message.data}")
        message.ack()
        try:
             optimize()
        except Exception as e:
            print(f"Error processing message: {e}")

    streaming_pull_future = subscriber.subscribe(subscription_path, callback=callback)
    print(f"Listening for messages on {subscription_path}...")

    try:
        streaming_pull_future.result()
    except TimeoutError:
        streaming_pull_future.cancel()
    except KeyboardInterrupt:
        streaming_pull_future.cancel()

if __name__ == '__main__':
    main()
