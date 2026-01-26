"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { maquinariaAPI } from "@/lib/api";

export default function MaquinariaHistorial({
  maquinariaId,
  open,
  onClose,
}) {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && maquinariaId) {
      setLoading(true);
      maquinariaAPI
        .retrieve(maquinariaId)
        .then((res) => {
          setOrdenes(res.data.ordenes || []);
        })
        .finally(() => setLoading(false));
    }
  }, [open, maquinariaId]);

  return (
    <Modal open={open} onClose={onClose} title="Historial de Órdenes">
      {loading && (
        <p className="text-sm text-gray-500">Cargando historial...</p>
      )}

      {!loading && ordenes.length === 0 && (
        <p className="text-sm text-gray-500">
          No hay órdenes registradas para esta maquinaria.
        </p>
      )}

      <div className="space-y-4">
        {ordenes.map((orden) => (
          <div
            key={orden.id}
            className="border rounded-md p-3"
          >
            {/* CABECERA ORDEN */}
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="font-semibold">
                  {orden.codigo_orden}
                </p>
                <p className="text-xs text-gray-500">
                  Fecha: {orden.fecha}
                </p>
              </div>

              <span className="text-xs px-2 py-1 rounded bg-gray-100">
                {orden.estatus}
              </span>
            </div>

            {/* ACTIVIDADES */}
            <div className="space-y-2">
              {orden.actividades.length === 0 && (
                <p className="text-xs text-gray-400">
                  Sin actividades registradas
                </p>
              )}

              {orden.actividades.map((act) => (
                <div
                  key={act.id}
                  className="bg-gray-50 rounded p-2 text-sm"
                >
                  <p>
                    <span className="font-medium">
                      {act.tipo_actividad}
                    </span>

                    {act.tipo_actividad === "MANTENIMIENTO" && (
                      <>
                        {" · "}
                        {act.tipo_mantenimiento}
                        {" · "}
                        {act.subtipo}
                      </>
                    )}
                  </p>

                  {act.descripcion && (
                    <p className="text-xs text-gray-600">
                      {act.descripcion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
