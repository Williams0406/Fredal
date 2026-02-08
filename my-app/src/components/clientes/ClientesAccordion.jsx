"use client";

import { useMemo, useState } from "react";

const getClienteKey = (cliente) => cliente?.id ?? cliente?.nombre;
const getUbicacionKey = (ubicacion) =>
  ubicacion?.cliente ?? ubicacion?.cliente_id ?? ubicacion?.clienteId ?? ubicacion?.cliente_nombre;

export default function ClientesAccordion({ clientes, ubicaciones }) {
  const [openCliente, setOpenCliente] = useState(null);

  const ubicacionesByCliente = useMemo(() => {
    return ubicaciones.reduce((acc, ubicacion) => {
      const key = getUbicacionKey(ubicacion);
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(ubicacion);
      return acc;
    }, {});
  }, [ubicaciones]);

  if (!clientes.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
        Aún no hay clientes registrados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {clientes.map((cliente) => {
        const key = getClienteKey(cliente);
        const ubicacionesCliente = ubicacionesByCliente[key] || [];
        const isOpen = openCliente === key;

        return (
          <div key={key} className="rounded-lg border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setOpenCliente(isOpen ? null : key)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
            >
              <div>
                <h3 className="text-base font-semibold text-[#1e3a8a]">{cliente.nombre}</h3>
                <p className="text-sm text-gray-500">RUC: {cliente.ruc || "Sin RUC"}</p>
              </div>
              <span className="flex items-center gap-2 text-sm text-gray-500">
                {ubicacionesCliente.length} ubicaciones
                <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-gray-200 px-4 py-3">
                {ubicacionesCliente.length ? (
                  <ul className="space-y-2">
                    {ubicacionesCliente.map((ubicacion) => (
                      <li
                        key={ubicacion.id ?? `${ubicacion.nombre}-${ubicacion.direccion}`}
                        className="rounded-md border border-gray-100 bg-gray-50 p-3"
                      >
                        <p className="text-sm font-medium text-gray-700">{ubicacion.nombre}</p>
                        <p className="text-xs text-gray-500">{ubicacion.direccion || "Sin dirección"}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Sin ubicaciones registradas.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}