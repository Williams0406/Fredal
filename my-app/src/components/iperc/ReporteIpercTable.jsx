"use client";

import { formatDisplayDate } from "@/lib/utils";
import TableActionButton from "@/components/ui/TableActionButton";

export default function ReporteIpercTable({
  reportes = [],
  loading = false,
  onOpenReporte,
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Reportes IPERC registrados</h2>
          <p className="mt-1 text-sm text-slate-500">
            Seguimiento centralizado de reportes IPERC continuos manuales o asociados a
            trabajo de campo.
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
              <th className="px-6 py-4">Tarea</th>
              <th className="px-6 py-4">Motivo</th>
              <th className="px-6 py-4">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                  Cargando reportes IPERC...
                </td>
              </tr>
            ) : null}

            {!loading && reportes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                  No hay reportes IPERC registrados.
                </td>
              </tr>
            ) : null}

            {!loading
              ? reportes.map((reporte) => (
                  <tr key={reporte.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{reporte.codigo || "-"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDisplayDate(reporte.fecha) || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="min-w-[280px] text-sm font-medium text-slate-800">
                        {reporte.tarea || "Sin tarea registrada"}
                      </div>
                      {reporte.orden_trabajo_display ? (
                        <div className="mt-1 text-xs text-slate-500">
                          {reporte.orden_trabajo_display}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="min-w-[220px] text-sm text-slate-700">
                        {reporte.motivo_label || reporte.motivo || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <TableActionButton onClick={() => onOpenReporte?.(reporte)} tone="primary">
                        Revisar
                      </TableActionButton>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
