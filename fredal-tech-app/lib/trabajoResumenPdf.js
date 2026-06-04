import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from './constants';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const safeText = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const safeFileName = (value) =>
  safeText(value, 'OT')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value);
  return date.toLocaleDateString('es-PE');
};

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_URL.replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

const renderInfoRow = (label, value) => `
  <tr>
    <th>${escapeHtml(label)}</th>
    <td>${escapeHtml(safeText(value))}</td>
  </tr>
`;

const renderMateriales = (actividad) => {
  const repuestos = Array.isArray(actividad.repuestos) ? actividad.repuestos : [];
  const consumibles = Array.isArray(actividad.consumibles) ? actividad.consumibles : [];

  if (!repuestos.length && !consumibles.length) {
    return '<p class="muted">Sin materiales registrados.</p>';
  }

  const repuestosHtml = repuestos
    .map((item) => {
      const serie = item.unidad_serie ? ` - S/N ${item.unidad_serie}` : '';
      return `<li><strong>Repuesto:</strong> ${escapeHtml(safeText(item.item_nombre))}${escapeHtml(serie)}</li>`;
    })
    .join('');

  const consumiblesHtml = consumibles
    .map((item) => {
      const unidad = item.unidad_medida_simbolo || item.unidad_medida_nombre || '';
      const cantidad = item.cantidad ? ` - ${item.cantidad} ${unidad}` : '';
      return `<li><strong>Consumible:</strong> ${escapeHtml(safeText(item.item_nombre))}${escapeHtml(cantidad)}</li>`;
    })
    .join('');

  return `<ul class="materials">${repuestosHtml}${consumiblesHtml}</ul>`;
};

const renderEvidencias = (actividad) => {
  const evidencias = Array.isArray(actividad.evidencias) ? actividad.evidencias : [];
  const images = evidencias
    .map((evidencia) => resolveMediaUrl(evidencia.url))
    .filter(Boolean);

  if (!images.length) return '';

  return `
    <div class="evidence-title">Evidencias adjuntas</div>
    <div class="evidence-grid">
      ${images
        .map(
          (url) => `
            <div class="evidence-cell">
              <img src="${escapeHtml(url)}" />
            </div>
          `
        )
        .join('')}
    </div>
  `;
};

const renderActividad = (actividad, index) => {
  const tipo =
    actividad.tipo_actividad === 'MANTENIMIENTO'
      ? `Mantenimiento - ${safeText(actividad.tipo_mantenimiento)} - ${safeText(actividad.subtipo)}`
      : 'Revision';

  return `
    <section class="activity">
      <div class="activity-header">
        <div>
          <div class="activity-index">Actividad ${index + 1}</div>
          <h3>${escapeHtml(tipo)}</h3>
        </div>
      </div>
      <p class="description">${escapeHtml(safeText(actividad.descripcion, 'Sin descripcion registrada.'))}</p>
      <div class="activity-subtitle">Materiales y movimientos</div>
      ${renderMateriales(actividad)}
      ${renderEvidencias(actividad)}
    </section>
  `;
};

