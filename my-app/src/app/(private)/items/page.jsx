"use client";

import { useState } from "react";
import ItemTable from "@/components/items/ItemTable";
import ItemGroupManager from "@/components/items/ItemGroupManager";

export default function ItemsPage() {
  const [view, setView] = useState("items");

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

      {/* CONTENIDO PRINCIPAL */}
      <div className="px-8 py-6">
        {view === "items" ? <ItemTable /> : <ItemGroupManager />}
      </div>
    </div>
  );
}