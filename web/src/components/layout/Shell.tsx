import { Sidebar } from "./Sidebar";

interface ShellProps {
    children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
    return (
        <div className="flex min-h-screen w-full bg-background">
            <Sidebar className="hidden border-r lg:flex md:flex h-screen sticky top-0" />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
