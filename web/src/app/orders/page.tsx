"use client"

import { useState } from 'react';
import { OrderForm } from '@/features/orders/components/OrderForm';
import { OrderList } from '@/features/orders/components/OrderList';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export default function OrdersPage() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const refresh = () => setRefreshKey(prev => prev + 1);

    const handleSuccess = () => {
        refresh();
        setIsSheetOpen(false);
    };

    return (
        <div className="flex flex-col gap-8 p-8 max-w-[1600px] mx-auto min-h-screen bg-transparent">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <ShoppingCart className="h-8 w-8 text-primary" />
                        Pedidos
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Gerencie as demandas de entrega e clientes.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={refresh} variant="outline" size="icon" className="h-10 w-10">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button className="h-10 gap-2 px-6 shadow-md transition-all hover:shadow-lg">
                                <Plus className="h-4 w-4" />
                                Novo Pedido
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-md overflow-y-auto">
                            <SheetHeader className="mb-6">
                                <div className="flex items-center gap-2 text-primary mb-2">
                                    <ShoppingCart className="h-5 w-5" />
                                    <span className="font-semibold tracking-tight">Gestão de Pedidos</span>
                                </div>
                                <SheetTitle className="text-2xl">Adicionar Pedido</SheetTitle>
                                <SheetDescription>
                                    Cadastre um novo pedido para ser incluído nas rotas de entrega.
                                </SheetDescription>
                            </SheetHeader>
                            <OrderForm onSuccess={handleSuccess} />
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            <main className="flex-1 animate-in fade-in-50 duration-500 slide-in-from-bottom-5">
                <OrderList keyTrigger={refreshKey} />
            </main>
        </div>
    );
}
