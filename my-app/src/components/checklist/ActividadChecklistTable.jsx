"use client";

export default function ActividadChecklistTable({
  actividades = [],
  loading = false,
  onCreate,
  onEdit,
  onDelete,
}) {
  const showAction =
    typeof onEdit === "function" || typeof onDelete === "function";

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Actividades checklist
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Catalogo base reusable para los bloques de control.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {actividades.length} registros
          </span>
          {onCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-2xl bg-[#173569] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#0f2346]"
            >
              Nueva
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/90">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-6 py-4">Descripcion</th>
              <th className="px-6 py-4">Respuesta</th>
              <th className="px-6 py-4">Item</th>
              <th className="px-6 py-4">Controles</th>
              <th className="px-6 py-4">Estado</th>
              {showAction ? <th className="px-6 py-4 text-right">Accion</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={showAction ? 6 : 5} className="px-6 py-12 text-center text-sm text-slate-500">
                  Cargando actividades checklist...
                </td>
              </tr>
            ) : null}

            {!loading && actividades.length === 0 ? (
              <tr>
                <td colSpan={showAction ? 6 : 5} className="px-6 py-12 text-center text-sm text-slate-500">
                  No hay actividades checklist registradas.
                </td>
              </tr>
            ) : null}

            {!loading
              ? actividades.map((actividad) => (
                  <tr key={actividad.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      {actividad.descripcion || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {actividad.tipo_respuesta_label || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {actividad.item_codigo
                        ? `${actividad.item_codigo} - ${actividad.item_nombre || ""}`.trim()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {[
                        actividad.obligatorio ? "Obligatoria" : "Opcional",
                        actividad.requiere_observacion ? "Obs." : null,
                        actividad.requiere_evidencia ? "Evidencia" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                          actividad.activo
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600",
                        ].join(" ")}
                      >
                        {actividad.activo ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    {showAction ? (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(actividad)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
                            >
                              Editar
                            </button>
                          ) : null}
                          {onDelete ? (
                            <button
                              type="button"
                              onClick={() => onDelete(actividad)}
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
