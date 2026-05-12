const NUMBER_FORMATTER = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function buildMachineIndicators(payload = null) {
  const safePayload = payload || {};

  const rows = (safePayload.rows || []).map((row) => ({
    maquinariaId: row.maquinaria_id,
    codigo: row.codigo || "MQ",
    nombre: row.nombre || "Maquinaria",
    mtbfDias:
      row.mtbf_dias === null || row.mtbf_dias === undefined
        ? null
        : Number(row.mtbf_dias),
    mttrHoras:
      row.mttr_horas === null || row.mttr_horas === undefined
        ? null
        : Number(row.mttr_horas),
    centroCostos: Number(row.centro_costos || 0),
  }));

  const meta = {
    totalMaquinarias: safePayload.meta?.total_maquinarias ?? rows.length,
    maquinariasConMtbf:
      safePayload.meta?.maquinarias_con_mtbf ??
      rows.filter((row) => row.mtbfDias !== null).length,
    maquinariasConMttr:
      safePayload.meta?.maquinarias_con_mttr ??
      rows.filter((row) => row.mttrHoras !== null).length,
  };

  return { rows, meta };
}

export function formatMachineMetric(value, unit = "") {
  if (value === null || value === undefined) return "—";
  return unit ? `${NUMBER_FORMATTER.format(value)} ${unit}` : NUMBER_FORMATTER.format(value);
}

export function formatMachineMoney(value) {
  return CURRENCY_FORMATTER.format(Number(value || 0));
}
