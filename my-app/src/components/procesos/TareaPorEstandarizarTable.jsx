"use client";

import TableActionButton from "@/components/ui/TableActionButton";

function getCriticidadBadgeClass(criticidad) {
  if (criticidad === "ALTO") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (criticidad === "BAJO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function TareaPorEstandarizarTable({
  tareas = [],
  loading = false,
  onOpenDocumento,
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Tareas por estandarizar
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Vista consolidada de codigos, areas, criticidad y relacion con items.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          {tareas.length} registros
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/90">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-6 py-4">Codigo</th>
              <th className="px-6 py-4">Nombre de la tarea</th>
              <th className="px-6 py-4">Area</th>
              <th className="px-6 py-4">Criticidad</th>
              <th className="px-6 py-4">Desarrollado</th>
              <th className="px-6 py-4">Item</th>
              <th className="px-6 py-4">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                  Cargando tareas por estandarizar...
                </td>
              </tr>
            ) : null}

            {!loading && tareas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                  No hay tareas por estandarizar registradas.
                </td>
              </tr>
            ) : null}

            {!loading
              ? tareas.map((tarea) => {
                  const actionLabel = tarea.desarrollado ? "Revisar" : "Realizar";

                  return (
                    <tr key={tarea.id} className="align-top transition hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{tarea.codigo}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-[260px] text-sm font-medium text-slate-800">
                          {tarea.nombre_tarea}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{tarea.area}</td>
                      <td className="px-6 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                            getCriticidadBadgeClass(tarea.nivel_criticidad),
                          ].join(" ")}
                        >
                          {tarea.nivel_criticidad_label || tarea.nivel_criticidad}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex min-w-[120px] items-center">
                          <span
                            className={[
                              "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                              tarea.desarrollado
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-100 text-slate-600",
                            ].join(" ")}
                          >
                            {tarea.desarrollado ? "Si" : "No"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {tarea.item ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {tarea.item_codigo || "Item"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {tarea.item_nombre || "Sin nombre"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Sin item asociado</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <TableActionButton
                          onClick={() => onOpenDocumento?.(tarea)}
                          tone={tarea.desarrollado ? "primary" : "success"}
                        >
                          {actionLabel}
                        </TableActionButton>
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
