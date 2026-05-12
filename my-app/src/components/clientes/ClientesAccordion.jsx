"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Pencil,
  ReceiptText,
  Trash2,
} from "lucide-react";
import TableActionButton from "@/components/ui/TableActionButton";

const getClienteKey = (cliente) => cliente?.id ?? cliente?.nombre;
const getUbicacionKey = (ubicacion) =>
  ubicacion?.cliente ??
  ubicacion?.cliente_id ??
  ubicacion?.clienteId ??
  ubicacion?.cliente_nombre;

export default function ClientesAccordion({
  clientes,
  ubicaciones,
  onEditCliente,
  onDeleteCliente,
  onEditUbicacion,
  onDeleteUbicacion,
}) {
  const [openCliente, setOpenCliente] = useState(null);

  const ubicacionesByCliente = useMemo(() => {
    return ubicaciones.reduce((acc, ubicacion) => {
      const key = getUbicacionKey(ubicacion);
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(ubicacion);
      return acc;
    }, {});
  }, [ubicaciones]);

  if (!clientes.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-100 text-[#173569]">
          <Building2 className="h-6 w-6" strokeWidth={2.1} />
        </div>
        <p className="mt-4 text-base font-semibold text-[#12233D]">
          Aun no hay clientes registrados
        </p>
        <p className="mt-2 text-sm text-[#5F6C80]">
          Crea un cliente para comenzar a asociar ubicaciones y frentes
          operativos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {clientes.map((cliente) => {
        const key = getClienteKey(cliente);
        const ubicacionesCliente = ubicacionesByCliente[key] || [];
        const isOpen = openCliente === key;
        const hasRuc = Boolean(String(cliente.ruc || "").trim());

        return (
          <article
            key={key}
            className={`overflow-hidden rounded-[28px] border bg-white transition-all duration-200 ${
              isOpen
                ? "border-[#173569]/18 shadow-[0_20px_42px_rgba(15,35,70,0.12)]"
                : "border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${
                      isOpen
                        ? "bg-[#EAF1FF] text-[#173569]"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Building2 className="h-5 w-5" strokeWidth={2.1} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-[#12233D]">
                      {cliente.nombre}
                    </h3>
                    <p className="mt-1 text-sm text-[#5F6C80]">
                      {hasRuc ? `RUC ${cliente.ruc}` : "Sin RUC registrado"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <InfoPill icon={MapPin}>
                    {ubicacionesCliente.length}{" "}
                    {ubicacionesCliente.length === 1
                      ? "ubicacion"
                      : "ubicaciones"}
                  </InfoPill>
                  <InfoPill icon={ReceiptText}>
                    {hasRuc ? "RUC disponible" : "Pendiente de RUC"}
                  </InfoPill>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <TableActionButton
                  type="button"
                  tone="neutral"
                  onClick={() => onEditCliente?.(cliente)}
                  title="Editar cliente"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.1} />
                  Editar
                </TableActionButton>

                <TableActionButton
                  type="button"
                  tone="danger"
                  onClick={() => onDeleteCliente?.(cliente)}
                  title="Eliminar cliente"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.1} />
                  Eliminar
                </TableActionButton>

                <button
                  type="button"
                  onClick={() => setOpenCliente(isOpen ? null : key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    isOpen
                      ? "border-[#173569]/15 bg-[#EAF1FF] text-[#173569]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Ver ubicaciones
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" strokeWidth={2.2} />
                  ) : (
                    <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
                  )}
                </button>
              </div>
            </div>

            {isOpen ? (
              <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-4">
                {ubicacionesCliente.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {ubicacionesCliente.map((ubicacion) => (
                      <div
                        key={
                          ubicacion.id ??
                          `${ubicacion.nombre}-${ubicacion.direccion}`
                        }
                        className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-[#173569]">
                              <MapPin className="h-4 w-4" strokeWidth={2.2} />
                            </div>
                            <p className="mt-3 text-sm font-semibold text-[#12233D]">
                              {ubicacion.nombre}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-[#5F6C80]">
                              {ubicacion.direccion || "Sin direccion registrada"}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <TableActionButton
                              type="button"
                              tone="neutral"
                              iconOnly
                              onClick={() => onEditUbicacion?.(ubicacion)}
                              title="Editar ubicacion"
                            >
                              <Pencil className="h-3.5 w-3.5" strokeWidth={2.1} />
                            </TableActionButton>
                            <TableActionButton
                              type="button"
                              tone="danger"
                              iconOnly
                              onClick={() => onDeleteUbicacion?.(ubicacion)}
                              title="Eliminar ubicacion"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.1} />
                            </TableActionButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-300 bg-white px-5 py-6 text-sm text-[#5F6C80]">
                    Este cliente aun no tiene ubicaciones asociadas.
                  </div>
                )}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function InfoPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-[#5F6C80]">
      <Icon className="h-3.5 w-3.5" strokeWidth={2.1} />
      {children}
    </span>
  );
}
