"use client";

export default function SistemaTable({
  sistemas = [],
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
          <h2 className="text-lg font-semibold text-slate-900">Sistemas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Frentes tecnicos disponibles para vincular a cada actividad.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {sistemas.length} registros
          </span>
          {onCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-2xl bg-[#173569] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#0f2346]"
            >
              Nuevo
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/90">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Descripcion</th>
              {showAction ? <th className="px-6 py-4 text-right">Accion</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={showAction ? 3 : 2} className="px-6 py-12 text-center text-sm text-slate-500">
                  Cargando sistemas...
                </td>
              </tr>
            ) : null}

            {!loading && sistemas.length === 0 ? (
              <tr>
                <td colSpan={showAction ? 3 : 2} className="px-6 py-12 text-center text-sm text-slate-500">
                  No hay sistemas registrados.
                </td>
              </tr>
            ) : null}

            {!loading
              ? sistemas.map((sistema) => (
                  <tr key={sistema.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      {sistema.nombre || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {sistema.descripcion || "-"}
                    </td>
                    {showAction ? (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(sistema)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
                            >
                              Editar
                            </button>
                          ) : null}
                          {onDelete ? (
                            <button
                              type="button"
                              onClick={() => onDelete(sistema)}
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
