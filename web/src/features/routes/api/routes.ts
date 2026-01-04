const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function createRoute(data: any) {
    const response = await fetch(`${API_URL}/api/routes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to create route');
    }
    return response.json();
}

export async function updateRoute(id: number, data: any) {
    const response = await fetch(`${API_URL}/api/routes/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to update route');
    }
    return response.json();
}

export async function getRoute(id: number) {
    const response = await fetch(`${API_URL}/api/routes/${id}`);
    if (!response.ok) {
        throw new Error('Failed to fetch route');
    }
    return response.json();
}