const buildResumenHtml = ({ trabajo, actividades, maquinariaLabel, tecnicosLabel }) => {
  const actividadesRegistradas = (actividades || []).filter((actividad) => !actividad.es_planificada);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { margin: 18mm 14mm; }
          body {
            margin: 0;
            color: #1f2937;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.45;
          }
          .header {
            display: grid;
            grid-template-columns: 86px 1fr 156px;
            align-items: stretch;
            border: 1px solid #1f2937;
            background: #f3f6fb;
            margin: 0 0 16px;
            page-break-inside: avoid;
          }
          .logo {
            min-height: 74px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-right: 1px solid #1f2937;
            font-weight: 800;
            font-size: 20px;
            color: #1e3a8a;
            background: #f3f6fb;
          }
          .title {
            padding: 10px 12px 8px;
            border-right: 1px solid #1f2937;
            background: #f3f6fb;
          }
          .title h1 {
            margin: 0;
            font-size: 15px;
            line-height: 1.25;
            color: #111827;
            text-transform: uppercase;
          }
          .title p {
            margin: 5px 0 0;
            color: #4b5563;
            font-size: 10px;
          }
          .meta {
            display: grid;
            grid-template-columns: 58px 1fr;
            background: #f3f6fb;
          }
          .meta div {
            padding: 6px 7px;
            border-bottom: 1px solid #1f2937;
          }
          .meta div:nth-last-child(-n + 2) {
            border-bottom: 0;
          }
          .meta .label {
            font-weight: 800;
            color: #111827;
          }
          .section {
            margin-top: 14px;
            page-break-inside: avoid;
          }
          .section-title {
            margin: 0 0 7px;
            padding: 7px 9px;
            color: #fff;
            background: #1e3a8a;
            font-size: 12px;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 7px 8px;
            vertical-align: top;
          }
          th {
            width: 28%;
            text-align: left;
            background: #f8fafc;
            color: #374151;
            font-weight: 800;
          }
          .activity {
            margin-top: 12px;
            border: 1px solid #d1d5db;
            page-break-inside: avoid;
          }
          .activity-header {
            padding: 9px 10px;
            background: #f8fafc;
            border-bottom: 1px solid #d1d5db;
          }
          .activity-index {
            color: #64748b;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
          }
          h3 {
            margin: 3px 0 0;
            font-size: 12px;
            color: #111827;
          }
          .description {
            margin: 0;
            padding: 10px;
            white-space: pre-wrap;
          }
          .activity-subtitle,
          .evidence-title {
            margin: 0;
            padding: 8px 10px 4px;
            color: #334155;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .materials {
            margin: 0;
            padding: 0 10px 10px 25px;
          }
          .materials li {
            margin: 3px 0;
          }
          .muted {
            margin: 0;
            padding: 0 10px 10px;
            color: #6b7280;
          }
          .evidence-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            padding: 8px 10px 12px;
            page-break-inside: avoid;
          }
          .evidence-cell {
            height: 170px;
            border: 1px solid #d1d5db;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .evidence-cell img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .empty {
            padding: 12px;
            border: 1px solid #d1d5db;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <header class="header">
          <div class="logo">F</div>
          <div class="title">
            <h1>Resumen de orden de trabajo</h1>
            <p>Registro operativo generado desde Fredal Tech</p>
          </div>
          <div class="meta">
            <div class="label">CÓDIGO:</div><div>${escapeHtml(safeText(trabajo.codigo_orden))}</div>
            <div class="label">VERSIÓN:</div><div>01</div>
            <div class="label">VIGENTE:</div><div>${escapeHtml(formatDate(new Date()))}</div>
          </div>
        </header>

        <section class="section">
          <h2 class="section-title">Datos generales</h2>
          <table>
            ${renderInfoRow('Orden de trabajo', trabajo.codigo_orden)}
            ${renderInfoRow('Fecha', formatDate(trabajo.fecha))}
            ${renderInfoRow('Estado', trabajo.estatus)}
            ${renderInfoRow('Prioridad', trabajo.prioridad)}
            ${renderInfoRow('Lugar', trabajo.lugar)}
            ${renderInfoRow('Maquinaria', maquinariaLabel)}
            ${renderInfoRow('Ubicacion', trabajo.ubicacion_detalle)}
            ${renderInfoRow('Tecnicos asignados', tecnicosLabel)}
            ${renderInfoRow('Observaciones', trabajo.observaciones)}
          </table>
        </section>

        <section class="section">
          <h2 class="section-title">Cierre operativo</h2>
          <table>
            ${renderInfoRow('Hora de inicio', trabajo.hora_inicio)}
            ${renderInfoRow('Hora de fin', trabajo.hora_fin)}
            ${renderInfoRow('Horometro', trabajo.horometro)}
            ${renderInfoRow('Estado del equipo', trabajo.estado_equipo)}
          </table>
        </section>

        <section class="section">
          <h2 class="section-title">Actividades registradas</h2>
          ${
            actividadesRegistradas.length
              ? actividadesRegistradas.map(renderActividad).join('')
              : '<div class="empty">No hay actividades registradas para esta orden.</div>'
          }
        </section>
      </body>
    </html>
  `;
};

export async function generateTrabajoResumenPdfMobile({
  trabajo,
  actividades,
  maquinariaLabel,
  tecnicosLabel,
}) {
  const html = buildResumenHtml({ trabajo, actividades, maquinariaLabel, tecnicosLabel });
  const result = await Print.printToFileAsync({ html });
  const fileName = `Resumen-${safeFileName(trabajo?.codigo_orden)}.pdf`;
  const targetUri = FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}${fileName}`
    : null;
  let sharedUri = result.uri;

  try {
    if (!targetUri) throw new Error('No document directory available');
    await FileSystem.copyAsync({ from: result.uri, to: targetUri });
    sharedUri = targetUri;
  } catch {
    // Si el sistema no permite copiar el temporal, se comparte el URI generado por Print.
  }

  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    await Print.printAsync({ uri: result.uri });
    return;
  }

  await Sharing.shareAsync(sharedUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Descargar resumen de orden de trabajo',
    UTI: 'com.adobe.pdf',
  });
}
