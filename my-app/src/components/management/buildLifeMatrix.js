const LIFE_FORMATTER = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MONEY_FORMATTER = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatLifeHours(value) {
  if (value === null || value === undefined) return "—";
  return `${LIFE_FORMATTER.format(Number(value))} h`;
}

export function formatLifeMatrixMoney(value) {
  if (value === null || value === undefined) return "—";
  return MONEY_FORMATTER.format(Number(value));
}

export function buildLifeMatrix(payload = null) {
  const safePayload = payload || {};

  const columns = (safePayload.maquinarias || []).map((maquinaria) => ({
    id: maquinaria.id,
    key: String(maquinaria.id),
    codigo: maquinaria.codigo || "MQ",
    nombre: maquinaria.nombre || "Maquinaria",
    label: `${maquinaria.codigo || "MQ"} - ${maquinaria.nombre || "Maquinaria"}`,
  }));

  const rows = (safePayload.rows || []).map((row) => ({
    itemId: row.item_id,
    itemCodigo: row.item_codigo || "ITEM",
    itemNombre: row.item_nombre || "Sin nombre",
    tipoInsumo: row.tipo_insumo || "SIN_TIPO",
    muestras: row.muestras || 0,
    cells: columns.map((column) => {
      const cell = row.values?.[column.key] || null;
      return {
        maquinariaId: column.id,
        promedioVida: cell?.promedio_vida ?? null,
        costoTotal: cell?.costo_total ?? null,
        muestras: cell?.muestras ?? 0,
      };
    }),
  }));

  const meta = {
    totalItems: safePayload.meta?.total_items ?? rows.length,
    totalMaquinarias: safePayload.meta?.total_maquinarias ?? columns.length,
    totalMuestras:
      safePayload.meta?.total_muestras ??
      rows.reduce((acc, row) => acc + (row.muestras || 0), 0),
  };

  return { columns, rows, meta };
}
