"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

export default function Navbar({ user }) {
  const router = useRouter();
  const role = user?.role;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
      <div className="flex gap-4 items-center">
        <span className="font-bold text-lg">ALEJANDRO</span>

        <Link href="/dashboard">Dashboard</Link>

        {(role === "Administrador" || role === "Jefe de Tecnicos") && (
          <Link href="/trabajos">Trabajos</Link>
        )}

        {role === "Tecnico" && (
          <Link href="/mis-trabajos">Mis trabajos</Link>
        )}

        {(role === "Almacenero" || role === "Jefe de Almaceneros") && (
          <>
            <Link href="/items">Almacén</Link>
            <Link href="/cambios-equipo">Cambios</Link>
          </>
        )}

        {(role === "ManageCompras" || role === "Administrador") && (
          <Link href="/compras">Compras</Link>
        )}

        {role === "Administrador" && (
          <>
            <Link href="/maquinarias">Maquinarias</Link>
            <Link href="/trabajadores">Trabajadores</Link>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user?.trabajador?.nombres} {user?.trabajador?.apellidos}
        </span>

        <button
          onClick={handleLogout}
          className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          Salir
        </button>
      </div>
    </nav>
  );
}
