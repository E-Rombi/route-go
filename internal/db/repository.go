package db

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	Pool *pgxpool.Pool
}

func NewRepository(databaseURL string) (*Repository, error) {
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}
	return &Repository{Pool: pool}, nil
}

func (r *Repository) InitSchema(schemaPath string) error {
	content, err := os.ReadFile(schemaPath)
	if err != nil {
		return err
	}
	_, err = r.Pool.Exec(context.Background(), string(content))
	return err
}

type Vehicle struct {
	ID       int     `json:"id"`
	Name     string  `json:"name"`
	Capacity int     `json:"capacity"`
	StartLat float64 `json:"start_lat"`
	StartLon float64 `json:"start_lon"`
}

type Customer struct {
	ID              int     `json:"id"`
	Name            string  `json:"name"`
	Lat             float64 `json:"lat"`
	Lon             float64 `json:"lon"`
	Demand          int     `json:"demand"`
	TimeWindows     any     `json:"time_windows"` // Keeping as raw JSON for now or []map[string]int
	ServiceDuration int     `json:"service_duration"`
}

type Route struct {
	ID           int    `json:"id"`
	SolutionJSON any    `json:"solution_json"`
	CreatedAt    string `json:"created_at"`
	Status       string `json:"status"`
}

func (r *Repository) CreateVehicle(ctx context.Context, v *Vehicle) error {
	_, err := r.Pool.Exec(ctx, "INSERT INTO vehicles (name, capacity, start_lat, start_lon) VALUES ($1, $2, $3, $4)", v.Name, v.Capacity, v.StartLat, v.StartLon)
	return err
}

func (r *Repository) GetVehicle(ctx context.Context, id int) (*Vehicle, error) {
	var v Vehicle
	err := r.Pool.QueryRow(ctx, "SELECT id, name, capacity, start_lat, start_lon FROM vehicles WHERE id = $1", id).Scan(&v.ID, &v.Name, &v.Capacity, &v.StartLat, &v.StartLon)
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *Repository) UpdateVehicle(ctx context.Context, v *Vehicle) error {
	_, err := r.Pool.Exec(ctx, "UPDATE vehicles SET name = $1, capacity = $2, start_lat = $3, start_lon = $4 WHERE id = $5", v.Name, v.Capacity, v.StartLat, v.StartLon, v.ID)
	return err
}

func (r *Repository) ListVehicles(ctx context.Context) ([]Vehicle, error) {
	rows, err := r.Pool.Query(ctx, "SELECT id, name, capacity, start_lat, start_lon FROM vehicles")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var vehicles []Vehicle
	for rows.Next() {
		var v Vehicle
		if err := rows.Scan(&v.ID, &v.Name, &v.Capacity, &v.StartLat, &v.StartLon); err != nil {
			return nil, err
		}
		vehicles = append(vehicles, v)
	}
	return vehicles, nil
}

func (r *Repository) CreateCustomer(ctx context.Context, c *Customer) error {
	_, err := r.Pool.Exec(ctx, "INSERT INTO customers (name, lat, lon, demand, time_windows, service_duration) VALUES ($1, $2, $3, $4, $5, $6)", c.Name, c.Lat, c.Lon, c.Demand, c.TimeWindows, c.ServiceDuration)
	return err
}

func (r *Repository) ListCustomers(ctx context.Context) ([]Customer, error) {
	rows, err := r.Pool.Query(ctx, "SELECT id, name, lat, lon, demand, time_windows, service_duration FROM customers")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var customers []Customer
	for rows.Next() {
		var c Customer
		if err := rows.Scan(&c.ID, &c.Name, &c.Lat, &c.Lon, &c.Demand, &c.TimeWindows, &c.ServiceDuration); err != nil {
			return nil, err
		}
		customers = append(customers, c)
	}
	return customers, nil
}

type Order struct {
	ID              int     `json:"id"`
	CustomerID      int     `json:"customer_id"`
	CustomerName    string  `json:"customer_name"`
	Lat             float64 `json:"lat"`
	Lon             float64 `json:"lon"`
	Demand          int     `json:"demand"`
	TimeWindows     any     `json:"time_windows"`
	ServiceDuration int     `json:"service_duration"`
	CreatedAt       string  `json:"created_at"`
	Status          string  `json:"status"`
	RouteID         *int    `json:"route_id"`
}

