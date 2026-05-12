"use client";

import { Pencil, Repeat2, Trash2 } from "lucide-react";
import TableActionButton from "@/components/ui/TableActionButton";

export default function UnidadesRelacionTable({
  relaciones,
  dimensiones,
  onEdit,
  onDelete,
}) {
  const nombreDimension = (dimensionId) =>
    dimensiones.find((dimension) => dimension.id === dimensionId)?.nombre || "-";

  const agrupadas = relaciones.reduce((acc, relacion) => {
    if (!acc[relacion.dimension]) {
      acc[relacion.dimension] = [];
    }
    acc[relacion.dimension].push(relacion);
    return acc;
  }, {});

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#EAF1FF] text-[#173569]">
            <Repeat2 className="h-5 w-5" strokeWidth={2.1} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#12233D]">
              Relaciones por dimension
            </h2>
            <p className="mt-1 text-sm text-[#5F6C80]">
              Define equivalencias coherentes entre unidades de una misma
              familia.
            </p>
          </div>
        </div>

        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {relaciones.length} relaciones
        </span>
      </header>

      {Object.keys(agrupadas).length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-[#5F6C80]">
          Crea unidades para comenzar a definir relaciones de conversion.
        </div>
      ) : (
        <div className="space-y-4 px-5 py-5">
          {Object.entries(agrupadas).map(
            ([dimensionId, relacionesDimension]) => (
              <article
                key={dimensionId}
                className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/70"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#173569]">
                      {nombreDimension(Number(dimensionId))}
                    </h3>
                    <p className="mt-1 text-sm text-[#5F6C80]">
                      {relacionesDimension.length} conversiones disponibles
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    Dimension activa
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] bg-white text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <th className="px-4 py-3">Relacion</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {relacionesDimension.map((relacion) => (
                        <tr
                          key={relacion.id}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-4">
                            <div className="font-medium text-[#12233D]">
                              1 {relacion.unidad_base_detalle?.nombre} ={" "}
                              {relacion.factor}{" "}
                              {relacion.unidad_relacionada_detalle?.nombre}
                            </div>
                            <div className="mt-1 text-xs text-[#5F6C80]">
                              {relacion.unidad_base_detalle?.simbolo || "-"} a{" "}
                              {relacion.unidad_relacionada_detalle?.simbolo || "-"}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                relacion.activo
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                              }`}
                            >
                              {relacion.activo ? "Activa" : "Inactiva"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <TableActionButton
                                onClick={() => onEdit(relacion)}
                                title="Editar relacion"
                                tone="neutral"
                              >
                                <Pencil
                                  className="h-3.5 w-3.5"
                                  strokeWidth={2.1}
                                />
                                Editar
                              </TableActionButton>
                              <TableActionButton
                                onClick={() => onDelete(relacion)}
                                title="Eliminar relacion"
                                tone="danger"
                              >
                                <Trash2
                                  className="h-3.5 w-3.5"
                                  strokeWidth={2.1}
                                />
                                Eliminar
                              </TableActionButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </section>
  );
}
