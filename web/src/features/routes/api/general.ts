const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function getCustomers() {
    const response = await fetch(`${API_URL}/api/customers`);
    if (!response.ok) {
        throw new Error('Failed to fetch customers');
    }
    return response.json();
}

export async function getVehicles() {
    const response = await fetch(`${API_URL}/api/vehicles`);
    if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
    }
    return response.json();
}
