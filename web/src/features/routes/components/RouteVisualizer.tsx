"use client"

import { useEffect, useState, useMemo } from 'react';
import { RouteRecord, getRoutes } from '../api/routeService';
import { getOrders, Order } from '@/features/orders/api/orderService';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import dynamic from 'next/dynamic';

const RouteMap = dynamic(() => import('./RouteMap'), {
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-muted animate-pulse rounded-lg flex items-center justify-center text-muted-foreground">Carregando Mapa...</div>
});

export function RouteVisualizer({ keyTrigger }: { keyTrigger: number }) {
    const [latestRoute, setLatestRoute] = useState<RouteRecord | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        // Fetch routes first
        getRoutes().then(async (routes) => {
            if (routes && routes.length > 0) {
                const route = routes[0];
                setLatestRoute(route);

                // Fetch orders for this route
                try {
                    // Try to fetch orders assigned to this route
                    const routeOrders = await getOrders(undefined, route.id);
                    setOrders(routeOrders);
                } catch (err) {
                    console.error("Failed to fetch orders for route", err);
                }
            } else {
                setLatestRoute(null);
                setOrders([]);
            }
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, [keyTrigger]);

    const ordersMap = useMemo(() => {
        const map: Record<number, Order> = {};
        orders.forEach(o => {
            map[o.id] = o;
        });
        return map;
    }, [orders]);

    if (!latestRoute) {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg border-muted h-[200px]">
                    <p className="text-muted-foreground">Carregando...</p>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg border-muted h-[200px]">
                <p className="text-muted-foreground">Nenhuma rota otimizada encontrada ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">Aguarde o processamento...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Mapa da Rota</h3>
                    <p className="text-sm text-muted-foreground">
                        Visualização da última otimização ({new Date(latestRoute.created_at).toLocaleTimeString()})
                    </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${latestRoute.status === 'confirmed'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                    }`}>
                    {latestRoute.status === 'confirmed' ? 'Confirmada' : 'Rascunho'}
                </span>
            </div>

            {/* Map Section */}
            <div className="border rounded-lg shadow-sm overflow-hidden">
                <RouteMap vehicles={latestRoute.solution_json.vehicles} ordersMap={ordersMap} />
            </div>

            {/* List Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {latestRoute.solution_json.vehicles.map((v, idx) => (
                    <div key={idx} className="border p-4 rounded-lg bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                            <div className={`h-3 w-3 rounded-full`} style={{ backgroundColor: ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea'][idx % 5] }} />
                            <h4 className="font-semibold text-sm">Veículo {v.vehicle_db_id}</h4>
                            <span className="ml-auto text-xs text-muted-foreground">{v.route.filter(s => s.order_id).length} paradas</span>
                        </div>

                        {v.route.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic ml-4">Nenhum cliente atribuído.</p>
                        ) : (
                            <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                                {v.route.map((step, sIdx) => {
                                    if (!step.order_id) return null; // Skip depot or invalid
                                    const order = ordersMap[step.order_id];
                                    return (
                                        <div key={sIdx} className="relative text-sm">
                                            <div className="absolute -left-[1.35rem] mt-1.5 h-2 w-2 rounded-full border border-background bg-muted-foreground" />
                                            <div className="font-medium text-foreground">
                                                {order ? order.customer_name : `Cliente ${step.customer_id}`}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex justify-between mt-0.5">
                                                <span>Chegada: {Math.floor(step.min_time / 60)}h{step.min_time % 60}</span>
                                                <span className="font-mono text-[10px] bg-muted px-1 rounded">#{step.order_id}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
