import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RouteRecord, updateRoute, reprocessRoute, triggerOptimization } from '../api/routeService';
import { VehicleRouteCard } from './VehicleRouteCard';
import { Card, CardContent } from "@/components/ui/card"
import { Button } from '@/components/ui/button';
import { RefreshCw, Map as MapIcon, Clock, Package, MoreHorizontal, Edit, CheckCircle } from 'lucide-react';
import { RoutePlanner } from './RoutePlanner';
import { getOrders, Order } from '../../orders/api/orderService';
import { getVehicles, Vehicle } from '../../vehicles/api/vehicleService';
import { toast } from 'sonner';

// Dynamic import for RouteMap to avoid SSR issues with Leaflet
const RouteMap = dynamic(() => import('./RouteMap'), {
    ssr: false,
    loading: () => (
        <div className="h-[500px] w-full bg-muted/50 rounded-xl animate-pulse flex items-center justify-center">
            <MapIcon className="h-10 w-10 text-muted-foreground/30" />
        </div>
    )
});

interface RouteDashboardProps {
    route: RouteRecord | null;
    isLoading: boolean;
    onRefresh: () => void;
    isEditing: boolean;
    onEditingChange: (isEditing: boolean) => void;
}

export function RouteDashboard({ route, isLoading, onRefresh, isEditing, onEditingChange }: RouteDashboardProps) {
    // const [isEditing, setIsEditing] = useState(false);  <-- REPLACED BY PROPS
    const [plannerData, setPlannerData] = useState<{ orders: Order[], vehicles: Vehicle[] } | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [ordersMap, setOrdersMap] = useState<Record<number, Order>>({});
    const [isConfirming, setIsConfirming] = useState(false);
    const [isReprocessing, setIsReprocessing] = useState(false);

    // Fetch orders for the map when route changes
    useEffect(() => {
        if (route) {
            const fetchOrdersForMap = async () => {
                try {
                    const orders = await getOrders(undefined, route.id);
                    const map: Record<number, Order> = {};
                    orders.forEach(o => { map[o.id] = o; });
                    setOrdersMap(map);
                } catch (error) {
                    console.error("Failed to fetch orders for map", error);
                }
            };
            fetchOrdersForMap();
        }
    }, [route?.id]);

    const handleCreateRoute = async () => {
        try {
            await triggerOptimization();
            toast.success("Otimização iniciada para pedidos pendentes!");
            // Give it a moment to start
            setTimeout(onRefresh, 1000);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao iniciar otimização.");
        }
    };

    if (!route) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="bg-muted p-6 rounded-full mb-4 animate-pulse">
                    <MapIcon className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Selecione uma Otimização</h3>
                <p className="text-muted-foreground max-w-sm">
                    Escolha uma rota no histórico ao lado ou inicie uma nova otimização.
                </p>
                <div className="flex gap-3 mt-6">
                    <Button onClick={onRefresh} variant="outline" disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Atualizar Dados
                    </Button>
                    <Button onClick={handleCreateRoute} variant="default" className="bg-primary hover:bg-primary/90" disabled={isLoading}>
                        <Package className="mr-2 h-4 w-4" />
                        Criar Nova Rota
                    </Button>
                </div>
            </div>
        );
    }



    const handleEnterEditMode = async () => {
        setIsLoadingData(true);
        try {
            const [vehicles, pendingOrders, routeOrders] = await Promise.all([
                getVehicles(),
                getOrders('pending'), // Unassigned
                getOrders(undefined, route.id) // Currently in route
            ]);

            // Combine orders, ensuring unique by ID just in case
            const allOrders = [...routeOrders, ...pendingOrders];
            const uniqueOrders = Array.from(new Map(allOrders.map(o => [o.id, o] as [number, Order])).values());

            setPlannerData({ orders: uniqueOrders, vehicles });
            onEditingChange(true);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar dados para edição.");
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSaveRoute = async (solution: any) => {
        // Map RoutePlanner solution back to DB structure
        const dbSolution = {
            vehicles: solution.vehicles.map((v: any) => ({
                vehicle_db_id: v.vehicle_id,
                route: v.route.map((r: any, idx: number) => ({
                    node_index: idx + 1,
                    order_id: r.order_id,
                    customer_id: 0, // Fallback
                    min_time: 0,
                    max_time: 0
                }))
            }))
        };

        try {
            await updateRoute(route.id, { solution_json: dbSolution as any });
            onEditingChange(false);
            onRefresh();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar a rota.");
            throw error;
        }
    };

    const handleConfirmRoute = async () => {
        setIsConfirming(true);
        try {
            await updateRoute(route.id, { status: 'confirmed' });
            toast.success("Rota confirmada!");
            onRefresh();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao confirmar rota.");
        } finally {
            setIsConfirming(false);
        }
    };

    const handleReprocess = async () => {
        setIsReprocessing(true);
        try {
            await reprocessRoute(route.id);
            toast.success("Reprocessamento solicitado! Aguarde e atualize.");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao solicitar reprocessamento.");
        } finally {
            setIsReprocessing(false);
        }
    };



    // Edit Mode View
    if (isEditing && plannerData) {
        return (
            <div className="h-full flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-background">
                    <h2 className="text-xl font-bold">Editando Rota #{route.id}</h2>
                    <Button variant="ghost" onClick={() => onEditingChange(false)}>Cancelar</Button>
                </div>
                <div className="flex-1 overflow-hidden p-4 bg-muted/10">
                    <RoutePlanner
                        initialSolution={{
                            vehicles: route.solution_json.vehicles.map(v => ({
                                vehicle_id: v.vehicle_db_id,
                                route: v.route.map(r => ({ order_id: r.order_id || r.customer_id }))
                            }))
                        }}
                        orders={plannerData.orders}
                        vehicles={plannerData.vehicles}
                        onSave={handleSaveRoute}
                    />
                </div>
            </div>
        );
    }

    const totalVehicles = route.solution_json.vehicles.length;
    const activeVehicles = route.solution_json.vehicles.filter(v => v.route.length > 0).length;
    const totalDeliveries = route.solution_json.vehicles.reduce((acc, v) => acc + v.route.length, 0);

    // Calculate total duration (approximate max time of last stop across all vehicles)
    let maxTime = 0;
    route.solution_json.vehicles.forEach(v => {
        if (v.route.length > 0) {
            const lastStop = v.route[v.route.length - 1];
            if (lastStop.max_time > maxTime) maxTime = lastStop.max_time;
        }
    });

    const isConfirmed = route.status === 'confirmed';

    return (
        <div className="p-6 space-y-8 h-full overflow-y-auto bg-muted/10">
            {/* Header */}
            <header className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold tracking-tight">Detalhes da Otimização #{route.id}</h2>
                        {isConfirmed && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1 border border-green-200"><CheckCircle className="h-3 w-3" /> Confirmada</span>}
                        {!isConfirmed && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium border border-yellow-200">Rascunho</span>}
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        Gerado em {new Date(route.created_at).toLocaleString()}
                    </p>
                </div>

                <div className="flex gap-2">
                    {!isConfirmed && (
                        <Button variant="default" className="bg-green-600 hover:bg-green-700" size="sm" onClick={handleConfirmRoute} disabled={isConfirming || isLoading}>
                            {isConfirming ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-2 h-3.5 w-3.5" />}
                            Confirmar Rota
                        </Button>
                    )}

                    {!isConfirmed && (
                        <Button variant="secondary" size="sm" onClick={handleReprocess} disabled={isReprocessing || isLoading}>
                            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isReprocessing ? 'animate-spin' : ''}`} />
                            Reprocessar
                        </Button>
                    )}

                    <Button variant="outline" size="sm" onClick={handleEnterEditMode} disabled={isLoadingData}>
                        <Edit className={`mr-2 h-3.5 w-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                        Editar
                    </Button>

                    <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Entregas Totais</div>
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            <span className="text-3xl font-bold">{totalDeliveries}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Veículos Ativos</div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold">{activeVehicles}</span>
                            <span className="text-sm text-muted-foreground mb-1">/ {totalVehicles} frota</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tempo Máx. Estimado</div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold">{maxTime}</span>
                            <span className="text-sm text-muted-foreground mb-1">minutos</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Route Map */}
            {Object.keys(ordersMap).length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MapIcon className="h-5 w-5 opacity-70" />
                        Visualização da Rota
                    </h3>
                    <RouteMap
                        vehicles={route.solution_json.vehicles}
                        ordersMap={ordersMap}
                    />
                </div>
            )}

            {/* Vehicle Cards Grid */}
            <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 opacity-70" />
                    Rotas por Veículo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                    {route.solution_json.vehicles.map((v, idx) => (
                        <VehicleRouteCard key={idx} vehicleRoute={v} />
                    ))}
                </div>
            </div>
        </div>
    );
}
