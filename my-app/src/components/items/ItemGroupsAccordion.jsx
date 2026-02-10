"use client";

import { useState } from "react";

export default function ItemGroupsAccordion({ groups, onDelete }) {
  const [openGroup, setOpenGroup] = useState(null);

  if (!groups.length) {
    return <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">Aún no hay grupos creados.</div>;
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isOpen = openGroup === group.id;
        return (
          <div key={group.id} className="rounded-lg border border-gray-200 bg-white">
            <button type="button" onClick={() => setOpenGroup(isOpen ? null : group.id)} className="w-full flex items-center justify-between px-4 py-3 text-left">
              <div>
                <h3 className="text-base font-semibold text-[#1e3a8a]">{group.nombre}</h3>
                <p className="text-sm text-gray-500">{group.items?.length || 0} items en el grupo</p>
              </div>
              <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
            </button>

            {isOpen && (
              <div className="border-t border-gray-200 px-4 py-3 space-y-3">
                <ul className="space-y-2">
                  {group.items?.map((item) => (
                    <li key={`${group.id}-${item.id}`} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-700">{item.item_codigo} - {item.item_nombre}</p>
                      <p className="text-xs text-gray-500 mt-1">Tipo: {item.item_tipo_insumo} · Cantidad: {Number(item.cantidad).toLocaleString("en-US", { maximumFractionDigits: 2 })} {item.unidad_simbolo || item.unidad_nombre || "UNID"}</p>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end">
                  <button type="button" onClick={() => onDelete?.(group.id)} className="text-sm text-red-600 hover:text-red-700">Eliminar grupo</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}