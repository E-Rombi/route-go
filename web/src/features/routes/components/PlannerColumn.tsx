import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { OrderCard } from "./OrderCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Order {
    id: number;
    customer_name: string;
    demand: number;
}

interface PlannerColumnProps {
    id: string;
    title: string;
    orders: Order[]; // was customers
    capacity?: number;
    currentLoad?: number;
}

export function PlannerColumn({ id, title, orders, capacity, currentLoad }: PlannerColumnProps) {
    const { setNodeRef } = useDroppable({ id });

    const isOverLimit = capacity !== undefined && currentLoad !== undefined && currentLoad > capacity;

    return (
        <Card className="h-full flex flex-col bg-muted/50 border-2 border-transparent data-[over-limit=true]:border-destructive" data-over-limit={isOverLimit}>
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium flex justify-between items-center">
                    <span>{title}</span>
                    {capacity !== undefined && (
                        <span className={cn("text-xs", isOverLimit ? "text-destructive font-bold" : "text-muted-foreground")}>
                            {currentLoad} / {capacity} kg
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex-1 min-h-0">
                <ScrollArea className="h-full pr-3">
                    <div ref={setNodeRef} className="space-y-2 min-h-[100px]">
                        <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                            {orders.map((order) => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </SortableContext>
                        {orders.length === 0 && (
                            <div className="h-[100px] border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center text-muted-foreground text-xs">
                                Arraste aqui
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
