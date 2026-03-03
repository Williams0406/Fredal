"use client";

import { useState } from "react";
import ItemTable from "@/components/items/ItemTable";
import ItemGroupManager from "@/components/items/ItemGroupManager";

export default function ItemsPage() {
  const [view, setView] = useState("items");
  const [favoriteFilter, setFavoriteFilter] = useState("TODOS");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">
            Inventario de Stock
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de repuestos y consumibles del almacén
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("items")}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              view === "items"
                ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            Tabla de items
          </button>
          <button
            type="button"
            onClick={() => setView("groups")}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              view === "groups"
                ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            Grupos de items
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Visualización:</span>
        <button
          type="button"
          onClick={() => setFavoriteFilter("TODOS")}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            favoriteFilter === "TODOS"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => setFavoriteFilter("SOLO_FAVORITOS")}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            favoriteFilter === "SOLO_FAVORITOS"
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          ★ Solo favoritos
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="px-8 py-6">
        {view === "items" ? <ItemTable favoriteFilter={favoriteFilter} /> : <ItemGroupManager />}
      </div>
    </div>
  );
}