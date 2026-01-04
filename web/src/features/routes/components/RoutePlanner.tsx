"use client"

import { useState, useCallback, useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { OrderCard } from './OrderCard';
import { PlannerColumn } from './PlannerColumn';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
    id: number;
    customer_name: string;
    demand: number;
    lat: number;
    lon: number;
}

interface Vehicle {
    id: number;
    name: string;
    capacity: number;
}

interface RouteItem {
    order_id: number; // changed from customer_id, as solver output puts 'order_id'
}

interface VehicleRoute {
    vehicle_id: number;
    route: RouteItem[];
}

interface Solution {
    vehicles: VehicleRoute[];
}

interface RoutePlannerProps {
    initialSolution?: Solution;
    orders: Order[]; // was customers
    vehicles: Vehicle[];
    onSave: (solution: Solution) => Promise<void>;
}

export function RoutePlanner({ initialSolution, orders, vehicles, onSave }: RoutePlannerProps) {
    const [isSaving, setIsSaving] = useState(false);

    // Initialize state
    // We need a map of container_id -> order_ids
    const [items, setItems] = useState<{ [key: string]: number[] }>(() => {
        const initialState: { [key: string]: number[] } = {
            unassigned: [],
        };

        vehicles.forEach(v => {
            initialState[`vehicle-${v.id}`] = [];
        });

        const assignedOrderIds = new Set<number>();

        if (initialSolution && initialSolution.vehicles) {
            initialSolution.vehicles.forEach(vr => {
                const containerId = `vehicle-${vr.vehicle_id}`;
                if (initialState[containerId]) {
                    initialState[containerId] = vr.route.map(r => r.order_id);
                    vr.route.forEach(r => assignedOrderIds.add(r.order_id));
                }
            });
        }

        // Add unassigned orders
        initialState.unassigned = orders
            .filter(o => !assignedOrderIds.has(o.id))
            .map(o => o.id);

        return initialState;
    });

    const [activeId, setActiveId] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const findContainer = (id: number) => {
        if (id in items) {
            return id;
        }
        return Object.keys(items).find((key) => items[key].includes(id));
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as number);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const overId = over?.id;

        if (overId == null || active.id === overId) {
            return;
        }

        const activeContainer = findContainer(active.id as number);
        const overContainer = findContainer(overId as number) || (overId as string);

        if (
            !activeContainer ||
            !overContainer ||
            activeContainer === overContainer
        ) {
            return;
        }

        setItems((prev) => {
            const activeItems = prev[activeContainer as string];
            const overItems = prev[overContainer as string];
            const activeIndex = activeItems.indexOf(active.id as number);
            const overIndex = overItems.indexOf(overId as number);

            let newIndex;
            if (overId in prev) {
                newIndex = overItems.length + 1;
            } else {
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top >
                    over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            return {
                ...prev,
                [activeContainer as string]: [
                    ...prev[activeContainer as string].filter((item) => item !== active.id),
                ],
                [overContainer as string]: [
                    ...prev[overContainer as string].slice(0, newIndex),
                    items[activeContainer as string][activeIndex],
                    ...prev[overContainer as string].slice(newIndex, prev[overContainer as string].length),
                ],
            };
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const activeContainer = findContainer(active.id as number);
        const overContainer = over ? (findContainer(over.id as number) || over.id) : null;

        if (
            activeContainer &&
            overContainer &&
            activeContainer === overContainer
        ) {
            const activeIndex = items[activeContainer as string].indexOf(active.id as number);
            const overIndex = over ? items[overContainer as string].indexOf(over.id as number) : -1;

            if (activeIndex !== overIndex) {
                setItems((items) => ({
                    ...items,
                    [activeContainer as string]: arrayMove(items[activeContainer as string], activeIndex, overIndex),
                }));
            }
        }

        setActiveId(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const solution: Solution = {
                vehicles: []
            };

            for (const key in items) {
                if (key.startsWith('vehicle-')) {
                    const vehicleId = parseInt(key.replace('vehicle-', ''));
                    const route = items[key].map(orderId => ({
                        order_id: orderId
                    }));
                    if (route.length > 0) {
                        solution.vehicles.push({
                            vehicle_id: vehicleId,
                            route: route
                        });
                    }
                }
            }
            await onSave(solution);
            toast.success("Rota salva com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar rota.");
        } finally {
            setIsSaving(false);
        }
    };

    const orderMap = useMemo(() => {
        return new Map(orders.map(o => [o.id, o]));
    }, [orders]);

    const calculateLoad = (orderIds: number[]) => {
        return orderIds.reduce((sum, id) => sum + (orderMap.get(id)?.demand || 0), 0);
    };

    const activeOrder = activeId ? orderMap.get(activeId) : null;

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {!isSaving && <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex flex-1 gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
                    {/* Unassigned Column */}
                    <div className="w-80 flex-shrink-0">
                        <PlannerColumn
                            id="unassigned"
                            title="Não Atribuídos"
                            orders={items.unassigned.map(id => orderMap.get(id)!).filter(Boolean)}
                        />
                    </div>

                    {/* Vehicle Columns */}
                    {vehicles.map(vehicle => {
                        const vehicleOrders = items[`vehicle-${vehicle.id}`] || [];
                        const load = calculateLoad(vehicleOrders);
                        return (
                            <div key={vehicle.id} className="w-80 flex-shrink-0">
                                <PlannerColumn
                                    id={`vehicle-${vehicle.id}`}
                                    title={vehicle.name}
                                    orders={vehicleOrders.map(id => orderMap.get(id)!).filter(Boolean)}
                                    capacity={vehicle.capacity}
                                    currentLoad={load}
                                />
                            </div>
                        );
                    })}
                </div>

                <DragOverlay>
                    {activeOrder ? <OrderCard order={activeOrder} /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
