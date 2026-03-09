// app/(private)/dashboard/admin/page.jsx
"use client";

/*
  Dashboard ADMIN — Peruvian Group Fredal
  KPIs Gerenciales (hoja "KPIs Gerenciales" · Indicadores_fredal.xlsx):
  1. Cumplimiento del plan de almacén   → > 85%
  2. Costo promedio por OT              → tendencia decreciente
  3. % stock disponible vs comprometido → > 30% libre
  4. MTBF por máquina                  → tendencia creciente
  5. Exactitud del plan de almacén     → > 75%

  ⚠️  Sin <PageWrapper> — el padding lo gestiona PrivateLayout <main p-4 md:p-6>
*/

import { useState, useEffect } from "react";
import {
  trabajoAPI, itemAPI, maquinariaAPI,
  trabajadorAPI, actividadTrabajoAPI,
  compraAPI, tipoCambioAPI,
} from "@/lib/api";
import {
  DashboardStyles, AreaBanner, SectionTitle,
  StatCard, Card, Grid, DataTable,
  DonutChart, VerticalBarChart, HorizontalBarChart,
  Gauge, StatusBadge, ObjetivoBadge,
  Divider, Skeleton, Icon, C,
} from "@/components/dashboard/DashboardShared";

const PEN = (n) =>
  "S/ " + Number(n ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function calcMTBF(trabajos, actividades) {
  const corrPorMaq = {};
  actividades
    .filter(a => !a.es_planificada && a.tipo_mantenimiento === "CORRECTIVO")
    .forEach(a => {
      const ot = trabajos.find(t => t.id === a.orden);
      if (!ot) return;
      const k = ot.maquinaria_nombre ?? String(ot.maquinaria ?? "?");
      if (!corrPorMaq[k]) corrPorMaq[k] = [];
      corrPorMaq[k].push(new Date(ot.fecha));
    });
  return Object.entries(corrPorMaq)
    .filter(([, f]) => f.length >= 2)
    .map(([maquina, fechas]) => {
      fechas.sort((a, b) => a - b);
      let t = 0;
      for (let i = 1; i < fechas.length; i++) t += (fechas[i] - fechas[i-1]) / 86400000;
      return { maquina, mtbf: Math.round(t / (fechas.length - 1)) };
    })
    .sort((a, b) => a.mtbf - b.mtbf);
}

export default function AdminDashboard() {
  const [loading, setLoading]         = useState(true);
  const [trabajos, setTrabajos]       = useState([]);
  const [items, setItems]             = useState([]);
  const [maquinarias, setMaquinarias] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [compras, setCompras]         = useState([]);
  const [tipoCambio, setTipoCambio]   = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [tjs, its, mqs, trs, cs, tc] = await Promise.all([
          trabajoAPI.list({ page_size: 200 }).then(r => r.data?.results ?? r.data ?? []),
          itemAPI.list({ page_size: 200 }).then(r => r.data?.results ?? r.data ?? []),
          maquinariaAPI.list().then(r => r.data?.results ?? r.data ?? []),
          trabajadorAPI.list().then(r => r.data?.results ?? r.data ?? []),
          compraAPI.list({ page_size: 200 }).then(r => r.data?.results ?? r.data ?? []),
          tipoCambioAPI.list({ page_size: 1 }).then(r => (r.data?.results ?? r.data ?? [])[0] ?? null),
        ]);
        setTrabajos(tjs); setItems(its); setMaquinarias(mqs);
        setTrabajadores(trs); setCompras(cs); setTipoCambio(tc);
        const acts = await Promise.all(
          tjs.slice(0, 50).map(t =>
            actividadTrabajoAPI.listByTrabajo(t.id)
              .then(r => r.data?.results ?? r.data ?? []).catch(() => [])
          )
        );
        setActividades(acts.flat());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  /* KPI 1 — cumplimiento */
  const otConPlan = [...new Set(actividades.filter(a => a.es_planificada).map(a => a.orden))];
  const cumplidas = otConPlan.filter(id => actividades.some(a => !a.es_planificada && a.orden === id)).length;
  const tasaCumpl = otConPlan.length ? Math.round((cumplidas / otConPlan.length) * 100) : null;

  /* KPI 2 — costo por OT */
  const tcUSD = Number(tipoCambio?.compra_usd ?? 3.7);
  const tcEUR = Number(tipoCambio?.compra_eur ?? 4.0);
  const toPEN = (m, mon) => mon === "USD" ? m * tcUSD : mon === "EUR" ? m * tcEUR : m;
  let gastoTotal = 0;
  compras.forEach(c => (c.detalles ?? []).forEach(d => {
    gastoTotal += toPEN(Number(d.valor_unitario ?? 0) * Number(d.cantidad ?? 0) * 1.18, c.moneda);
  }));
  const otFin = trabajos.filter(t => t.estatus === "FINALIZADO");
  const costoOT = otFin.length ? gastoTotal / otFin.length : null;

  /* KPI 3 — stock libre */
  const otsPend = new Set(trabajos.filter(t => t.estatus !== "FINALIZADO").map(t => t.id));
  const planPend = actividades.filter(a => a.es_planificada && otsPend.has(a.orden)).length;
  const totalPlan = actividades.filter(a => a.es_planificada).length || 1;
  const pctLibre = Math.max(0, Math.round(((totalPlan - planPend) / totalPlan) * 100));

  /* KPI 4 — MTBF */
  const mtbfRows = calcMTBF(trabajos, actividades);
  const avgMTBF  = mtbfRows.length ? Math.round(mtbfRows.reduce((s, r) => s + r.mtbf, 0) / mtbfRows.length) : null;

  /* KPI 5 — exactitud */
  const actsPlan   = actividades.filter(a => a.es_planificada);
  const actsReales = actividades.filter(a => !a.es_planificada);
  const coinciden  = actsReales.filter(a =>
    actsPlan.some(p => p.orden === a.orden && p.tipo_mantenimiento === a.tipo_mantenimiento)
  ).length;
  const exactitud  = actsPlan.length ? Math.round((coinciden / actsPlan.length) * 100) : null;

  /* Distribución tipos mantenimiento */
  const actsM = actsReales.filter(a => a.tipo_actividad === "MANTENIMIENTO");
  const corr  = actsM.filter(a => a.tipo_mantenimiento === "CORRECTIVO").length;
  const prev  = actsM.filter(a => a.tipo_mantenimiento === "PREVENTIVO").length;
  const pred  = actsM.filter(a => a.tipo_mantenimiento === "PREDICTIVO").length;
  const pctCorr = actsM.length ? Math.round((corr / actsM.length) * 100) : 0;

  /* Top maquinaria */
  const maqCount = {};
  trabajos.forEach(t => { const k = t.maquinaria_nombre ?? String(t.maquinaria ?? "—"); maqCount[k] = (maqCount[k] || 0) + 1; });
  const topMaq = Object.entries(maqCount).sort((a,b) => b[1]-a[1]).slice(0,6).map(([label,value]) => ({ label: label.split(" ")[0], value }));

  /* Gasto mensual */
  const mesesGasto = (() => {
    const m = {}; const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      m[k] = { label: d.toLocaleString("es-PE",{ month:"short" }).toUpperCase(), value: 0 };
    }
    compras.forEach(c => {
      const k = (c.fecha ?? "").slice(0,7);
      if (m[k]) (c.detalles ?? []).forEach(d => { m[k].value += Number(d.valor_unitario??0)*Number(d.cantidad??0); });
    });
    return Object.values(m).map(x => ({ ...x, value: Math.round(x.value) }));
  })();

  return (
    <>
      <DashboardStyles />
      <AreaBanner
        iconName="dashboard"
        area="Panel General — Administración"
        description="Vista ejecutiva cruzada · Todas las áreas operativas"
      />

      {/* ── KPIs GERENCIALES ── */}
      <SectionTitle
        title="KPIs Gerenciales"
        subtitle="Indicadores de alto nivel · Fuente: Indicadores_fredal.xlsx — Hoja KPIs Gerenciales"
        iconName="chartBar"
      />
      <Grid cols={5} gap={14} style={{ marginBottom: 22 }}>

        <Card>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, marginBottom: 10 }}>
            Cumplimiento del Plan
          </div>
          <Gauge value={tasaCumpl} label="OTs cumplidas" thresholds={{ ok: 85, warn: 60 }} loading={loading} />
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <ObjetivoBadge>≥ 85%</ObjetivoBadge>
          </div>
        </Card>

        <StatCard
          label="Costo Promedio por OT"
          value={costoOT !== null ? PEN(costoOT) : "—"}
          sub={`Con IGV · PEN · TC USD ${tcUSD}`}
          iconName="cash" accent="navy" loading={loading}
          alert={{ level: "info", text: "Objetivo: tendencia decreciente" }}
        />

        <Card>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, marginBottom: 10 }}>
            Stock Libre vs Comprometido
          </div>
          <Gauge value={pctLibre} label="stock libre" thresholds={{ ok: 30, warn: 15 }} loading={loading} />
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <ObjetivoBadge>&gt; 30% libre</ObjetivoBadge>
          </div>
        </Card>

        <StatCard
          label="MTBF Promedio"
          value={avgMTBF !== null ? `${avgMTBF} días` : "—"}
          sub="Días entre fallos correctivos"
          iconName="pulse"
          accent={avgMTBF && avgMTBF > 30 ? "lime" : "amber"}
          loading={loading}
          alert={{ level: "info", text: "Objetivo: tendencia creciente" }}
        />

        <Card>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, marginBottom: 10 }}>
            Exactitud del Plan
          </div>
          <Gauge value={exactitud} label="coincidencia" thresholds={{ ok: 75, warn: 50 }} loading={loading} />
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <ObjetivoBadge>≥ 75%</ObjetivoBadge>
          </div>
        </Card>
      </Grid>

      <Divider />

      {/* ── RESUMEN OPERATIVO ── */}
      <SectionTitle title="Resumen Operativo" subtitle="Estado actual por área" iconName="clipboard" />
      <Grid cols={4} gap={14} style={{ marginBottom: 22 }}>
        <StatCard label="Total OTs" value={trabajos.length} iconName="clipboard"
          accent="navy" loading={loading}
          sub={`${trabajos.filter(t=>t.estatus==="PENDIENTE").length} pend · ${trabajos.filter(t=>t.estatus==="EN_PROCESO").length} en proceso`}
        />
        <StatCard label="Maquinarias" value={maquinarias.length} iconName="truck" accent="navy" loading={loading} />
        <StatCard label="Trabajadores" value={trabajadores.length} iconName="users" accent="navy" loading={loading} />
        <StatCard label="Ítems en inventario" value={items.length} iconName="cube"
          accent="navy" loading={loading}
          sub={`${items.filter(i=>Number(i.stock)<=0).length} sin stock`}
        />
      </Grid>

      {/* ── GRÁFICOS ── */}
      <Grid cols={3} gap={16} style={{ marginBottom: 22 }}>
        <Card>
          <SectionTitle title="Tipo de Mantenimiento" subtitle="Actividades reales ejecutadas" iconName="cog" />
          <DonutChart loading={loading} segments={[
            { label: "Correctivo",  value: corr, color: C.red   },
            { label: "Preventivo",  value: prev, color: C.lime  },
            { label: "Predictivo",  value: pred, color: C.blue  },
          ]} />
          <div style={{ marginTop: 12 }}>
            <StatusBadge level={pctCorr > 30 ? "danger" : "ok"}>
              Correctivo {pctCorr}% — Obj &lt; 30%
            </StatusBadge>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Maquinaria más Intervenida" subtitle="Por nº de órdenes de trabajo" iconName="truck" />
          <HorizontalBarChart data={topMaq} accent="navy" loading={loading} />
        </Card>

        <Card>
          <SectionTitle title="Gasto Mensual" subtitle="Últimos 6 meses · sin IGV · PEN est." iconName="trendUp" />
          <VerticalBarChart data={mesesGasto} accent="navy" height={130} loading={loading} />
        </Card>
      </Grid>

      {/* ── TABLA MTBF ── */}
      <Card>
        <SectionTitle
          title="MTBF por Máquina"
          subtitle="Días promedio entre OTs correctivas consecutivas · Objetivo: tendencia creciente"
          iconName="pulse"
        />
        <DataTable
          loading={loading}
          columns={[
            { label: "Máquina", key: "maquina" },
            { label: "MTBF (días)", key: "mtbf", align: "center" },
            {
              label: "Estado", key: "mtbf", align: "right",
              render: row => (
                <StatusBadge level={row.mtbf > 30 ? "ok" : row.mtbf > 14 ? "warning" : "danger"}>
                  {row.mtbf > 30 ? "Bueno" : row.mtbf > 14 ? "Atención" : "Crítico"}
                </StatusBadge>
              ),
            },
          ]}
          rows={mtbfRows}
          emptyMsg="Sin suficientes OTs correctivas para calcular MTBF"
        />
      </Card>
    </>
  );
}