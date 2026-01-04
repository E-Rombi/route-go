import { RouteRecord } from '../api/routeService';
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Clock, Truck, Calendar } from 'lucide-react';

interface RouteHistoryListProps {
    routes: RouteRecord[];
    selectedRouteId: number | null;
    onSelectRoute: (route: RouteRecord) => void;
    onNewRoute: () => void;
    isEditing: boolean;
}

export function RouteHistoryList({ routes, selectedRouteId, onSelectRoute, onNewRoute, isEditing }: RouteHistoryListProps) {
    if (routes.length === 0) {
        return (
            <div className="text-center p-4 text-muted-foreground text-sm">
                Nenhum histórico encontrado.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full border-r bg-card/50">
            <div className="p-4 border-b flex justify-between items-center bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                <div>
                    <h2 className="font-semibold text-lg tracking-tight">Histórico</h2>
                    <p className="text-xs text-muted-foreground">Últimas otimizações</p>
                </div>
                <button
                    onClick={onNewRoute}
                    disabled={isEditing}
                    className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-primary hover:text-primary-foreground",
                        isEditing ? "opacity-30 cursor-not-allowed" : "bg-primary/10 text-primary border border-primary/20",
                        !selectedRouteId ? "bg-primary text-primary-foreground" : ""
                    )}
                    title="Nova Otimização"
                >
                    <span className="text-lg font-light leading-none mb-0.5">+</span>
                </button>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                    {routes.map((route) => {
                        const date = new Date(route.created_at);
                        const isSelected = selectedRouteId === route.id;
                        const vehicleCount = route.solution_json.vehicles.length;
                        const customerCount = route.solution_json.vehicles.reduce((acc, v) => acc + v.route.length, 0);

                        return (
                            <button
                                key={route.id}
                                onClick={() => onSelectRoute(route)}
                                disabled={isEditing}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg border transition-all duration-200 hover:shadow-md",
                                    isEditing ? "opacity-50 cursor-not-allowed grayscale" : "",
                                    isSelected
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-background hover:bg-muted/50 border-transparent hover:border-border"
                                )}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-1.5 font-medium text-sm">
                                        <Calendar className="h-3.5 w-3.5 opacity-70" />
                                        <span>{date.toLocaleDateString()}</span>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.5 rounded-full border",
                                        isSelected
                                            ? "bg-primary-foreground/20 border-primary-foreground/30"
                                            : "bg-secondary text-secondary-foreground border-border"
                                    )}>
                                        #{route.id}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 text-xs opacity-90">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Truck className="h-3 w-3" />
                                        {vehicleCount} veíc.
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
