"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { maquinariaAPI } from "@/lib/api";

export default function MaquinariaResumen({
  maquinariaId,
  open,
  onClose,
}) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (open && maquinariaId) {
      maquinariaAPI.unidades(maquinariaId).then((res) => {
        setData(res.data);
      });
    }
  }, [open, maquinariaId]);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resumen de maquinaria"
    >
      {!data ? (
        <p>Cargando...</p>
      ) : (
        <>
          <h3 className="font-semibold mb-2">
            {data.maquinaria?.codigo} - {data.maquinaria?.nombre}
          </h3>

          <table className="table w-full text-sm">
            <thead>
              <tr>
                <th>Item</th>
                <th>Serie</th>
                <th>Estado</th>
                <th className="text-right">Costo (S/)</th>
              </tr>
            </thead>
            <tbody>
              {data.unidades.map((u) => (
                <tr key={u.unidad_id}>
                  <td>
                    {u.item_codigo} - {u.item_nombre}
                  </td>
                  <td>{u.serie}</td>
                  <td>{u.estado}</td>
                  <td className="text-right">
                    {Number(u.costo_unitario).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 text-right font-semibold">
            💰 Centro de costos:{" "}
            <span className="text-lg">
              S/ {Number(data.centro_costos).toFixed(2)}
            </span>
          </div>
        </>
      )}
    </Modal>
  );
}
