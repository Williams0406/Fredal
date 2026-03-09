// components/dashboard/DashboardShared.jsx
"use client";

/*
  Design System — Peruvian Group Fredal
  Guía UI/UX: Inter · Azul Marino #1E3A5F (60%) · Gris Neutro (30%) · Verde Lima #6DBE45 (10%)
  Cards: fondo blanco · borde #E5E7EB · radius 12px · shadow-sm

  ⚠️  NO modifica body, html, margin ni padding globales.
      El <main> del PrivateLayout (p-4 md:p-6, bg-gray-50) gestiona el espacio exterior.
      Estos componentes sólo aportan estilos internos propios.
*/

/* ── TOKENS ─────────────────────────────────────────────────────── */
export const C = {
  navy:        "#1E3A5F",
  navyLight:   "#2B527A",
  navyHover:   "#F0F5FA",
  lime:        "#6DBE45",
  limeLight:   "#EBF7E3",
  limeBorder:  "#B8E6A0",
  gray700:     "#374151",
  gray500:     "#6B7280",
  gray400:     "#9CA3AF",
  gray300:     "#D1D5DB",
  gray200:     "#E5E7EB",
  gray100:     "#F9FAFB",
  white:       "#FFFFFF",
  red:         "#DC2626",
  redLight:    "#FEF2F2",
  redBorder:   "#FECACA",
  amber:       "#D97706",
  amberLight:  "#FFFBEB",
  amberBorder: "#FCD34D",
  blue:        "#2563EB",
  blueLight:   "#EFF6FF",
  blueBorder:  "#BFDBFE",
};

const SHADOW    = "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)";
const SHADOW_MD = "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)";
const R12 = 12;

/* ── KEYFRAMES ONLY — sin reset de body ─────────────────────────── */
export function DashboardStyles() {
  return (
    <style>{`
      @keyframes fredal-shimmer {
        0%   { background-position: -600px 0; }
        100% { background-position:  600px 0; }
      }
      @keyframes fredal-in {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0);   }
      }
      .fredal-card { animation: fredal-in 0.2s ease forwards; }
      .fredal-tr:hover td { background: ${C.navyHover}; }
    `}</style>
  );
}

/* ── SVG ICONS  (Heroicons outline 24 px) ───────────────────────── */
/*
  Cada entrada es un string de una o más rutas SVG separadas por " |".
  El componente Icon las divide y renderiza como <path> individuales.
*/
const ICONS = {
  // OTs / trabajo
  clipboard:    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  // Pendiente
  clock:        "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  // En proceso
  cog:          "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z | M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  // Finalizado
  checkCircle:  "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  // Tiempo
  stopwatch:    "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  // Maquinaria / excavadora — combinación de rectángulos
  truck:        "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z | M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0",
  // Trabajadores
  users:        "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  // Inventario total
  cube:         "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  // Stock / almacén
  archive:      "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  // Alerta stock
  exclamation:  "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  // Compras / carrito
  cart:         "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
  // Gasto / dinero
  cash:         "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  // Proveedor
  office:       "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  // Factura
  document:     "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  // Gráfico barras
  chartBar:     "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  // Tendencia
  trendUp:      "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  // Objetivo / diana
  target:       "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  // Rotación
  refresh:      "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  // Precio / etiqueta
  tag:          "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z",
  // Sin proveedor
  userRemove:   "M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6",
  // Sin movimiento
  ban:          "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  // MTBF / pulso
  pulse:        "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3",
  // Dashboard / grid
  dashboard:    "M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zm10 0a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z",
  // Desviación / escala
  scale:        "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
  // Plan / calendar
  calendar:     "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  // Sin OT / prohibido
  noSymbol:     "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
};

export function Icon({ name, size = 20, color = C.navy, strokeWidth = 1.8 }) {
  const raw = ICONS[name];
  if (!raw) return null;
  const paths = raw.split(" | ");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: "block" }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/* ── SECTION TITLE ──────────────────────────────────────────────── */
