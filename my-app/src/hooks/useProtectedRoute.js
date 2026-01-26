"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ROUTE_PERMISSIONS } from "@/config/routePermissions";

export function useProtectedRoute() {
  const { isAuthenticated, loading, roles } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // 1. No autenticado → login
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    // 2. Buscar permisos de la ruta
    const routeConfig = ROUTE_PERMISSIONS.find(
      (route) => pathname.startsWith(route.path)
    );

    // 3. Si la ruta tiene restricciones y no tiene rol
    if (
      routeConfig &&
      !routeConfig.roles.some((role) => roles.includes(role))
    ) {
      router.replace("/dashboard"); // o /403 si luego lo creas
    }
  }, [loading, isAuthenticated, roles, pathname, router]);

  return { loading, isAuthenticated };
}
