"use client"

import { useState } from 'react';
import { VehicleForm } from '@/features/vehicles/components/VehicleForm';
import { VehicleList } from '@/features/vehicles/components/VehicleList';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export default function VehiclesPage() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const refresh = () => setRefreshKey(prev => prev + 1);

    const handleSuccess = () => {
        refresh();
        setIsSheetOpen(false);
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Veículos</h1>
                    <p className="text-muted-foreground mt-1">Gerencie a frota de entregas.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={refresh} variant="ghost" size="icon">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Novo Veículo
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="p-0 gap-0">
                            <SheetHeader className="px-6 py-6 border-b">
                                <SheetTitle>Adicionar Veículo</SheetTitle>
                                <SheetDescription>
                                    Cadastre um novo veículo na frota.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="p-6">
                                <VehicleForm onSuccess={handleSuccess} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            <VehicleList keyTrigger={refreshKey} />
        </div>
    );
}
