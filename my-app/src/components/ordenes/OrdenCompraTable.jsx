"use client";

const NEXT_STATE = {
  PENDIENTE: "REVISADO",
  REVISADO: "EN_PROCESO",
  EN_PROCESO: "RECIBIDO",
};

const STATUS_LABELS = {
  PENDIENTE: "Pendiente",
  REVISADO: "Revisado",
  EN_PROCESO: "En proceso",
  RECIBIDO: "Recibido",
};

const STATUS_STYLES = {
  PENDIENTE: "bg-gray-100 text-gray-700",
  REVISADO: "bg-amber-100 text-amber-800",
  EN_PROCESO: "bg-blue-100 text-[#1e3a8a]",
  RECIBIDO: "bg-green-100 text-green-700",
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-PE");
}

export default function OrdenCompraTable({
  ordenes = [],
  loading = false,
  mode = "almacen",
  onAdvanceState,
  onConfirmReceipt,
  emptyMessage = "No hay órdenes de compra registradas.",
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
        Cargando órdenes de compra...
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
      {ordenes.map((orden) => {
        const nextState = NEXT_STATE[orden.estado];
        const canAdvance = mode === "compras" && orden.puede_cambiar_estado && nextState;
        const canConfirm = mode === "almacen" && orden.puede_confirmar_recepcion;

        return (
          <div key={orden.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-[#1e3a8a]">{orden.codigo}</h3>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[orden.estado] || STATUS_STYLES.PENDIENTE}`}>
                    {STATUS_LABELS[orden.estado] || orden.estado}
                  </span>
                  {orden.pendiente_confirmacion_almacen && (
                    <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-lime-100 text-lime-700">
                      Pendiente de confirmar en almacén
                    </span>
                  )}
                  {orden.recepcion_confirmada && (
                    <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-green-100 text-green-700">
                      Recepción confirmada
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>Emitida por: {orden.emitido_por_nombre || "Sistema"}</span>
                  <span>Fecha: {formatDate(orden.created_at)}</span>
                  <span>Items: {orden.items?.length || 0}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canAdvance && (
                  <button
                    type="button"
                    onClick={() => onAdvanceState?.(orden, nextState)}
                    className="px-4 py-2.5 rounded-lg bg-[#1e3a8a] text-white text-sm font-medium hover:bg-[#17315f]"
                  >
                    Pasar a {STATUS_LABELS[nextState]}
                  </button>
                )}

                {canConfirm && (
                  <button
                    type="button"
                    onClick={() => onConfirmReceipt?.(orden)}
                    className="px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                  >
                    Confirmar recepción
                  </button>
                )}
              </div>
            </div>

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
        );
      })}
    </div>
  );
}
