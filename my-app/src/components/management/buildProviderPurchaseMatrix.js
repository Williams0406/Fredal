const HOURS_FORMATTER = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MONEY_FORMATTER = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatProviderLifeHours(value) {
  if (value === null || value === undefined) return "—";
  return `${HOURS_FORMATTER.format(Number(value))} h`;
}

export function formatProviderMoney(value) {
  if (value === null || value === undefined) return "—";
  return MONEY_FORMATTER.format(Number(value));
}

export function buildProviderPurchaseMatrix(payload = null) {
  const safePayload = payload || {};

  const columns = (safePayload.proveedores || []).map((proveedor) => ({
    id: proveedor.id,
    key: String(proveedor.id),
    nombre: proveedor.nombre || "Proveedor",
    ruc: proveedor.ruc || "",
    label: proveedor.ruc
      ? `${proveedor.nombre || "Proveedor"} · ${proveedor.ruc}`
      : proveedor.nombre || "Proveedor",
  }));

  const rows = (safePayload.rows || []).map((row) => ({
    itemId: row.item_id,
    itemCodigo: row.item_codigo || "ITEM",
    itemNombre: row.item_nombre || "Sin nombre",
    tipoInsumo: row.tipo_insumo || "SIN_TIPO",
    unidadSimbolo: row.unidad_simbolo || "",
    muestras: row.muestras || 0,
    cells: columns.map((column) => {
      const cell = row.values?.[column.key] || null;
      return {
        proveedorId: column.id,
        promedioValorUnitario: cell?.promedio_valor_unitario ?? null,
        promedioVidaUtil: cell?.promedio_vida_util ?? null,
        muestras: cell?.muestras ?? 0,
      };
    }),
  }));

  const meta = {
    totalItems: safePayload.meta?.total_items ?? rows.length,
    totalProveedores: safePayload.meta?.total_proveedores ?? columns.length,
    totalMuestras:
      safePayload.meta?.total_muestras ??
      rows.reduce((acc, row) => acc + (row.muestras || 0), 0),
  };

  return { columns, rows, meta };
}
