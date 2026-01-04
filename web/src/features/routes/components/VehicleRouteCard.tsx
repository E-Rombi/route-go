import { VehicleRoute } from '../api/routeService';
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Truck, Clock, MapPin, Users } from 'lucide-react';

interface VehicleRouteCardProps {
    vehicleRoute: VehicleRoute;
}

export function VehicleRouteCard({ vehicleRoute }: VehicleRouteCardProps) {
    const customerCount = vehicleRoute.route.length;

    return (
        <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300">
            <div className="bg-primary/5 p-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Truck className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-base">Veículo #{vehicleRoute.vehicle_db_id}</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                {customerCount === 0 ? 'Disponível' : 'Em Rota'}
                            </p>
                        </div>
                    </div>

                    {customerCount > 0 && (
                        <div className="flex gap-2">
                            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                                <Users className="h-3 w-3 mr-1" />
                                {customerCount} Entregas
                            </Badge>
                        </div>
                    )}
                </div>
            </div>

            <CardContent className="p-0">
                {customerCount === 0 ? (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <Truck className="h-6 w-6 opacity-30" />
                        </div>
                        <p className="text-sm">Este veículo não foi alocado para nenhuma rota.</p>
                    </div>
                ) : (
                    <div className="relative p-6">
                        {/* Vertical line connecting stops */}
                        <div className="absolute left-[2.45rem] top-8 bottom-8 w-px bg-border group-hover:bg-primary/20 transition-colors" />

                        <div className="space-y-6 relative">
                            {/* Start Point (Simulated) */}
                            <div className="flex gap-4 items-start relative">
                                <div className="z-10 mt-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                                <div className="flex-1 pt-0.5">
                                    <h4 className="text-sm font-medium leading-none mb-1">Início da Rota</h4>
                                    <p className="text-xs text-muted-foreground">Depósito / Garagem</p>
                                </div>
                            </div>

                            {/* Stops */}
                            {vehicleRoute.route.map((step, idx) => (
                                <div key={idx} className="flex gap-4 items-start relative group">
                                    <div className=" z-10 mt-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-primary bg-background group-hover:scale-125 transition-transform duration-200" />

                                    <div className="flex-1 bg-muted/40 p-3 rounded-lg -mt-2 group-hover:bg-muted/70 transition-colors">
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="font-medium text-sm text-foreground">
                                                Cliente #{step.customer_id}
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                                                STOP {idx + 1}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span className="font-mono">
                                                    {step.min_time}-{step.max_time}
                                                </span>
                                            </div>
                                            {/* Currently we don't have location names, just IDs */}
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span>Local {step.node_index}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* End Point */}
                            <div className="flex gap-4 items-start relative">
                                <div className="z-10 mt-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                                <div className="flex-1 pt-0.5">
                                    <h4 className="text-sm font-medium leading-none mb-1">Fim da Rota</h4>
                                    <p className="text-xs text-muted-foreground">Retorno ao Depósito</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
