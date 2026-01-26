"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // ✅ IMPORT CORRECTO

export default function RoleGuard({ roles = [], children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const userRoles = user.roles || [];

      const hasAccess =
        roles.length === 0 ||
        roles.some((r) => userRoles.includes(r));

      if (!hasAccess) {
        router.replace("/unauthorized");
      }
    }
  }, [user, loading, roles, router]);

  if (loading) return <p>Cargando...</p>;
  if (!user) return null;

  return children;
}
