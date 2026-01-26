"use client";

import { useAuth } from "@/context/AuthContext";

export default function RoleGate({ roles = [], children }) {
  const { user } = useAuth();

  if (!user) return null;

  const userRoles = user.roles || [];

  const hasAccess =
    roles.length === 0 ||
    roles.some((role) => userRoles.includes(role));

  if (!hasAccess) return null;

  return children;
}
