import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDisplayDate } from "@/lib/utils";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 14;
const HEADER_TOP = 12;
const HEADER_HEIGHT = 38;
const CONTENT_TOP = HEADER_TOP + HEADER_HEIGHT + 8;
const FONT_FAMILY = "times";

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
  const logoSectionWidth = 34;
  const metaSectionWidth = 56;
  const titleSectionX = MARGIN_X + logoSectionWidth;
  const titleSectionWidth = headerWidth - logoSectionWidth - metaSectionWidth;
  const metaSectionX = PAGE_WIDTH - MARGIN_X - metaSectionWidth;
  const headerBottom = HEADER_TOP + HEADER_HEIGHT;

  doc.setDrawColor(218, 226, 236);
  doc.setFillColor(248, 251, 255);
  doc.rect(
    MARGIN_X,
    HEADER_TOP,
    headerWidth,
    HEADER_HEIGHT,
    "FD"
  );

  doc.setDrawColor(218, 226, 236);
  doc.line(titleSectionX, HEADER_TOP, titleSectionX, headerBottom);
  doc.line(metaSectionX, HEADER_TOP, metaSectionX, headerBottom);

  const logoSize = logoSectionWidth;
  const logoX = MARGIN_X;
  const logoY = HEADER_TOP + (HEADER_HEIGHT - logoSize) / 2;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
  }

  const titleLines = clampLines(
    doc.splitTextToSize(header.title, titleSectionWidth - 8),
    3
  );

  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(titleLines.length > 2 ? 10.2 : titleLines.length > 1 ? 11.2 : 12);
  doc.setTextColor(15, 35, 70);
  doc.text(titleLines, titleSectionX + 2.5, HEADER_TOP + 5, {
    baseline: "top",
    lineHeightFactor: 1.15,
  });

  doc.setFont(FONT_FAMILY, "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  const metaRows = [
    ["CÓDIGO:", safeText(header.codigo)],
    ["VERSIÓN:", "1.0"],
    ["VIGENTE:", safeText(header.vigente)],
  ];

  metaRows.forEach(([label, value], index) => {
    const y = HEADER_TOP + 6 + index * 10;
    doc.setFont(FONT_FAMILY, "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(15, 35, 70);
    doc.text(label, metaSectionX + 2.5, y, { baseline: "top" });
    doc.setFont(FONT_FAMILY, "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(51, 65, 85);
    const valueLines = doc.splitTextToSize(value, metaSectionWidth - 20);
    doc.text(clampLines(valueLines, 2), metaSectionX + 19, y, {
      baseline: "top",
      lineHeightFactor: 1.05,
    });
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
  doc.setFont(FONT_FAMILY, "bold");
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

function resolveEvidenceUrl(url) {
  if (!url) return "";
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadEvidenceImage(evidence) {
  const url = resolveEvidenceUrl(evidence?.url || evidence?.imagen_url || evidence?.imagen);
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = await loadImageElement(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      return {
        dataUrl: canvas.toDataURL("image/jpeg", 0.86),
        width: canvas.width,
        height: canvas.height,
        nombre: safeText(evidence?.nombre, "Evidencia"),
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (error) {
    console.error("No se pudo adjuntar evidencia al PDF:", error);
    return null;
  }
}

function drawContainedImage(doc, image, x, y, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * ratio;
  const height = image.height * ratio;
  const imageX = x + (maxWidth - width) / 2;
  const imageY = y + (maxHeight - height) / 2;

  doc.addImage(image.dataUrl, "JPEG", imageX, imageY, width, height);
}

async function drawEvidenceImages(doc, evidencias, cursorY, header, logoDataUrl) {
  const validEvidencias = Array.isArray(evidencias) ? evidencias : [];
  if (!validEvidencias.length) return cursorY;

  const images = (await Promise.all(validEvidencias.map(loadEvidenceImage))).filter(Boolean);
  if (!images.length) return cursorY;

  const gap = 4;
  const columns = 2;
  const tileWidth = (PAGE_WIDTH - MARGIN_X * 2 - gap) / columns;
  const imageHeight = 52;
  const tileHeight = imageHeight + 4;

  cursorY = ensureSpace(doc, cursorY, tileHeight + 10, header, logoDataUrl);
  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(9);
  doc.setTextColor(23, 53, 105);
  doc.text("Evidencias adjuntas", MARGIN_X, cursorY);
  cursorY += 4;

  for (let index = 0; index < images.length; index += columns) {
    cursorY = ensureSpace(doc, cursorY, tileHeight + 4, header, logoDataUrl);

    images.slice(index, index + columns).forEach((image, columnIndex) => {
      const x = MARGIN_X + columnIndex * (tileWidth + gap);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, cursorY, tileWidth, tileHeight, 2, 2, "FD");
      drawContainedImage(doc, image, x + 2, cursorY + 2, tileWidth - 4, imageHeight);
    });

    cursorY += tileHeight + 4;
  }

  return cursorY;
}

async function drawActivitiesSection(doc, {
  title,
  emptyMessage,
  actividades,
  header,
  logoDataUrl,
  startY,
}) {
  let cursorY = ensureSpace(doc, startY, 12, header, logoDataUrl);
  drawSectionTitle(doc, title, cursorY);
  cursorY += 12;

  if (!actividades.length) {
    autoTable(doc, {
      startY: cursorY,
      margin: { top: CONTENT_TOP, left: MARGIN_X, right: MARGIN_X },
      body: [[emptyMessage]],
      theme: "grid",
      styles: {
        font: FONT_FAMILY,
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
    return doc.lastAutoTable.finalY + 8;
  }

  for (const [index, actividad] of actividades.entries()) {
    cursorY = ensureSpace(doc, cursorY, 18, header, logoDataUrl);
    drawSectionTitle(doc, `ACTIVIDAD ${index + 1}`, cursorY);
    cursorY += 10;

    autoTable(doc, {
      startY: cursorY,
      margin: { top: CONTENT_TOP, left: MARGIN_X, right: MARGIN_X },
      body: buildActivityInfoRows(actividad),
      theme: "grid",
      styles: {
        font: FONT_FAMILY,
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
        font: FONT_FAMILY,
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

    cursorY = await drawEvidenceImages(
      doc,
      actividad.evidencias,
      doc.lastAutoTable.finalY + 5,
      header,
      logoDataUrl
    );
    cursorY += 4;
  }

  return cursorY;
}

export async function generateTrabajoResumenPdf({
  trabajo,
  maquinariaLabel,
  tecnicosLabel,
  actividades = [],
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
      font: FONT_FAMILY,
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

  await drawActivitiesSection(doc, {
    title: "ACTIVIDADES REGISTRADAS",
    emptyMessage: "No hay actividades registradas para esta orden finalizada.",
    actividades,
    header,
    logoDataUrl,
    startY: doc.lastAutoTable.finalY + 6,
  });

  doc.save(`Resumen-${safeText(trabajo.codigo_orden, "OT")}.pdf`);
}
