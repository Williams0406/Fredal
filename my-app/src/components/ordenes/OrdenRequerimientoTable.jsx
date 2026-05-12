"use client";

const STATUS_LABELS = {
  POR_REVISAR: "Por revisar",
  ENTREGADO: "Entregado",
  SIN_STOCK: "Sin stock",
};

const STATUS_STYLES = {
  POR_REVISAR: "bg-amber-100 text-amber-800",
  ENTREGADO: "bg-green-100 text-green-700",
  SIN_STOCK: "bg-red-100 text-red-700",
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-PE");
}

export default function OrdenRequerimientoTable({
  ordenes = [],
  loading = false,
  tecnicos = [],
  onAssignTecnico,
  onMarkSinStock,
  onDeliver,
  onConfirmarTecnico,
  emptyMessage = "No hay órdenes de requerimiento registradas.",
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
        Cargando órdenes de requerimiento...
      </div>
    );
  }

  if (!ordenes.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm font-medium text-gray-800">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ordenes.map((orden) => (
        <div key={orden.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-[#1e3a8a]">{orden.codigo}</h3>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[orden.estado] || STATUS_STYLES.POR_REVISAR}`}>
                  {STATUS_LABELS[orden.estado] || orden.estado}
                </span>
                {orden.pendiente_confirmacion_tecnico && (
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-[#1e3a8a]">
                    Pendiente de validación del técnico
                  </span>
                )}
                {orden.recepcion_confirmada_tecnico && (
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-green-100 text-green-700">
                    Validado por técnico
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                <span>Trabajo: {orden.trabajo_codigo}</span>
                <span>Técnico: {orden.tecnico_asignado_nombre || "Sin asignar"}</span>
                <span>Fecha: {formatDate(orden.created_at)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {orden.puede_cambiar_estado && orden.estado !== "ENTREGADO" && (
                <>
                  <button
                    type="button"
                    onClick={() => onMarkSinStock?.(orden)}
                    className="px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100"
                  >
                    Marcar sin stock
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeliver?.(orden)}
                    className="px-4 py-2.5 rounded-lg bg-[#1e3a8a] text-white text-sm font-medium hover:bg-[#17315f]"
                  >
                    Marcar entregado
                  </button>
                </>
              )}

              {orden.puede_confirmar_tecnico && (
                <button
                  type="button"
                  onClick={() => onConfirmarTecnico?.(orden)}
                  className="px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                >
                  Confirmar recepción
                </button>
              )}
            </div>
          </div>

          {orden.puede_asignar_tecnico && orden.estado !== "ENTREGADO" && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3">
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Asignar técnico
              </label>
              <select
                value={orden.tecnico_asignado || ""}
                onChange={(event) => onAssignTecnico?.(orden, event.target.value)}
                className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white"
              >
                <option value="">Selecciona un técnico</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nombres} {tecnico.apellidos}
                  </option>
                ))}
              </select>
            </div>
          )}

          {orden.observaciones && (
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
              {orden.observaciones}
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Cantidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Proveedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(orden.items || []).map((itemRow) => (
                  <tr key={itemRow.id}>
                    <td className="px-4 py-3 font-mono text-gray-800">{itemRow.item_codigo}</td>
                    <td className="px-4 py-3 text-gray-700">{itemRow.item_nombre}</td>
                    <td className="px-4 py-3 text-gray-700">{Number(itemRow.cantidad).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{itemRow.proveedor_nombre || "Sin proveedor"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
