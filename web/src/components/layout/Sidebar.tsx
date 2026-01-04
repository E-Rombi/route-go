"use client";

import { cn } from "@/lib/utils";
import { LayoutDashboard, Truck, Users, MapPin, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const navItems = [
        {
            title: "Visão Geral",
            href: "/",
            icon: LayoutDashboard,
        },
        {
            title: "Veículos",
            href: "/vehicles",
            icon: Truck,
        },
        {
            title: "Pedidos",
            href: "/orders",
            icon: Users,
        },
        {
            title: "Rotas",
            href: "/routes",
            icon: MapPin,
        },
    ];

    return (
        <div
            className={cn(
                "relative flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
                collapsed ? "w-[80px]" : "w-[280px]",
                className
            )}
        >
            <div className="flex h-16 items-center justify-between px-6 py-4">
                {!collapsed && (
                    <h2 className="text-lg font-bold tracking-tight text-primary">
                        RouteGo
                    </h2>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            <div className="flex-1 space-y-2 px-3 py-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-muted-foreground",
                                collapsed && "justify-center px-2"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "h-5 w-5 shrink-0 transition-colors",
                                    isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-primary"
                                )}
                            />
                            {!collapsed && <span>{item.title}</span>}
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t border-sidebar-border">
                {!collapsed && <div className="text-xs text-muted-foreground text-center">v1.0.0</div>}
            </div>
        </div>
    );
}
