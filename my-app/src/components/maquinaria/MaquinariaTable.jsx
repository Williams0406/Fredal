"use client";

import { useState } from "react";
import { ClipboardList, FileText, History, Pencil, Tractor } from "lucide-react";
import MaquinariaHistorial from "./MaquinariaHistorial";
import MaquinariaObservaciones from "./MaquinariaObservaciones";
import MaquinariaResumen from "./MaquinariaResumen";
import MaquinariaFormModal from "./MaquinariaFormModal";
import { FilterInput, FilterPanel } from "@/components/ui/FilterPanel";
import TableActionButton from "@/components/ui/TableActionButton";

export default function MaquinariaTable({
  maquinarias,
  onUpdate,
  canManage = false,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [selectedMaquinaria, setSelectedMaquinaria] = useState(null);
  const [openHistorial, setOpenHistorial] = useState(false);
  const [openObservaciones, setOpenObservaciones] = useState(false);
  const [openResumen, setOpenResumen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  const hasHorometro = (value) =>
    value !== null && value !== undefined && value !== "";

  if (maquinarias.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg
          className="mx-auto mb-4 h-16 w-16 text-gray-300"
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
        <h3 className="mb-1 text-lg font-medium text-gray-900">
          No hay maquinarias registradas
        </h3>
        <p className="text-sm text-gray-600">
          {canManage
            ? "Comienza agregando tu primera maquinaria usando el boton superior"
            : "Cuando existan maquinarias registradas apareceran aqui para consulta."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-gray-200 p-4">
        <FilterPanel
          title="Filtro de maquinaria"
          description="Busca por codigo o nombre de equipo."
          hasActiveFilters={Boolean(searchTerm)}
          onClear={() => setSearchTerm("")}
        >
          <FilterInput
            label="Buscar"
            type="text"
            placeholder="Buscar por codigo o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </FilterPanel>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Codigo
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Nombre
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Horometro
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                Centro de Costos
              </th>
              <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredMaquinarias.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                  No se encontraron resultados para "{searchTerm}"
                </td>
              </tr>
            ) : (
              filteredMaquinarias.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                        <Tractor className="h-5 w-5 text-[#1e3a8a]" />
                      </div>
                      <span className="font-medium text-gray-900">
                        {m.codigo_maquina}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{m.nombre}</div>
                  </td>

                  <td className="px-6 py-4">
                    {hasHorometro(m.horometro_actual) ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex w-fit items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800">
                            {Number(m.horometro_actual).toLocaleString("es-PE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              m.horometro_fuente === "MANUAL"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-blue-50 text-[#1e3a8a]"
                            }`}
                          >
                            {m.horometro_fuente === "MANUAL" ? "Manual" : "OT"}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {m.fecha_ultimo_horometro
                            ? m.horometro_fuente === "MANUAL"
                              ? `Ultima actualizacion manual: ${new Date(`${m.fecha_ultimo_horometro}T00:00:00`).toLocaleDateString("es-PE")}`
                              : `Ultima OT: ${new Date(`${m.fecha_ultimo_horometro}T00:00:00`).toLocaleDateString("es-PE")}`
                            : "Sin fecha"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm italic text-gray-400">Sin registro</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5">
                      <span className="text-sm font-medium text-gray-900">S/</span>
                      <span className="text-sm font-semibold text-[#84cc16]">
                        {Number(m.centro_costos).toLocaleString("es-PE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {canManage ? (
                        <TableActionButton onClick={() => handleEdit(m)} title="Editar" tone="neutral">
                          <Pencil className="h-4 w-4" />
                          Editar
                        </TableActionButton>
                      ) : null}

                      <TableActionButton
                        onClick={() => {
                          setSelectedId(m.id);
                          setOpenResumen(true);
                        }}
                        title="Resumen"
                        tone="primary"
                      >
                        <ClipboardList className="h-4 w-4" />
                        Resumen
                      </TableActionButton>

                      <TableActionButton
                        onClick={() => {
                          setSelectedId(m.id);
                          setOpenHistorial(true);
                        }}
                        title="Historial"
                        tone="purple"
                      >
                        <History className="h-4 w-4" />
                        Historial
                      </TableActionButton>

                      <TableActionButton
                        onClick={() => {
                          setSelectedId(m.id);
                          setOpenObservaciones(true);
                        }}
                        title="Observaciones"
                        tone="warning"
                      >
                        <FileText className="h-4 w-4" />
                        Observaciones
                      </TableActionButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredMaquinarias.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
          <p className="text-sm text-gray-600">
            Mostrando <span className="font-medium text-gray-900">{filteredMaquinarias.length}</span> de{" "}
            <span className="font-medium text-gray-900">{maquinarias.length}</span> maquinarias
          </p>
        </div>
      )}

      <MaquinariaHistorial
        maquinariaId={selectedId}
        open={openHistorial}
        onClose={() => setOpenHistorial(false)}
      />

      <MaquinariaObservaciones
        maquinariaId={selectedId}
        open={openObservaciones}
        onClose={() => setOpenObservaciones(false)}
      />

      <MaquinariaResumen
        maquinariaId={selectedId}
        open={openResumen}
        onClose={() => setOpenResumen(false)}
      />

      {canManage ? (
        <MaquinariaFormModal
          open={openEdit}
          onClose={handleCloseEdit}
          onSaved={() => {
            onUpdate();
            handleCloseEdit();
          }}
          maquinaria={selectedMaquinaria}
        />
      ) : null}
    </>
  );
}
