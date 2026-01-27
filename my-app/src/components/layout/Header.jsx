"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    // Implementar lógica de búsqueda
    console.log("Búsqueda:", searchQuery);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      
      {/* Contexto / Título de la vista */}
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-[#1e3a8a] leading-none">
          Sistema de Gestión
        </h2>
        {user && (
          <p className="text-xs text-gray-500 mt-1">
            Sesión activa: <span className="font-medium text-gray-700">{user.username}</span>
          </p>
        )}
      </div>

      {/* Búsqueda */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Buscar maquinaria, trabajos, items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                       transition-all duration-200 placeholder:text-gray-400"
            />
          </div>
        </form>
      </div>

      {/* Usuario y acciones */}
      <div className="flex items-center gap-4">
        
        {/* Notificaciones (placeholder) */}
        <button
          className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                   rounded-lg transition-all duration-200"
          aria-label="Notificaciones"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {/* Badge de notificaciones pendientes */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#84cc16] rounded-full"></span>
        </button>

        {/* Separador */}
        <div className="w-px h-8 bg-gray-200"></div>

        {/* Info de usuario */}
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-gray-900">
            {user?.roles?.[0] || "Usuario"}
          </p>
          <p className="text-xs text-gray-500">
            Rol principal
          </p>
        </div>

        {/* Avatar con iniciales */}
        <div className="w-9 h-9 bg-[#1e3a8a] text-white rounded-lg flex items-center 
                      justify-center text-sm font-semibold">
          {user?.username?.charAt(0).toUpperCase() || "U"}
        </div>

        {/* Botón de cerrar sesión */}
        <button
          onClick={logout}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 
                   border border-gray-300 rounded-lg hover:bg-gray-200 
                   focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-1
                   transition-all duration-200"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}