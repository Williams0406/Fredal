"use client";

import ItemTable from "@/components/items/ItemTable";

export default function ItemsPage() {
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
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="px-8 py-6">
        <ItemTable />
      </div>
    </div>
  );
}