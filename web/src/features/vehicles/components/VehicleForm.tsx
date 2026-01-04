"use client"

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createVehicle, updateVehicle, Vehicle } from '../api/vehicleService';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { toast } from "sonner"
import { Loader2, Truck, Weight, MapPin, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const vehicleSchema = z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
    capacity: z.coerce.number().min(1, "A capacidade deve ser maior que 0"),
    start_lat: z.coerce.number().min(-90).max(90, "Latitude inválida"),
    start_lon: z.coerce.number().min(-180).max(180, "Longitude inválida"),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

export function VehicleForm({ onSuccess, vehicle }: { onSuccess: () => void, vehicle?: Vehicle }) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<VehicleFormValues>({
        resolver: zodResolver(vehicleSchema) as any,
        defaultValues: {
            name: vehicle?.name || '',
            capacity: vehicle?.capacity || 1000,
            start_lat: vehicle?.start_lat || -23.550520,
            start_lon: vehicle?.start_lon || -46.633308,
        },
    });

    const onSubmit = async (data: VehicleFormValues) => {
        setIsLoading(true);
        try {
            if (vehicle) {
                await updateVehicle(vehicle.id, {
                    name: data.name,
                    capacity: data.capacity,
                    start_lat: data.start_lat,
                    start_lon: data.start_lon
                });
                toast.success("Veículo atualizado com sucesso!");
            } else {
                await createVehicle({
                    name: data.name,
                    capacity: data.capacity,
                    start_lat: data.start_lat,
                    start_lon: data.start_lon
                });
                toast.success("Veículo cadastrado com sucesso!");
            }
            form.reset();
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error(vehicle ? "Erro ao atualizar veículo." : "Erro ao cadastrar veículo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-muted-foreground" />
                                    Identificação do Veículo
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Van 01 - Placa ABC-1234" {...field} className="h-10" />
                                </FormControl>
                                <FormDescription>Nome ou placa para identificar o veículo.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="capacity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <Weight className="w-4 h-4 text-muted-foreground" />
                                    Capacidade de Carga (kg)
                                </FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Ex: 1000" {...field} className="h-10" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Separator />

                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        Localização de Partida
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="start_lat"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground">Latitude</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="any" {...field} className="h-9" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="start_lon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground">Longitude</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="any" {...field} className="h-9" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Button type="submit" className="w-full h-11 text-base mt-6" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {vehicle ? "Atualizando..." : "Cadastrando..."}
                        </>
                    ) : (
                        <>
                            {vehicle ? (
                                <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>
                            ) : (
                                "Confirmar Cadastro"
                            )}
                        </>
                    )}
                </Button>
            </form>
        </Form>
    );
}
