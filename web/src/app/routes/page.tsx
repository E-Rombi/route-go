"use client"

import { useEffect, useState } from 'react';
import { RouteRecord, getRoutes } from '@/features/routes/api/routeService';
import { RouteHistoryList } from '@/features/routes/components/RouteHistoryList';
import { RouteDashboard } from '@/features/routes/components/RouteDashboard';

export default function RoutesPage() {
    const [routes, setRoutes] = useState<RouteRecord[]>([]);
    const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await getRoutes();
            setRoutes(data);
            // If no route selected yet, or if we want to default to the newest one on refresh
            // But usually we might want to keep selection if it still exists.
            // For simplicity, let's select the first one if nothing is selected.
            if (!selectedRoute && data.length > 0) {
                setSelectedRoute(data[0]);
            } else if (selectedRoute && data.length > 0) {
                // Check if selected route still exists in list, update it to get fresh data
                const found = data.find(r => r.id === selectedRoute.id);
                if (found) {
                    setSelectedRoute(found);
                }
            }
        } catch (error) {
            console.error("Failed to fetch routes", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSelectRoute = (route: RouteRecord) => {
        if (isEditing) return;
        setSelectedRoute(route);
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] max-w-full overflow-hidden bg-background">
            {/* Left Sidebar: History List */}
            <div className="w-[300px] flex-shrink-0 h-full">
                <RouteHistoryList
                    routes={routes}
                    selectedRouteId={selectedRoute?.id ?? null}
                    onSelectRoute={handleSelectRoute}
                    onNewRoute={() => setSelectedRoute(null)}
                    isEditing={isEditing}
                />
            </div>

            {/* Right Main Area: Dashboard */}
            <div className="flex-1 h-full overflow-hidden">
                <RouteDashboard
                    route={selectedRoute}
                    isLoading={isLoading}
                    onRefresh={fetchData}
                    isEditing={isEditing}
                    onEditingChange={setIsEditing}
                />
            </div>
        </div>
    );
}
