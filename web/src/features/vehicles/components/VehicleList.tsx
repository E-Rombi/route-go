"use client"

import { useEffect, useState } from 'react';
import { Vehicle, getVehicles } from '../api/vehicleService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, Pencil } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VehicleForm } from './VehicleForm';

export function VehicleList({ keyTrigger, onUpdate }: { keyTrigger: number, onUpdate?: () => void }) {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

    const fetchVehicles = () => {
        getVehicles().then(setVehicles).catch(console.error);
    };

    useEffect(() => {
        fetchVehicles();
    }, [keyTrigger]);

    const handleEditSuccess = () => {
        setEditingVehicle(null);
        fetchVehicles();
        if (onUpdate) onUpdate();
    };

    if (vehicles.length === 0) {
        return (
            <div className="text-center p-8 border rounded-lg bg-card text-muted-foreground">
                Nenhum veículo cadastrado.
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {vehicles.map((v) => (
                    <Card key={v.id} className="hover:shadow-md transition-shadow relative group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {v.name}
                            </CardTitle>
                            <Truck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2">
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <span className="font-semibold mr-2">ID:</span> {v.id}
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="font-semibold mr-2">Capacidade:</span>
                                    <Badge variant="secondary">{v.capacity} kg</Badge>
                                </div>
                                {(v.start_lat !== 0 || v.start_lon !== 0) && (
                                    <div className="flex items-start text-xs text-muted-foreground mt-2">
                                        <MapPin className="h-3 w-3 mr-1 mt-0.5" />
                                        <div>
                                            Lat: {v.start_lat.toFixed(6)}<br />
                                            Lon: {v.start_lon.toFixed(6)}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="outline" size="sm" onClick={() => setEditingVehicle(v)}>
                                    <Pencil className="w-3 h-3 mr-2" />
                                    Editar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Sheet open={!!editingVehicle} onOpenChange={(open) => !open && setEditingVehicle(null)}>
                <SheetContent className="p-0 gap-0">
                    <SheetHeader className="px-6 py-6 border-b">
                        <SheetTitle>Editar Veículo</SheetTitle>
                        <SheetDescription>
                            Altere as informações do veículo.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="p-6">
                        {editingVehicle && (
                            <VehicleForm
                                vehicle={editingVehicle}
                                onSuccess={handleEditSuccess}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
