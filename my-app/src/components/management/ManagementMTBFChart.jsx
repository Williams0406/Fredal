"use client";

import ManagementMachineBarChart from "./ManagementMachineBarChart";
import { formatMachineMetric } from "./buildMachineIndicators";

export default function ManagementMTBFChart({ rows = [] }) {
  return (
    <ManagementMachineBarChart
      title="MTBF por maquinaria"
      subtitle="Promedio de dias entre fechas consecutivas de ordenes de trabajo de la misma maquinaria."
      rows={rows}
      yLabel="Dias"
      color="#1e3a8a"
      getValue={(row) => row.mtbfDias}
      formatValue={(value) => formatMachineMetric(value, "d")}
      noDataTitle="No hay suficiente historial para MTBF"
      noDataDescription="Necesitas al menos dos ordenes de trabajo por maquinaria para calcular la diferencia promedio en dias."
    />
  );
}
