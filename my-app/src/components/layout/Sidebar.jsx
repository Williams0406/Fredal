"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { MENU_ITEMS } from "@/config/menu";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const roles = user.roles || [];

  const menuItems = MENU_ITEMS.filter((item) =>
    item.roles.some((role) => roles.includes(role))
  );

  return (
    <aside className="w-64 min-h-screen border-r bg-background flex flex-col">
      
      {/* Logo / Identidad */}
      <div className="px-6 py-5 border-b">
        <h1 className="text-lg font-bold tracking-tight">
          ALEJANDRO
        </h1>
        <p className="text-xs text-muted-foreground">
          Sistema de Gestión
        </p>
      </div>

      {/* Menú */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {/* Placeholder para íconos futuros */}
              <span className="w-2 h-2 rounded-full bg-current opacity-70" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Usuario */}
      <div className="border-t px-4 py-4">
        <p className="text-sm font-medium">
          {user.username}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {user.roles?.join(", ")}
        </p>
      </div>
    </aside>
  );
}
