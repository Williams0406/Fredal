"use client";

import { Pencil, Ruler, Trash2 } from "lucide-react";
import TableActionButton from "@/components/ui/TableActionButton";

export default function UnidadesMedidaTable({
  unidades,
  onEdit,
  onDelete,
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#EAF1FF] text-[#173569]">
            <Ruler className="h-5 w-5" strokeWidth={2.1} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#12233D]">
              Unidades de medida
            </h2>
            <p className="mt-1 text-sm text-[#5F6C80]">
              Asigna cada unidad a su dimension y marca sus referencias base.
            </p>
          </div>
        </div>

        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {unidades.length} registros
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <th className="px-5 py-3">Unidad</th>
              <th className="px-5 py-3">Simbolo</th>
              <th className="px-5 py-3">Dimension</th>
              <th className="px-5 py-3">Base</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {unidades.map((unidad) => (
              <tr key={unidad.id} className="transition hover:bg-slate-50/80">
                <td className="px-5 py-4 font-medium text-[#12233D]">
                  {unidad.nombre}
                </td>
                <td className="px-5 py-4 text-sm text-[#5F6C80]">
                  {unidad.simbolo || "-"}
                </td>
                <td className="px-5 py-4 text-sm text-[#5F6C80]">
                  {unidad.dimension_detalle?.nombre || "-"}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      unidad.es_base
                        ? "bg-[#EAF1FF] text-[#173569] ring-1 ring-[#C7D8F8]"
                        : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                    }`}
                  >
                    {unidad.es_base ? "Base" : "Secundaria"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge active={unidad.activo} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <TableActionButton
                      onClick={() => onEdit(unidad)}
                      title="Editar unidad"
                      tone="neutral"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2.1} />
                      Editar
                    </TableActionButton>
                    <TableActionButton
                      onClick={() => onDelete(unidad)}
                      title="Eliminar unidad"
                      tone="danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.1} />
                      Eliminar
                    </TableActionButton>
                  </div>
                </td>
              </tr>
            ))}

            {unidades.length === 0 ? (
              <tr>
                <td
                  className="px-5 py-12 text-center text-sm text-[#5F6C80]"
                  colSpan={6}
                >
                  Aun no tienes unidades registradas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}
