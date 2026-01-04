"use client"

import { useState } from 'react';
import { createOrder } from '../api/orderService';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Hash, MapPin, Package, Clock, Loader2, CheckCircle2 } from 'lucide-react';

export function OrderForm({ onSuccess }: { onSuccess: () => void }) {
    const [customerName, setCustomerName] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [demand, setDemand] = useState('');
    const [twStart, setTwStart] = useState('');
    const [twEnd, setTwEnd] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName || !lat || !lon) return;

        setIsSubmitting(true);
        try {
            await createOrder({
                customer_name: customerName,
                customer_id: parseInt(customerId) || 0,
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                demand: parseInt(demand) || 0,
                service_duration: 10,
                time_windows: [{ start: parseInt(twStart) || 0, end: parseInt(twEnd) || 1440 }]
            });
            // Optional: minimal delay to show success state if needed, or just clear
            setCustomerName('');
            setCustomerId('');
            setLat('');
            setLon('');
            setDemand('');
            setTwStart('');
            setTwEnd('');
            onSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium leading-none">Novo Pedido</h3>
                <p className="text-sm text-muted-foreground mt-1">Preencha os dados do cliente e da entrega.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                        <Label className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            Nome do Cliente
                        </Label>
                        <Input
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Ex: Mercado Central"
                            className="bg-background/50"
                        />
                    </div>
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                        <Label className="flex items-center gap-2">
                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                            ID do Cliente
                        </Label>
                        <Input
                            type="number"
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            placeholder="Ex: 123"
                            className="bg-background/50"
                        />
                    </div>
                </div>

                <div className="border rounded-md p-4 bg-muted/20 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <MapPin className="h-4 w-4" />
                        Localização de Entrega
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Latitude</Label>
                            <Input
                                type="number"
                                step="any"
                                value={lat}
                                onChange={(e) => setLat(e.target.value)}
                                placeholder="-23.5505"
                                className="font-mono text-xs bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Longitude</Label>
                            <Input
                                type="number"
                                step="any"
                                value={lon}
                                onChange={(e) => setLon(e.target.value)}
                                placeholder="-46.6333"
                                className="font-mono text-xs bg-background"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-sm sm:col-span-1">
                        <Label className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            Demanda
                        </Label>
                        <div className="relative">
                            <Input
                                type="number"
                                value={demand}
                                onChange={(e) => setDemand(e.target.value)}
                                placeholder="10"
                                className="pr-8 bg-background/50"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">un</span>
                        </div>
                    </div>

                    <div className="space-y-2 col-span-2 sm:col-span-1">
                        <Label className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            Janela de Entrega (min)
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={twStart}
                                onChange={(e) => setTwStart(e.target.value)}
                                placeholder="Início"
                                className="bg-background/50"
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                                type="number"
                                value={twEnd}
                                onChange={(e) => setTwEnd(e.target.value)}
                                placeholder="Fim"
                                className="bg-background/50"
                            />
                        </div>
                    </div>
                </div>

                <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Criando Pedido...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Criar Pedido
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
