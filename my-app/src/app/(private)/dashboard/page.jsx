"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const roles = user.roles || [];

      if (roles.includes("admin"))
        router.replace("/dashboard/admin");
      else if (roles.includes("Jefe de Tecnicos"))
        router.replace("/dashboard/mantenimiento");
      else if (roles.includes("Jefe de Almaceneros"))
        router.replace("/dashboard/almacen");
      else if (roles.includes("ManageCompras"))
        router.replace("/dashboard/compras");
      else if (roles.includes("Tecnico"))
        router.replace("/trabajos");
      else if (roles.includes("Almacenero"))
        router.replace("/items");
      else
        router.replace("/unauthorized");
          }
        }, [user, loading, router]);

  return <p>Redireccionando...</p>;
}
