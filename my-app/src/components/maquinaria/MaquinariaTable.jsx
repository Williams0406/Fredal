"use client";

import { useState } from "react";
import MaquinariaHistorial from "./MaquinariaHistorial";
import MaquinariaResumen from "./MaquinariaResumen";
import MaquinariaFormModal from "./MaquinariaFormModal";

export default function MaquinariaTable({ maquinarias, onUpdate }) {
  const [selectedId, setSelectedId] = useState(null);
  const [selectedMaquinaria, setSelectedMaquinaria] = useState(null);
  const [openHistorial, setOpenHistorial] = useState(false);
  const [openResumen, setOpenResumen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrado
  const filteredMaquinarias = maquinarias.filter((m) =>
    m.codigo_maquina?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (maquinaria) => {
    setSelectedMaquinaria(maquinaria);
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setSelectedMaquinaria(null);
  };

  if (maquinarias.length === 0) {
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
          No hay maquinarias registradas
        </h3>
        <p className="text-sm text-gray-600">
          Comienza agregando tu primera maquinaria usando el botón superior
        </p>
      </div>
    );
  }

  return (
    <>
      {/* BÚSQUEDA */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
            placeholder="Buscar por código o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
          />
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Código
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Centro de Costos
              </th>
              <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMaquinarias.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  No se encontraron resultados para "{searchTerm}"
                </td>
              </tr>
            ) : (
              filteredMaquinarias.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Código */}
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
                      <span className="font-medium text-gray-900">
                        {m.codigo_maquina}
                      </span>
                    </div>
                  </td>

                  {/* Nombre */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{m.nombre}</div>
                  </td>

                  {/* Centro de Costos */}
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-900">
                        S/
                      </span>
                      <span className="text-sm font-semibold text-[#84cc16]">
                        {Number(m.centro_costos).toLocaleString("es-PE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Editar"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Editar
                      </button>

                      <button
                        onClick={() => {
                          setSelectedId(m.id);
                          setOpenResumen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#1e3a8a] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Resumen"
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
                            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Resumen
                      </button>

                      <button
                        onClick={() => {
                          setSelectedId(m.id);
                          setOpenHistorial(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                        title="Historial"
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
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Historial
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER CON CONTADOR */}
      {filteredMaquinarias.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Mostrando{" "}
            <span className="font-medium text-gray-900">
              {filteredMaquinarias.length}
            </span>{" "}
            de{" "}
            <span className="font-medium text-gray-900">
              {maquinarias.length}
            </span>{" "}
            maquinarias
          </p>
        </div>
      )}

      {/* MODALES */}
      <MaquinariaHistorial
        maquinariaId={selectedId}
        open={openHistorial}
        onClose={() => setOpenHistorial(false)}
      />

      <MaquinariaResumen
        maquinariaId={selectedId}
        open={openResumen}
        onClose={() => setOpenResumen(false)}
      />

      <MaquinariaFormModal
        open={openEdit}
        onClose={handleCloseEdit}
        onSaved={() => {
          onUpdate();
          handleCloseEdit();
        }}
        maquinaria={selectedMaquinaria}
      />
    </>
  );
}