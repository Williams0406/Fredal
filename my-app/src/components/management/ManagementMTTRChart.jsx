"use client";

import ManagementMachineBarChart from "./ManagementMachineBarChart";
import { formatMachineMetric } from "./buildMachineIndicators";

export default function ManagementMTTRChart({ rows = [] }) {
  return (
    <ManagementMachineBarChart
      title="MTTR por maquinaria"
      subtitle="Promedio de horas entre hora_inicio y hora_fin de las ordenes de trabajo asociadas a cada maquinaria."
      rows={rows}
      yLabel="Horas"
      color="#059669"
      getValue={(row) => row.mttrHoras}
      formatValue={(value) => formatMachineMetric(value, "h")}
      noDataTitle="No hay datos suficientes para MTTR"
      noDataDescription="Necesitas ordenes con hora de inicio y hora de fin validas para calcular el tiempo medio de reparacion."
    />
  );
}
