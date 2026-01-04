import { api } from '@/lib/api';

export interface Order {
    id: number;
    customer_id: number;
    customer_name: string;
    lat: number;
    lon: number;
    demand: number;
    time_windows: { start: number; end: number }[];
    service_duration: number;
    created_at?: string;
}

export const getOrders = async (status?: string, routeId?: number) => {
    const params: any = {};
    if (status) params.status = status;
    if (routeId) params.route_id = routeId;

    const response = await api.get<Order[]>('/orders', {
        params
    });
    return response.data || [];
};

export const createOrder = async (order: Omit<Order, 'id'>) => {
    const response = await api.post('/orders', order);
    return response.data;
};
