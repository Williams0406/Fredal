"use client";

import Link from "next/link";
import { useMenu } from "@/hooks/useMenu";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const menu = useMenu();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 h-screen bg-gray-900 text-white p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold">ALEJANDRO</h2>
        <p className="text-sm text-gray-400">
          {user?.trabajador?.nombres} {user?.trabajador?.apellidos}
        </p>
        <p className="text-xs text-gray-500">
          {user?.roles.join(", ")}
        </p>
      </div>

      <nav className="space-y-2">
        {menu.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className="block px-3 py-2 rounded hover:bg-gray-700"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        onClick={logout}
        className="mt-6 w-full bg-red-600 hover:bg-red-700 py-2 rounded"
      >
        Cerrar sesión
      </button>
    </aside>
  );
}
