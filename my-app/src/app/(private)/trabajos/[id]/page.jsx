"use client";

import { useParams } from "next/navigation";

export default function TrabajoDetallePage() {
  const { id } = useParams();

  return (
    <>
      <h1 className="text-xl font-bold mb-4">
        Detalle Trabajo #{id}
      </h1>
      <p>Detalle y consumo de repuestos</p>
    </>
  );
}
