"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoutePlanner } from '@/features/routes/components/RoutePlanner';
import { getOrders } from '@/features/orders/api/orderService';
import { getVehicles } from '@/features/routes/api/general';
import { createRoute } from '@/features/routes/api/routes';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewRoutePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ orders: any[], vehicles: any[] } | null>(null);

    useEffect(() => {
        Promise.all([getOrders(), getVehicles()])
            .then(([orders, vehicles]) => {
                setData({ orders, vehicles });
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleSave = async (solution: any) => {
        try {
            await createRoute({ solution_json: solution });
            router.push('/routes');
        } catch (error) {
            console.error(error);
            // Toast is handled in RoutePlanner component, maybe re-throw if needed
            throw error;
        }
    };

    if (loading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!data) {
        return <div>Erro ao carregar dados.</div>;
    }

    return (
        <div className="flex flex-col h-screen p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/routes"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nova Rota</h1>
                    <p className="text-muted-foreground">Planeje manualment sua rota arrastando pedidos para veiculos.</p>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <RoutePlanner
                    orders={data.orders}
                    vehicles={data.vehicles}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
}
