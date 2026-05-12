const INTEGER_FORMATTER = new Intl.NumberFormat("es-PE", {
  maximumFractionDigits: 0,
});

const DECIMAL_FORMATTER = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatHistoryQuantity(row) {
  const amount = Number(row?.cantidad || 0);

  if (row?.tipoInsumo === "REPUESTO") {
    return `${INTEGER_FORMATTER.format(amount)} uso${amount === 1 ? "" : "s"}`;
  }

  const formattedAmount = DECIMAL_FORMATTER.format(amount);
  return row?.unidadSimbolo
    ? `${formattedAmount} ${row.unidadSimbolo}`
    : formattedAmount;
}

export function formatMoney(value) {
  return CURRENCY_FORMATTER.format(Number(value || 0));
}

export function formatHours(value) {
  return `${DECIMAL_FORMATTER.format(Number(value || 0))} h`;
}

export function buildItemHistorySummary(payload = null) {
  const safePayload = payload || {};

  const rows = (safePayload.rows || []).map((row) => ({
    itemId: row.item_id,
    itemCodigo: row.item_codigo || "ITEM",
    itemNombre: row.item_nombre || "Sin nombre",
    tipoInsumo: row.tipo_insumo || "SIN_TIPO",
    cantidad: Number(row.cantidad || 0),
    valorMonetario: Number(row.valor_monetario || 0),
    duracionHorasTotal: Number(row.duracion_horas_total || 0),
    unidadSimbolo: row.unidad_simbolo || "",
  }));

  const meta = {
    totalItems: safePayload.meta?.total_items ?? rows.length,
    itemsConHistorial:
      safePayload.meta?.items_con_historial ??
      rows.filter((row) => row.cantidad > 0).length,
    totalRepuestosCerrados:
      safePayload.meta?.total_repuestos_cerrados ??
      rows
        .filter((row) => row.tipoInsumo === "REPUESTO")
        .reduce((acc, row) => acc + row.cantidad, 0),
    totalConsumiblesCerrados:
      safePayload.meta?.total_consumibles_cerrados ??
      rows
        .filter((row) => row.tipoInsumo === "CONSUMIBLE")
        .reduce((acc, row) => acc + row.cantidad, 0),
    totalValorMonetario:
      safePayload.meta?.total_valor_monetario ??
      rows.reduce((acc, row) => acc + row.valorMonetario, 0),
    totalDuracionHorasRepuestos:
      safePayload.meta?.total_duracion_horas_repuestos ??
      rows
        .filter((row) => row.tipoInsumo === "REPUESTO")
        .reduce((acc, row) => acc + row.duracionHorasTotal, 0),
    fechaDesde: safePayload.meta?.fecha_desde ?? null,
    fechaHasta: safePayload.meta?.fecha_hasta ?? null,
  };

  return { rows, meta };
}
