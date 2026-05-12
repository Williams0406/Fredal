"use client";

import { useState } from "react";
import ProveedorForm from "./ProveedorForm";
import { FilterInput, FilterPanel } from "@/components/ui/FilterPanel";
import TableActionButton from "@/components/ui/TableActionButton";

export default function ProveedorTable({ proveedores, onUpdate }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);

  // Filtrado
  const filteredProveedores = proveedores.filter((p) =>
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ruc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.direccion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (proveedor) => {
    setSelectedProveedor(proveedor);
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setSelectedProveedor(null);
  };

  if (proveedores.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No hay proveedores registrados
        </h3>
        <p className="text-sm text-gray-600">
          Comienza agregando tu primer proveedor usando el botón superior
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-gray-200 p-4">
        <FilterPanel
          title="Filtro de proveedores"
          description="Busca por nombre, RUC o dirección."
          hasActiveFilters={Boolean(searchTerm)}
          onClear={() => setSearchTerm("")}
        >
          <FilterInput
            label="Buscar"
            type="text"
            placeholder="Buscar por nombre, RUC o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </FilterPanel>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Proveedor
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                RUC
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Dirección
              </th>
              <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProveedores.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  No se encontraron resultados para "{searchTerm}"
                </td>
              </tr>
            ) : (
              filteredProveedores.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Proveedor */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-[#1e3a8a]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {p.nombre}
                        </p>
                        {p.ruc && (
                          <p className="text-xs text-gray-500">
                            RUC: {p.ruc}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* RUC */}
                  <td className="px-6 py-4">
                    {p.ruc ? (
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-gray-100 px-2.5 py-1 rounded text-gray-700">
                          {p.ruc}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(p.ruc);
                          }}
                          className="text-gray-400 hover:text-[#1e3a8a] transition-colors"
                          title="Copiar RUC"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Sin RUC</span>
                    )}
                  </td>

                  {/* Dirección */}
                  <td className="px-6 py-4">
                    {p.direccion ? (
                      <div className="flex items-start gap-2 max-w-md">
                        <svg
                          className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {p.direccion}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">
                        Sin dirección
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <TableActionButton onClick={() => handleEdit(p)} title="Editar" tone="neutral">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Editar
                      </TableActionButton>

                      <TableActionButton
                        onClick={() => {
                          // Aquí podrías agregar más acciones como ver historial de compras
                          console.log("Ver detalles de", p.nombre);
                        }}
                        title="Ver detalles"
                        tone="primary"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Ver
                      </TableActionButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER CON CONTADOR */}
      {filteredProveedores.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando{" "}
              <span className="font-medium text-gray-900">
                {filteredProveedores.length}
              </span>{" "}
              de{" "}
              <span className="font-medium text-gray-900">
                {proveedores.length}
              </span>{" "}
              proveedores
            </p>

            {/* Indicadores adicionales */}
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>{proveedores.filter(p => p.ruc && p.ruc.length === 11).length} con RUC válido</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>{proveedores.filter(p => p.direccion).length} con dirección</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN */}
      <ProveedorForm
        open={openEdit}
        onClose={handleCloseEdit}
        onCreated={() => {
          onUpdate();
          handleCloseEdit();
        }}
        proveedor={selectedProveedor}
      />
    </>
  );
}
