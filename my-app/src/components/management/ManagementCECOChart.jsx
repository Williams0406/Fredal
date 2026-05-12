"use client";

import ManagementMachineBarChart from "./ManagementMachineBarChart";
import { formatMachineMoney } from "./buildMachineIndicators";

export default function ManagementCECOChart({ rows = [] }) {
  return (
    <ManagementMachineBarChart
      title="CECO por maquinaria"
      subtitle="Centro de costos actual de cada maquinaria, usando el mismo valor mostrado en la vista de maquinaria."
      rows={rows}
      yLabel="Centro de costos"
      color="#84cc16"
      getValue={(row) => row.centroCostos}
      formatValue={(value) => formatMachineMoney(value)}
      noDataTitle="No hay maquinarias para graficar CECO"
      noDataDescription="Cuando existan maquinarias registradas con centro de costos calculable, apareceran aqui."
    />
  );
}
