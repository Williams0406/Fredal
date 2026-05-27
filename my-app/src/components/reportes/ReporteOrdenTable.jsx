"use client";

import { formatDisplayDate } from "@/lib/utils";
import TableActionButton from "@/components/ui/TableActionButton";

function getEstadoBadgeClass(estado) {
  if (estado === "REALIZADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function ReporteOrdenTable({
  reportes = [],
  loading = false,
  onOpenReporte,
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Reportes registrados</h2>
          <p className="mt-1 text-sm text-slate-500">
            Vista consolidada de reportes de trabajo asociados a ordenes en campo.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          {reportes.length} registros
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/90">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-6 py-4">Codigo</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Orden de trabajo</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                  Cargando reportes...
                </td>
              </tr>
            ) : null}

            {!loading && reportes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                  No hay reportes registrados.
                </td>
              </tr>
            ) : null}

            {!loading
              ? reportes.map((reporte) => {
                  const actionLabel =
                    reporte.estado === "REALIZADO" ? "Revisar" : "Completar";

                  return (
                    <tr key={reporte.id} className="align-top transition hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{reporte.codigo || "-"}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDisplayDate(reporte.fecha) || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-[280px] text-sm font-medium text-slate-800">
                          {reporte.orden_trabajo_display || "Sin orden asociada"}
                        </div>
                        {reporte.orden_trabajo_codigo ? (
                          <div className="mt-1 text-xs text-slate-500">
                            {reporte.orden_trabajo_codigo}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                            getEstadoBadgeClass(reporte.estado),
                          ].join(" ")}
                        >
                          {reporte.estado_label || reporte.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <TableActionButton
                          onClick={() => onOpenReporte?.(reporte)}
                          tone={reporte.estado === "REALIZADO" ? "primary" : "success"}
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
