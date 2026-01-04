import { api } from '@/lib/api';

export interface Vehicle {
    id: number;
    name: string;
    capacity: number;
    start_lat: number;
    start_lon: number;
}

export const getVehicles = async () => {
    const response = await api.get<Vehicle[]>('/vehicles');
    return response.data || [];
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
    const response = await api.post('/vehicles', vehicle);
    return response.data;
};

export const updateVehicle = async (id: number, vehicle: Omit<Vehicle, 'id'>) => {
    const response = await api.put(`/vehicles/${id}`, vehicle);
    return response.data;
};
