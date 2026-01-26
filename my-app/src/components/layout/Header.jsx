"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b px-6 py-4 bg-background">
      
      {/* Contexto de la vista */}
      <div>
        <h2 className="text-lg font-semibold leading-none">
          Sistema de Mantenimiento
        </h2>
        {user && (
          <p className="text-sm text-muted-foreground mt-1">
            Sesión activa como <span className="font-medium">{user.username}</span>
          </p>
        )}
      </div>

      {/* Usuario / acciones */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium">
            {user?.roles?.[0]}
          </p>
          <p className="text-xs text-muted-foreground">
            Rol principal
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
        >
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