func (r *Repository) CreateOrder(ctx context.Context, o *Order) error {
	_, err := r.Pool.Exec(ctx, "INSERT INTO orders (customer_id, customer_name, lat, lon, demand, time_windows, service_duration, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')", o.CustomerID, o.CustomerName, o.Lat, o.Lon, o.Demand, o.TimeWindows, o.ServiceDuration)
	return err
}

func (r *Repository) ListOrders(ctx context.Context, status string, routeID int) ([]Order, error) {
	query := "SELECT id, customer_id, customer_name, lat, lon, demand, time_windows, service_duration, created_at::text, status, route_id FROM orders WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if routeID != 0 {
		query += fmt.Sprintf(" AND route_id = $%d", argIdx)
		args = append(args, routeID)
		argIdx++
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var orders []Order
	for rows.Next() {
		var o Order
		if err := rows.Scan(&o.ID, &o.CustomerID, &o.CustomerName, &o.Lat, &o.Lon, &o.Demand, &o.TimeWindows, &o.ServiceDuration, &o.CreatedAt, &o.Status, &o.RouteID); err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}
	return orders, nil
}

func (r *Repository) CreateOrdersBatch(ctx context.Context, orders []Order) error {
	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, o := range orders {
		_, err := tx.Exec(ctx, "INSERT INTO orders (customer_id, customer_name, lat, lon, demand, time_windows, service_duration, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')", o.CustomerID, o.CustomerName, o.Lat, o.Lon, o.Demand, o.TimeWindows, o.ServiceDuration)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) ListRoutes(ctx context.Context) ([]Route, error) {
	rows, err := r.Pool.Query(ctx, "SELECT id, solution_json, created_at::text, status FROM routes ORDER BY created_at DESC LIMIT 10")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var routes []Route
	for rows.Next() {
		var rt Route
		if err := rows.Scan(&rt.ID, &rt.SolutionJSON, &rt.CreatedAt, &rt.Status); err != nil {
			return nil, err
		}
		routes = append(routes, rt)
	}
	return routes, nil
}

func (r *Repository) CreateRoute(ctx context.Context, rt *Route) error {
	var id int
	err := r.Pool.QueryRow(ctx, "INSERT INTO routes (solution_json, status) VALUES ($1, $2) RETURNING id", rt.SolutionJSON, rt.Status).Scan(&id)
	if err != nil {
		return err
	}
	rt.ID = id
	return nil
}

func (r *Repository) UpdateRoute(ctx context.Context, rt *Route) error {
	// Simple update for now, status and solution
	_, err := r.Pool.Exec(ctx, "UPDATE routes SET solution_json = $1, status = $2 WHERE id = $3", rt.SolutionJSON, rt.Status, rt.ID)
	return err
}

// Add method to update Orders batch
func (r *Repository) RecruitOrdersToRoute(ctx context.Context, routeID int, orderIDs []int) error {
	// 1. Reset orders currently in this route to pending (optional, depending on logic, but safer)
	// Actually, simpler: Set these orders to routed/routeID.
	// But we also need to handle removals.
	// Best approach used in handlers:
	// a) Set all orders currently with this route_id to pending/NULL
	// b) Set new list of orderIDs to routed/routeID

	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Unassign all orders from this route
	_, err = tx.Exec(ctx, "UPDATE orders SET status = 'pending', route_id = NULL WHERE route_id = $1", routeID)
	if err != nil {
		return err
	}

	// Assign new orders
	if len(orderIDs) > 0 {
		_, err = tx.Exec(ctx, "UPDATE orders SET status = 'routed', route_id = $1 WHERE id = ANY($2)", routeID, orderIDs)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetRoute(ctx context.Context, id int) (*Route, error) {
	var rt Route
	err := r.Pool.QueryRow(ctx, "SELECT id, solution_json, created_at::text, status FROM routes WHERE id = $1", id).Scan(&rt.ID, &rt.SolutionJSON, &rt.CreatedAt, &rt.Status)
	if err != nil {
		return nil, err
	}
	return &rt, nil
}
