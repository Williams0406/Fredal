"use client";

/**
 * ⚠️ COMPONENTE DEPRECADO
 * 
 * Este componente ha sido reemplazado por la combinación de:
 * - Sidebar.jsx (navegación lateral fija en azul marino)
 * - Header.jsx (barra superior con búsqueda y usuario)
 * 
 * Siguiendo la guía de diseño Fredal:
 * - Sidebar izquierda fija (azul marino - 60%)
 * - Header superior con búsqueda, notificaciones y usuario
 * - Layout enterprise / dashboard-first design
 * 
 * Este archivo se mantiene solo como referencia de la lógica anterior.
 * Para usar el nuevo diseño, asegúrate de:
 * 
 * 1. Importar ambos componentes en tu layout:
 *    import Sidebar from "@/components/Sidebar";
 *    import Header from "@/components/Header";
 * 
 * 2. Estructura del layout:
 *    <div className="flex">
 *      <Sidebar />
 *      <div className="flex-1">
 *        <Header />
 *        <main className="p-6">
 *          {children}
 *        </main>
 *      </div>
 *    </div>
 */

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

  console.warn(
    "⚠️ Navbar.jsx está deprecado. Usa Sidebar.jsx + Header.jsx según guía Fredal"
  );

  return (
    <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
      <div className="flex gap-4 items-center">
        <span className="font-bold text-lg">FREDAL</span>

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