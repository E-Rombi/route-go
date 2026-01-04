import { api } from '@/lib/api';

export interface RouteStep {
    node_index: number;
    customer_id: number;
    order_id?: number; // Added this
    min_time: number;
    max_time: number;
}

export interface VehicleRoute {
    vehicle_db_id: number;
    route: RouteStep[];
}

export interface RouteSolution {
    vehicles: VehicleRoute[];
}

export interface RouteRecord {
    id: number;
    solution_json: RouteSolution;
    created_at: string;
    status: string;
}

export const getRoutes = async () => {
    const response = await api.get<RouteRecord[]>('/routes');
    return response.data;
};

export const updateRoute = async (id: number, data: Partial<RouteRecord>) => {
    const response = await api.put<RouteRecord>(`/routes/${id}`, data);
    return response.data;
};

export const reprocessRoute = async (id: number) => {
    const response = await api.post(`/routes/${id}/reprocess`);
    return response.data;
};

export const triggerOptimization = async () => {
    const response = await api.post('/routes/optimize');
    return response.data;
};
