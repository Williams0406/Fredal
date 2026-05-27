import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDisplayDate } from "@/lib/utils";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 14;
const HEADER_TOP = 12;
const HEADER_HEIGHT = 38;
const CONTENT_TOP = HEADER_TOP + HEADER_HEIGHT + 8;

function safeText(value, fallback = "-") {
  const normalized = value === null || value === undefined ? "" : String(value).trim();
  return normalized || fallback;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadLogoDataUrl() {
  try {
    const response = await fetch("/logo/logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch (error) {
    console.error("No se pudo cargar el logo para el resumen PDF:", error);
    return null;
  }
}

function clampLines(lines = [], maxLines = 3) {
  if (lines.length <= maxLines) return lines;
  const visible = lines.slice(0, maxLines);
  const lastLine = visible[maxLines - 1];
  visible[maxLines - 1] = `${String(lastLine).replace(/[. ]+$/, "")}...`;
  return visible;
}

function drawHeader(doc, header, logoDataUrl) {
  const headerWidth = PAGE_WIDTH - MARGIN_X * 2;
  const logoSectionWidth = 30;
  const metaSectionWidth = 52;
  const titleSectionX = MARGIN_X + logoSectionWidth;
  const titleSectionWidth = headerWidth - logoSectionWidth - metaSectionWidth;
  const metaSectionX = PAGE_WIDTH - MARGIN_X - metaSectionWidth;

  doc.setDrawColor(218, 226, 236);
  doc.setFillColor(248, 251, 255);
  doc.roundedRect(
    MARGIN_X,
    HEADER_TOP,
    headerWidth,
    HEADER_HEIGHT,
    4,
    4,
    "FD"
  );

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", MARGIN_X + 2, HEADER_TOP + 3, 26, HEADER_HEIGHT - 6);
  }

  const titleLines = clampLines(
    doc.splitTextToSize(header.title, titleSectionWidth - 10),
    2
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(titleLines.length > 1 ? 12 : 13);
  doc.setTextColor(15, 35, 70);
  doc.text(titleLines, titleSectionX + 5, HEADER_TOP + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  const metaRows = [
    ["CODIGO:", safeText(header.codigo)],
    ["VERSION:", "1.0"],
    ["VIGENTE:", safeText(header.vigente)],
  ];

  metaRows.forEach(([label, value], index) => {
    const y = HEADER_TOP + 8 + index * 8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 35, 70);
    doc.text(label, metaSectionX + 4, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const valueLines = doc.splitTextToSize(value, metaSectionWidth - 22);
    doc.text(clampLines(valueLines, 2), metaSectionX + 21, y);
  });
}

function ensureSpace(doc, currentY, requiredHeight, header, logoDataUrl) {
  if (currentY + requiredHeight <= PAGE_HEIGHT - 16) return currentY;
  doc.addPage();
  drawHeader(doc, header, logoDataUrl);
  return CONTENT_TOP;
}

function drawSectionTitle(doc, title, y) {
  doc.setFillColor(238, 244, 255);
  doc.setDrawColor(214, 228, 255);
  doc.roundedRect(MARGIN_X, y, PAGE_WIDTH - MARGIN_X * 2, 8, 2.5, 2.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(23, 53, 105);
  doc.text(title, MARGIN_X + 4, y + 5.4);
}

function buildSummaryRows(summaryFields) {
  return summaryFields.map(([label, value]) => [label, safeText(value)]);
}

function buildActivityInfoRows(activity) {
  return [
    ["Tipo de actividad", safeText(activity.tipo_actividad)],
    ["Tipo de mantenimiento", safeText(activity.tipo_mantenimiento)],
    ["Subtipo", safeText(activity.subtipo)],
    ["Descripcion", safeText(activity.descripcion)],
  ];
}

function buildMaterialRows(activity) {
  const repuestos = Array.isArray(activity.repuestos) ? activity.repuestos : [];
  const consumibles = Array.isArray(activity.consumibles) ? activity.consumibles : [];

  const repuestoRows = repuestos.map((repuesto) => [
    "Repuesto",
    safeText(
      [
        repuesto.item_codigo && repuesto.item_nombre
          ? `${repuesto.item_codigo} - ${repuesto.item_nombre}`
          : repuesto.item_nombre,
        repuesto.unidad_serie ? `Serie: ${repuesto.unidad_serie}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      "Repuesto sin detalle"
    ),
    "1",
    "unidades",
  ]);

  const consumibleRows = consumibles.map((consumible) => [
    "Consumible",
    safeText(
      consumible.item_codigo && consumible.item_nombre
        ? `${consumible.item_codigo} - ${consumible.item_nombre}`
        : consumible.item_nombre
    ),
    safeText(consumible.cantidad, "0"),
    safeText(consumible.unidad_medida_simbolo || consumible.unidad_medida_detalle),
  ]);

  const rows = [...repuestoRows, ...consumibleRows];
  if (rows.length) return rows;
  return [["-", "Sin items asociados a esta actividad", "-", "-"]];
}

export async function generateTrabajoResumenPdf({
  trabajo,
  maquinariaLabel,
  tecnicosLabel,
  actividades,
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const logoDataUrl = await loadLogoDataUrl();
  const header = {
    title: `${safeText(trabajo.codigo_orden)} - ${safeText(maquinariaLabel)}`,
    codigo: trabajo.codigo_orden,
    vigente: formatDisplayDate(trabajo.fecha),
  };

  drawHeader(doc, header, logoDataUrl);

  const summaryRows = buildSummaryRows([
    ["Maquinaria", maquinariaLabel],
    ["Horometro", trabajo.horometro],
    ["Hora inicio", trabajo.hora_inicio],
    ["Hora fin", trabajo.hora_fin],
    ["Prioridad", trabajo.prioridad_label || trabajo.prioridad],
    ["Lugar", trabajo.lugar_label || trabajo.lugar],
    ["Ubicacion detalle", trabajo.ubicacion_detalle],
    ["Estado del equipo", trabajo.estado_equipo_label || trabajo.estado_equipo],
    ["Observaciones", trabajo.observaciones],
    ["Tecnicos", tecnicosLabel],
  ]);

  autoTable(doc, {
    startY: CONTENT_TOP,
    margin: { top: CONTENT_TOP, left: MARGIN_X, right: MARGIN_X },
    body: summaryRows,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2.6,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [51, 65, 85],
      valign: "top",
    },
    columnStyles: {
      0: {
        fillColor: [248, 250, 252],
        fontStyle: "bold",
        textColor: [15, 35, 70],
        cellWidth: 44,
      },
      1: {
        cellWidth: PAGE_WIDTH - MARGIN_X * 2 - 44,
      },
    },
    didDrawPage: () => {
      drawHeader(doc, header, logoDataUrl);
    },
  });

  let cursorY = doc.lastAutoTable.finalY + 6;
  cursorY = ensureSpace(doc, cursorY, 12, header, logoDataUrl);
  drawSectionTitle(doc, "ACTIVIDADES REGISTRADAS", cursorY);
  cursorY += 12;

  if (!actividades.length) {
    autoTable(doc, {
      startY: cursorY,
      margin: { top: CONTENT_TOP, left: MARGIN_X, right: MARGIN_X },
      body: [["No hay actividades registradas para esta orden finalizada."]],
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 3,
        textColor: [100, 116, 139],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      didDrawPage: () => {
        drawHeader(doc, header, logoDataUrl);
      },
    });
  } else {
    actividades.forEach((actividad, index) => {
      cursorY = ensureSpace(doc, cursorY, 18, header, logoDataUrl);
      drawSectionTitle(doc, `ACTIVIDAD ${index + 1}`, cursorY);
      cursorY += 10;

      autoTable(doc, {
        startY: cursorY,
        margin: { top: CONTENT_TOP, left: MARGIN_X, right: MARGIN_X },
        body: buildActivityInfoRows(actividad),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 8.7,
          cellPadding: 2.4,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          textColor: [51, 65, 85],
          valign: "top",
        },
        columnStyles: {
          0: {
            fillColor: [248, 250, 252],
            fontStyle: "bold",
            textColor: [15, 35, 70],
            cellWidth: 48,
          },
          1: {
            cellWidth: PAGE_WIDTH - MARGIN_X * 2 - 48,
          },
        },
        didDrawPage: () => {
          drawHeader(doc, header, logoDataUrl);
        },
      });

      cursorY = doc.lastAutoTable.finalY + 4;

      autoTable(doc, {
        startY: cursorY,
        margin: { top: CONTENT_TOP, left: MARGIN_X, right: MARGIN_X },
        head: [["Tipo", "Item", "Cantidad", "Unidad"]],
        body: buildMaterialRows(actividad),
        theme: "grid",
        headStyles: {
          fillColor: [23, 53, 105],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
        },
        styles: {
          font: "helvetica",
          fontSize: 8.2,
          cellPadding: 2.2,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          textColor: [51, 65, 85],
          valign: "top",
        },
        columnStyles: {
          0: {
            cellWidth: 22,
            halign: "center",
            fontStyle: "bold",
          },
          1: { cellWidth: 106 },
          2: { cellWidth: 24, halign: "center" },
          3: { cellWidth: 30, halign: "center" },
        },
        didDrawPage: () => {
          drawHeader(doc, header, logoDataUrl);
        },
      });

      cursorY = doc.lastAutoTable.finalY + 8;
    });
  }

  doc.save(`Resumen-${safeText(trabajo.codigo_orden, "OT")}.pdf`);
}
