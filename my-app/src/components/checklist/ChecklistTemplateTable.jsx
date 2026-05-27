"use client";

import { formatDisplayDate } from "@/lib/utils";

function EstadoBadge({ estado, label }) {
  const toneMap = {
    BORRADOR: "border-slate-200 bg-slate-50 text-slate-700",
    ACTIVO: "border-emerald-200 bg-emerald-50 text-emerald-700",
    INACTIVO: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        toneMap[estado] || "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      {label || estado || "-"}
    </span>
  );
}

export default function ChecklistTemplateTable({
  checklists = [],
  loading = false,
  onEditChecklist,
  onEditMetadata,
  onDeleteChecklist,
}) {
  const showAction = typeof onEditChecklist === "function";
  const showManage =
    typeof onEditMetadata === "function" || typeof onDeleteChecklist === "function";

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Plantillas checklist
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Estructuras base para controlar actividades, sistemas y respuestas.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          {checklists.length} plantillas
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/90">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-6 py-4">Motivo</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Actividades</th>
              <th className="px-6 py-4">Creado por</th>
              {showAction ? <th className="px-6 py-4 text-right">Relacion</th> : null}
              {showManage ? <th className="px-6 py-4 text-right">Gestion</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={(showAction ? 1 : 0) + (showManage ? 1 : 0) + 5} className="px-6 py-12 text-center text-sm text-slate-500">
                  Cargando plantillas checklist...
                </td>
              </tr>
            ) : null}

            {!loading && checklists.length === 0 ? (
              <tr>
                <td colSpan={(showAction ? 1 : 0) + (showManage ? 1 : 0) + 5} className="px-6 py-12 text-center text-sm text-slate-500">
                  No hay plantillas checklist registradas.
                </td>
              </tr>
            ) : null}

            {!loading
              ? checklists.map((checklist) => (
                  <tr key={checklist.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      {checklist.motivo || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDisplayDate(checklist.fecha) || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <EstadoBadge
                        estado={checklist.estado}
                        label={checklist.estado_label}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                      {checklist.actividades_count ?? checklist.actividades?.length ?? 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {checklist.creado_por_username || "-"}
                    </td>
                    {showAction ? (
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => onEditChecklist(checklist)}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
                        >
                          Editar
                        </button>
                      </td>
                    ) : null}
                    {showManage ? (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {onEditMetadata ? (
                            <button
                              type="button"
                              onClick={() => onEditMetadata(checklist)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
                            >
                              Datos
                            </button>
                          ) : null}
                          {onDeleteChecklist ? (
                            <button
                              type="button"
                              onClick={() => onDeleteChecklist(checklist)}
                              className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100"
                            >
                              Borrar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
