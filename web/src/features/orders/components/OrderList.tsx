"use client"

import { useEffect, useState } from 'react';
import { Order, getOrders } from '../api/orderService';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Package, Clock, Search, RotateCw } from 'lucide-react';

export function OrderList({ keyTrigger }: { keyTrigger: number }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        getOrders('pending')
            .then((data) => setOrders(data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [keyTrigger]);

    const filteredOrders = orders.filter(order =>
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_id.toString().includes(searchTerm)
    );

    return (
        <Card className="w-full shadow-md bg-card/60 backdrop-blur-sm border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-semibold tracking-tight">Lista de Pedidos</CardTitle>
                    <CardDescription>
                        {orders.length} pedidos pendentes aguardando roteirização.
                    </CardDescription>
                </div>
                <div className="relative w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por cliente ou ID..."
                        className="pl-9 h-9 bg-background/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border bg-background/40 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Localização</TableHead>
                                <TableHead>Demanda</TableHead>
                                <TableHead>Janela de Entrega</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <RotateCw className="h-4 w-4 animate-spin" />
                                            Carregando pedidos...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.map((o) => (
                                    <TableRow key={o.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            #{o.customer_id}
                                        </TableCell>
                                        <TableCell className="font-medium text-foreground">
                                            {o.customer_name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-1 rounded w-fit">
                                                <MapPin className="h-3 w-3 text-primary/70" />
                                                {o.lat.toFixed(4)}, {o.lon.toFixed(4)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{o.demand}</span>
                                                <span className="text-xs text-muted-foreground">un.</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                {o.time_windows && o.time_windows.length > 0 ? (
                                                    <span className="font-mono text-xs bg-muted/40 px-2 py-0.5 rounded">
                                                        {o.time_windows[0].start} - {o.time_windows[0].end} min
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20">
                                                Pendente
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        Nenhum pedido encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
