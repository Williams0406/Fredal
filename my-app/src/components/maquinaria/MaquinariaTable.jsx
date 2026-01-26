"use client";

import { useState } from "react";
import MaquinariaHistorial from "./MaquinariaHistorial";
import MaquinariaResumen from "./MaquinariaResumen";

export default function MaquinariaTable({ maquinarias }) {
  const [selectedId, setSelectedId] = useState(null);
  const [openHistorial, setOpenHistorial] = useState(false);
  const [openResumen, setOpenResumen] = useState(false);

  return (
    <>
      <table className="table w-full">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Centro de Costos (S/)</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {maquinarias.map((m) => (
            <tr key={m.id}>
              <td className="font-medium">
                {m.codigo_maquina}
              </td>
              <td>{m.nombre}</td>
              <td>{Number(m.centro_costos).toFixed(2)}</td>
              <td className="space-x-2">
                <button
                  className="text-blue-600"
                  onClick={() => {
                    setSelectedId(m.id);
                    setOpenHistorial(true);
                  }}
                >
                  Historial
                </button>


                <button
                  className="text-purple-600"
                  onClick={() => {
                    setSelectedId(m.id);
                    setOpenResumen(true);
                  }}
                >
                  Resumen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODALES */}
      <MaquinariaHistorial
        maquinariaId={selectedId}
        open={openHistorial}
        onClose={() => setOpenHistorial(false)}
      />

      <MaquinariaResumen
        maquinariaId={selectedId}
        open={openResumen}
        onClose={() => setOpenResumen(false)}
      />
    </>
  );
}
