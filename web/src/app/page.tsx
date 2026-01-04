"use client"

import { useState, useEffect } from 'react';
import { RouteVisualizer } from '@/features/routes/components/RouteVisualizer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Truck, Users, Map, ArrowRight, Activity, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getVehicles } from '@/features/vehicles/api/vehicleService';
import { getOrders } from '@/features/orders/api/orderService';

export default function Home() {
    const [stats, setStats] = useState({ vehicles: 0, orders: 0 });

    useEffect(() => {
        Promise.all([getVehicles(), getOrders()]).then(([v, o]) => {
            setStats({ vehicles: v.length, orders: o.length });
        }).catch(console.error);
    }, []);

    return (

        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
                <p className="text-muted-foreground mt-1">Bem-vindo ao RouteGo. Aqui está o resumo da sua operação hoje.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Veículos</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.vehicles}</div>
                        <p className="text-xs text-muted-foreground">Veículos cadastrados na frota</p>
                        <div className="mt-4">
                            <Link href="/vehicles">
                                <Button variant="outline" size="sm" className="w-full gap-2">
                                    Gerenciar <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.orders}</div>
                        <p className="text-xs text-muted-foreground">Entregas registradas no sistema</p>
                        <div className="mt-4">
                            <Link href="/orders">
                                <Button variant="outline" size="sm" className="w-full gap-2">
                                    Gerenciar <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">Online</div>
                        <p className="text-xs text-muted-foreground">Otimizador rodando em background</p>
                        <div className="mt-4">
                            <Link href="/routes">
                                <Button variant="outline" size="sm" className="w-full gap-2">
                                    Ver Rotas <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                    <Card className="h-full border-sidebar-border/50 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                                    <Map className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle>Última Otimização</CardTitle>
                                    <CardDescription>Visualização rápida das rotas mais recentes.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <RouteVisualizer keyTrigger={0} />
                        </CardContent>
                    </Card>
                </div>

                <div className="xl:col-span-1 space-y-6">
                    <Card className="bg-primary/5 border-primary/10">
                        <CardHeader>
                            <CardTitle className="text-primary">Dica Rápida</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-foreground/80">
                                Mantenha os dados de lat/lon dos pedidos atualizados para garantir a melhor eficiência nas rotas. O otimizador recalcula tudo a cada 5 minutos.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
