"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { maquinariaAPI } from "@/lib/api";

const STATUS_STYLES = {
  PENDIENTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  EN_PROCESO: "bg-blue-100 text-blue-800 border-blue-200",
  FINALIZADO: "bg-green-100 text-green-800 border-green-200",
};

const STATUS_LABELS = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  FINALIZADO: "Finalizado",
};

function formatDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export default function MaquinariaObservaciones({
  maquinariaId,
  open,
  onClose,
}) {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    if (!open || !maquinariaId) return;

    setLoading(true);
    maquinariaAPI
      .retrieve(maquinariaId)
      .then((res) => {
        setOrdenes(res.data?.ordenes || []);
      })
      .catch((error) => {
        console.error("Error al cargar observaciones de maquinaria:", error);
      })
      .finally(() => setLoading(false));
  }, [open, maquinariaId]);

  const observaciones = useMemo(
    () =>
      ordenes
        .filter((orden) => String(orden.observaciones || "").trim())
        .map((orden) => ({
          id: orden.id,
          codigo_orden: orden.codigo_orden,
          fecha: orden.fecha,
          estatus: orden.estatus,
          prioridad: orden.prioridad,
          lugar: orden.lugar,
          observaciones: String(orden.observaciones || "").trim(),
        }))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    [ordenes]
  );

  const observacionesFiltradas = useMemo(
    () =>
      observaciones.filter((observacion) => {
        if (fechaDesde && observacion.fecha < fechaDesde) return false;
        if (fechaHasta && observacion.fecha > fechaHasta) return false;
        return true;
      }),
    [observaciones, fechaDesde, fechaHasta]
  );

  const ultimaFecha = observaciones[0]?.fecha || null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Observaciones de Ordenes de Trabajo"
      size="lg"
    >
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a8a]" />
          <p className="mt-3 text-sm text-gray-600">Cargando observaciones...</p>
        </div>
      ) : observaciones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            No hay observaciones registradas
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Esta maquinaria aun no tiene observaciones guardadas en sus ordenes de trabajo.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total observaciones
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#1e3a8a]">
                {observaciones.length}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Resultado actual
              </p>
              <p className="mt-2 text-2xl font-semibold text-blue-700">
                {observacionesFiltradas.length}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ultima fecha
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                {formatDate(ultimaFecha)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <label
                  htmlFor="observaciones-fecha-desde"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600"
                >
                  Fecha desde
                </label>
                <input
                  id="observaciones-fecha-desde"
                  type="date"
                  value={fechaDesde}
                  onChange={(event) => setFechaDesde(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="observaciones-fecha-hasta"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600"
                >
                  Fecha hasta
                </label>
                <input
                  id="observaciones-fecha-hasta"
                  type="date"
                  value={fechaHasta}
                  onChange={(event) => setFechaHasta(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setFechaDesde("");
                    setFechaHasta("");
                  }}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 md:w-auto"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>

          {observacionesFiltradas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
              <h3 className="text-base font-semibold text-gray-900">
                Sin resultados en ese rango
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Ajusta las fechas para ver observaciones registradas en otro periodo.
              </p>
            </div>
          ) : (
            <div className="max-h-[500px] space-y-4 overflow-y-auto pr-2">
              {observacionesFiltradas.map((observacion) => (
                <div
                  key={observacion.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-[#1e3a8a]">
                          {observacion.codigo_orden}
                        </h3>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                            STATUS_STYLES[observacion.estatus] ||
                            "border-gray-200 bg-gray-100 text-gray-700"
                          }`}
                        >
                          {STATUS_LABELS[observacion.estatus] || observacion.estatus}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Fecha: {formatDate(observacion.fecha)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {observacion.prioridad ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          {observacion.prioridad}
                        </span>
                      ) : null}
                      {observacion.lugar ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {observacion.lugar}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm leading-6 text-slate-700">
                      {observacion.observaciones}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
