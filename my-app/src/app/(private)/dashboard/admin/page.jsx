"use client";

import RoleGuard from "@/components/RoleGuard";

export default function AdminDashboard() {
  return (
    <RoleGuard roles={["admin"]}>
      <h1 className="text-2xl font-bold">
        Panel de Administración
      </h1>
    </RoleGuard>
  );
}
