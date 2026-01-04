"use client"

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { RoutePlanner } from '@/features/routes/components/RoutePlanner';
import { getOrders } from '@/features/orders/api/orderService';
import { getVehicles } from '@/features/routes/api/general';
import { updateRoute, getRoute } from '@/features/routes/api/routes';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EditRoutePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    // In Next.js 15+ (or recent 14), params is a promise.
    // If using older version, await params or change type
    // Assuming params is a promise based on recent changes, but let's check page.tsx version 
    // Wait, the user has Next.js 16 installed as per conversation history? "Next.js 16 frontend". 
    // Yes, param is a Promise in Next.js 15+.

    // We need to unwrap params
    const resolvedParams = use(params);
    const id = parseInt(resolvedParams.id);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ orders: any[], vehicles: any[], route: any } | null>(null);

    useEffect(() => {
        Promise.all([getOrders(), getVehicles(), getRoute(id)])
            .then(([orders, vehicles, route]) => {
                setData({ orders, vehicles, route });
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [id]);

    const handleSave = async (solution: any) => {
        try {
            await updateRoute(id, { solution_json: solution });
            router.push('/routes');
        } catch (error) {
            console.error(error);
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
                    <h1 className="text-3xl font-bold tracking-tight">Editar Rota #{id}</h1>
                    <p className="text-muted-foreground">Modifique a rota existente.</p>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <RoutePlanner
                    initialSolution={data.route.solution_json}
                    orders={data.orders}
                    vehicles={data.vehicles}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
}