export function SectionTitle({ title, subtitle, iconName }) {
  return (
    <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
      {iconName && (
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: C.navyHover,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon name={iconName} size={15} color={C.navy} />
        </div>
      )}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: C.navy, lineHeight: 1.3 }}>{title}</h2>
        {subtitle && (
          <p style={{ fontSize: 11, color: C.gray500, marginTop: 1, lineHeight: 1.4 }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/* ── AREA BANNER  (reemplaza PageWrapper — no agrega padding exterior) ── */
export function AreaBanner({ iconName, area, description }) {
  return (
    <div style={{
      background: C.navy, borderRadius: R12,
      padding: "16px 22px", marginBottom: 22,
      display: "flex", alignItems: "center", gap: 16,
      boxShadow: SHADOW_MD,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: "rgba(255,255,255,0.13)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon name={iconName} size={21} color="#FFFFFF" strokeWidth={1.6} />
      </div>
      <div>
        <div style={{
          fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)",
          letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2,
        }}>
          Peruvian Group Fredal
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.white, lineHeight: 1.2 }}>{area}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>{description}</div>
      </div>
    </div>
  );
}

/* ── CARD ────────────────────────────────────────────────────────── */
export function Card({ children, style = {} }) {
  return (
    <div className="fredal-card" style={{
      background: C.white, border: `1px solid ${C.gray200}`,
      borderRadius: R12, boxShadow: SHADOW, padding: "18px 20px", ...style,
    }}>
      {children}
    </div>
  );
}

/* ── STAT CARD ───────────────────────────────────────────────────── */
const AM = {
  navy:  { bar: C.navy,  val: C.navy,    iconBg: C.navyHover,  ic: C.navy    },
  lime:  { bar: C.lime,  val: "#3D7A20", iconBg: C.limeLight,  ic: "#3D7A20" },
  red:   { bar: C.red,   val: C.red,     iconBg: C.redLight,   ic: C.red     },
  amber: { bar: C.amber, val: C.amber,   iconBg: C.amberLight, ic: C.amber   },
  blue:  { bar: C.blue,  val: C.blue,    iconBg: C.blueLight,  ic: C.blue    },
};

export function StatCard({ label, value, sub, iconName, accent = "navy", alert, loading }) {
  const a = AM[accent] ?? AM.navy;
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.gray200}`,
      borderRadius: R12, borderTop: `3px solid ${a.bar}`,
      boxShadow: SHADOW, padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: C.gray500, lineHeight: 1.3 }}>{label}</span>
        {iconName && (
          <div style={{
            width: 30, height: 30, borderRadius: 7, background: a.iconBg,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon name={iconName} size={15} color={a.ic} />
          </div>
        )}
      </div>
      {loading
        ? <Skeleton height={28} width="52%" />
        : <div style={{ fontSize: 24, fontWeight: 700, color: a.val, lineHeight: 1.1 }}>{value ?? "—"}</div>
      }
      {sub && !loading && <span style={{ fontSize: 11, color: C.gray500 }}>{sub}</span>}
      {alert && !loading && (
        <div style={{ marginTop: 2 }}>
          <StatusBadge level={alert.level}>{alert.text}</StatusBadge>
        </div>
      )}
    </div>
  );
}

/* ── STATUS BADGE ────────────────────────────────────────────────── */
export function StatusBadge({ level = "info", children }) {
  const M = {
    ok:      { bg: C.limeLight,  border: C.limeBorder,  color: "#3D7A20" },
    warning: { bg: C.amberLight, border: C.amberBorder, color: C.amber   },
    danger:  { bg: C.redLight,   border: C.redBorder,   color: C.red     },
    info:    { bg: C.blueLight,  border: C.blueBorder,  color: C.blue    },
    neutral: { bg: C.gray100,    border: C.gray300,     color: C.gray500 },
  };
  const s = M[level] ?? M.info;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 11, fontWeight: 500,
      padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {children}
    </span>
  );
}

/* ── OBJETIVO BADGE ──────────────────────────────────────────────── */
export function ObjetivoBadge({ children }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: C.limeLight, border: `1px solid ${C.limeBorder}`,
      borderRadius: 8, padding: "4px 10px",
      fontSize: 11, fontWeight: 500, color: "#3D7A20",
    }}>
      <Icon name="target" size={11} color="#3D7A20" />
      {children}
    </div>
  );
}

/* ── SKELETON ────────────────────────────────────────────────────── */
export function Skeleton({ height = 16, width = "100%", radius = 6 }) {
  return (
    <div style={{
      height, width, borderRadius: radius,
      background: `linear-gradient(90deg,${C.gray200} 25%,${C.gray100} 50%,${C.gray200} 75%)`,
      backgroundSize: "600px 100%",
      animation: "fredal-shimmer 1.4s infinite linear",
    }} />
  );
}

/* ── PROGRESS BAR ────────────────────────────────────────────────── */
export function ProgressBar({ value, max = 100, accent = "navy" }) {
  const pct   = Math.min(100, Math.round((value / (max || 1)) * 100));
  const color = { lime: C.lime, red: C.red, amber: C.amber }[accent] ?? C.navy;
  return (
    <div style={{ width: "100%", height: 6, background: C.gray200, borderRadius: 99 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
    </div>
  );
}

/* ── DATA TABLE ──────────────────────────────────────────────────── */
export function DataTable({ columns, rows, loading, emptyMsg = "Sin datos disponibles" }) {
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[1,2,3,4,5].map(i => <Skeleton key={i} height={36} radius={6} />)}
    </div>
  );
  if (!rows?.length) return (
    <div style={{ textAlign: "center", padding: "28px 0", fontSize: 13, color: C.gray500 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Icon name="document" size={26} color={C.gray300} />
        {emptyMsg}
      </div>
    </div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.gray100 }}>
            {columns.map((col, i) => (
              <th key={i} style={{
                padding: "9px 13px", textAlign: col.align || "left",
                fontSize: 10, fontWeight: 600, color: C.gray500,
                textTransform: "uppercase", letterSpacing: "0.05em",
                borderBottom: `1px solid ${C.gray200}`, whiteSpace: "nowrap",
              }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="fredal-tr"
              style={{ borderBottom: `1px solid ${C.gray200}`, transition: "background 0.1s" }}>
              {columns.map((col, ci) => (
                <td key={ci} style={{
                  padding: "10px 13px", textAlign: col.align || "left",
                  color: C.gray700, verticalAlign: "middle",
                }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── HORIZONTAL BAR CHART ────────────────────────────────────────── */
export function HorizontalBarChart({ data = [], accent = "navy", loading }) {
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[1,2,3,4].map(i => <Skeleton key={i} height={24} />)}
    </div>
  );
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.gray700, fontWeight: 500 }}>{d.label}</span>
            <span style={{ fontSize: 12, color: C.gray500, fontWeight: 600 }}>{d.value}</span>
          </div>
          <ProgressBar value={d.value} max={max} accent={accent} />
        </div>
      ))}
    </div>
  );
}

/* ── VERTICAL BAR CHART ──────────────────────────────────────────── */
export function VerticalBarChart({ data = [], accent = "navy", height = 120, loading }) {
  if (loading) return <Skeleton height={height} />;
  const max   = Math.max(...data.map(d => d.value), 1);
  const color = { lime: C.lime, blue: C.blue }[accent] ?? C.navy;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height, paddingTop: 8 }}>
      {data.map((d, i) => {
        const bh = Math.max(2, (d.value / max) * (height - 28));
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: C.gray500 }}>{d.value > 0 ? d.value : ""}</span>
            <div style={{ width: "100%", height: bh, background: color, opacity: 0.85, borderRadius: "3px 3px 0 0", transition: "height 0.4s ease" }} />
            <span style={{ fontSize: 8, color: C.gray500, textAlign: "center", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "100%" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── DONUT CHART ─────────────────────────────────────────────────── */
export function DonutChart({ segments = [], size = 126, loading }) {
  if (loading) return <Skeleton height={size} width={size} radius={size / 2} />;
  const r = 43, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  const total = segments.reduce((s, d) => s + (d.value || 0), 0) || 1;
  let offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.gray200} strokeWidth={11} />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth={11}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset} transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dasharray 0.5s ease" }} />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 3} textAnchor="middle"
          fill={C.navy} fontFamily="Inter,sans-serif" fontSize={16} fontWeight="700">{total}</text>
        <text x={cx} y={cy + 11} textAnchor="middle"
          fill={C.gray500} fontFamily="Inter,sans-serif" fontSize={7} letterSpacing="1">TOTAL</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.gray700 }}>
              {seg.label} <strong style={{ color: C.navy }}>{seg.value}</strong>
              <span style={{ color: C.gray500, marginLeft: 3, fontSize: 11 }}>
                ({Math.round((seg.value / total) * 100)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── GAUGE (semicírculo SVG) ─────────────────────────────────────── */
export function Gauge({ value, label, thresholds = { ok: 75, warn: 50 }, loading }) {
  if (loading) return <Skeleton height={76} />;
  const pct   = Math.min(100, Math.max(0, value ?? 0));
  const color = pct >= thresholds.ok ? C.lime : pct >= thresholds.warn ? C.amber : C.red;
  const R = 48, cx = 66, cy = 66, circ = Math.PI * R, dash = (pct / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={132} height={74} viewBox="0 0 132 74">
        <path d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`}
          fill="none" stroke={C.gray200} strokeWidth={10} strokeLinecap="round" />
        <path d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`}
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ-dash}`}
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.3s" }} />
        <text x={cx} y={cy-8} textAnchor="middle"
          fill={C.navy} fontFamily="Inter,sans-serif" fontSize={18} fontWeight="700">{pct}%</text>
        <text x={cx} y={cy+7} textAnchor="middle"
          fill={C.gray500} fontFamily="Inter,sans-serif" fontSize={7.5}>{label}</text>
      </svg>
    </div>
  );
}

/* ── DIVIDER ─────────────────────────────────────────────────────── */
export function Divider() {
  return <div style={{ height: 1, background: C.gray200, margin: "18px 0" }} />;
}

/* ── GRID ────────────────────────────────────────────────────────── */
export function Grid({ cols = 4, gap = 16, children, style = {} }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, ...style }}>
      {children}
    </div>
  );
}