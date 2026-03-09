// app/(private)/dashboard/mantenimiento/page.jsx
"use client";

/*
  Dashboard MANTENIMIENTO — Peruvian Group Fredal
  Métricas operativas (hoja "Mantenimiento" · Indicadores_fredal.xlsx):
    1. OTs por estado
    2. Distribución por tipo de mantenimiento
    3. Maquinaria más intervenida
    4. Centro de costos por maquinaria
    5. Tiempo promedio de resolución

  Indicadores de decisión:
    1. Tasa de cumplimiento del plan    → ≥ 85%
    2. Desviación plan vs usados       → < 15%
    3. Actividades reales sin plan     → < 20%
    4. Ratio correctivo vs preventivo  → < 30% por máquina
    5. Máquinas sin OT en > 90 días   → 0

  ⚠️  Sin <PageWrapper> — padding gestionado por PrivateLayout.
*/

import { useState, useEffect } from "react";
import { trabajoAPI, actividadTrabajoAPI, maquinariaAPI } from "@/lib/api";
import {
  DashboardStyles, AreaBanner, SectionTitle,
  StatCard, Card, Grid, DataTable,
  DonutChart, HorizontalBarChart, Gauge,
  StatusBadge, ObjetivoBadge, Divider,
  ProgressBar, Skeleton, Icon, C,
} from "@/components/dashboard/DashboardShared";

function durMin(ot) {
  if (!ot.hora_inicio || !ot.hora_fin) return null;
  const [h1, m1] = ot.hora_inicio.split(":").map(Number);
  const [h2, m2] = ot.hora_fin.split(":").map(Number);
  const d = h2 * 60 + m2 - (h1 * 60 + m1);
  return d > 0 ? d : null;
}

const PRIO_LEVEL = { EMERGENCIA: "danger", URGENTE: "warning", REGULAR: "neutral" };

export default function MantenimientoDashboard() {
  const [loading, setLoading]         = useState(true);
  const [trabajos, setTrabajos]       = useState([]);
  const [maquinarias, setMaquinarias] = useState([]);
  const [actividades, setActividades] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [tjs, mqs] = await Promise.all([
          trabajoAPI.list({ page_size: 300 }).then(r => r.data?.results ?? r.data ?? []),
          maquinariaAPI.list().then(r => r.data?.results ?? r.data ?? []),
        ]);
        setTrabajos(tjs); setMaquinarias(mqs);
        const acts = await Promise.all(
          tjs.slice(0, 60).map(t =>
            actividadTrabajoAPI.listByTrabajo(t.id)
              .then(r => r.data?.results ?? r.data ?? []).catch(() => [])
          )
        );
        setActividades(acts.flat());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  /* — particiones base — */
  const otPend = trabajos.filter(t => t.estatus === "PENDIENTE");
  const otProc = trabajos.filter(t => t.estatus === "EN_PROCESO");
  const otFin  = trabajos.filter(t => t.estatus === "FINALIZADO");

  /* — Métrica 5: tiempo promedio — */
  const durs   = otFin.map(durMin).filter(Boolean);
  const avgMin = durs.length ? Math.round(durs.reduce((a,b) => a+b, 0) / durs.length) : null;
  const avgLabel = avgMin ? `${Math.floor(avgMin/60)}h ${avgMin%60}m` : "—";

  /* — Tipos mantenimiento — */
  const actsReales = actividades.filter(a => !a.es_planificada && a.tipo_actividad === "MANTENIMIENTO");
  const corr = actsReales.filter(a => a.tipo_mantenimiento === "CORRECTIVO").length;
  const prev = actsReales.filter(a => a.tipo_mantenimiento === "PREVENTIVO").length;
  const pred = actsReales.filter(a => a.tipo_mantenimiento === "PREDICTIVO").length;
  const pctCorr = actsReales.length ? Math.round((corr / actsReales.length) * 100) : 0;

  /* — Top maquinaria — */
  const maqCount = {};
  trabajos.forEach(t => { const k = t.maquinaria_nombre ?? String(t.maquinaria ?? "—"); maqCount[k] = (maqCount[k]||0)+1; });
  const topMaqBars = Object.entries(maqCount).sort((a,b) => b[1]-a[1]).slice(0,6)
    .map(([label,value]) => ({ label: label.split(" ")[0], value }));

  /* — Ind 1: Cumplimiento — */
  const otConPlan  = [...new Set(actividades.filter(a => a.es_planificada).map(a => a.orden))];
  const cumplidas  = otConPlan.filter(id => actividades.some(a => !a.es_planificada && a.orden === id)).length;
  const tasaCumpl  = otConPlan.length ? Math.round((cumplidas / otConPlan.length) * 100) : null;
  const otConPlanSet = new Set(otConPlan);

  /* — Ind 3: Sin plan previo — */
  const actsSinPlan = actsReales.filter(a => !otConPlanSet.has(a.orden));
  const pctSinPlan  = actsReales.length ? Math.round((actsSinPlan.length / actsReales.length) * 100) : 0;

  /* — Ind 2: Desviación plan vs real — */
  const actsPlan = actividades.filter(a => a.es_planificada);
  const desvRows = trabajos
    .filter(t => otConPlanSet.has(t.id)).slice(0, 10)
    .map(t => {
      const plan = actividades.filter(a => a.es_planificada  && a.orden === t.id).length;
      const real = actividades.filter(a => !a.es_planificada && a.orden === t.id).length;
      const desv = plan > 0 ? Math.round(Math.abs(real - plan) / plan * 100) : null;
      return {
        ot: t.codigo_orden,
        maquina: (t.maquinaria_nombre ?? String(t.maquinaria ?? "—")).split(" ").slice(0,2).join(" "),
        estatus: t.estatus, plan, real, desv,
      };
    });

  /* — Ind 4: Ratio correctivo por máquina — */
  const maqRatioRows = Object.entries(maqCount)
    .sort((a,b) => b[1]-a[1]).slice(0,10)
    .map(([nombre, totalOTs]) => {
      const ids  = trabajos.filter(t => (t.maquinaria_nombre ?? String(t.maquinaria)) === nombre).map(t => t.id);
      const corrM = actsReales.filter(a => a.tipo_mantenimiento === "CORRECTIVO" && ids.includes(a.orden)).length;
      const pct   = ids.length ? Math.round((corrM / ids.length) * 100) : 0;
      return { nombre: nombre.substring(0,28), totalOTs, correctivo: pct };
    });

  /* — Ind 5: Máquinas sin OT > 90 días — */
  const hoy = new Date();
  const maqSinOT = maquinarias.filter(m => {
    const otsM = trabajos.filter(t => t.maquinaria === m.id).sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
    if (!otsM.length) return true;
    return (hoy - new Date(otsM[0].fecha)) / 86400000 > 90;
  });

  /* — OTs abiertas por prioridad — */
  const PRIO_ORD = { EMERGENCIA: 0, URGENTE: 1, REGULAR: 2 };
  const otAbiertas = [...otPend, ...otProc]
    .sort((a,b) => (PRIO_ORD[a.prioridad]??9) - (PRIO_ORD[b.prioridad]??9))
    .slice(0, 12)
    .map(t => ({
      ot: t.codigo_orden,
      maquina: (t.maquinaria_nombre ?? String(t.maquinaria ?? "—")).split(" ").slice(0,2).join(" "),
      prioridad: t.prioridad, estatus: t.estatus, lugar: t.lugar, fecha: t.fecha,
    }));

  return (
    <>
      <DashboardStyles />
      <AreaBanner
        iconName="wrench"
        area="Mantenimiento"
        description="Órdenes de trabajo · Actividades planificadas vs reales · Estado de maquinaria"
      />

      {/* ── MÉTRICAS OPERATIVAS ── */}
      <SectionTitle title="Métricas Operativas" subtitle="¿Qué está pasando? — Estado actual de OTs" iconName="clipboard" />
      <Grid cols={5} gap={14} style={{ marginBottom: 22 }}>
        <StatCard label="Total OTs"   value={trabajos.length}  iconName="clipboard"  accent="navy" loading={loading} />
        <StatCard label="Pendientes"  value={otPend.length}    iconName="clock"
          accent={otPend.length > 5 ? "amber" : "navy"} loading={loading} />
        <StatCard label="En Proceso"  value={otProc.length}    iconName="cog"        accent="navy" loading={loading} />
        <StatCard label="Finalizadas" value={otFin.length}     iconName="checkCircle" accent="lime" loading={loading} />
        <StatCard label="Tiempo Promedio" value={loading ? null : avgLabel}
          iconName="stopwatch" accent="navy" loading={loading} sub="Por OT finalizada" />
      </Grid>

      {/* ── GRÁFICOS ── */}
      <Grid cols={3} gap={16} style={{ marginBottom: 22 }}>
        <Card>
          <SectionTitle title="Tipo de Mantenimiento"
            subtitle="Actividades reales (es_planificada=False)" iconName="cog" />
          <DonutChart loading={loading} segments={[
            { label: "Correctivo",  value: corr, color: C.red  },
            { label: "Preventivo",  value: prev, color: C.lime },
            { label: "Predictivo",  value: pred, color: C.blue },
          ]} />
          <div style={{ marginTop: 12 }}>
            <StatusBadge level={pctCorr > 30 ? "danger" : "ok"}>
              Correctivo {pctCorr}% — Obj &lt; 30%
            </StatusBadge>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Maquinaria más Intervenida"
            subtitle="Por nº de órdenes de trabajo" iconName="truck" />
          <HorizontalBarChart data={topMaqBars} accent="navy" loading={loading} />
        </Card>

        <Card>
          <SectionTitle title="Actividades sin Plan Previo"
            subtitle="Trabajos imprevistos no anticipados por almacén" iconName="exclamation" />
          {loading ? <Skeleton height={80} /> : (
            <>
              <div style={{ fontSize: 38, fontWeight: 700,
                color: pctSinPlan > 20 ? C.red : C.lime, lineHeight: 1, marginBottom: 6 }}>
                {pctSinPlan}<span style={{ fontSize: 16, color: C.gray500 }}>%</span>
              </div>
              <ProgressBar value={pctSinPlan} max={100} accent={pctSinPlan > 20 ? "red" : "lime"} />
              <div style={{ fontSize: 11, color: C.gray500, marginTop: 6, marginBottom: 10 }}>
                {actsSinPlan.length} de {actsReales.length} actividades reales
              </div>
              <ObjetivoBadge>&lt; 20% sin contraparte planificada</ObjetivoBadge>
            </>
          )}
        </Card>
      </Grid>

      <Divider />

      {/* ── INDICADORES DE DECISIÓN ── */}
      <SectionTitle
        title="Indicadores de Decisión"
        subtitle="¿Qué debo hacer? — Fuente: Indicadores_fredal.xlsx · Hoja Mantenimiento"
        iconName="target"
      />
      <Grid cols={2} gap={16} style={{ marginBottom: 22 }}>

        {/* Ind 1: Cumplimiento */}
        <Card style={{ borderTop: `3px solid ${tasaCumpl === null ? C.gray300 : tasaCumpl >= 85 ? C.lime : tasaCumpl >= 60 ? C.amber : C.red}` }}>
          <SectionTitle title="Tasa de Cumplimiento del Plan"
            subtitle="OTs con plan ejecutado ÷ total OTs con actividades planificadas" iconName="checkCircle" />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Gauge value={tasaCumpl} label="cumplimiento" thresholds={{ ok: 85, warn: 60 }} loading={loading} />
            <div>
              <div style={{ fontSize: 13, color: C.gray700, marginBottom: 8 }}>
                <strong style={{ color: C.navy }}>{cumplidas}</strong> de{" "}
                <strong>{otConPlan.length}</strong> OTs con plan ejecutado
              </div>
              <ObjetivoBadge>Tasa de cumplimiento ≥ 85%</ObjetivoBadge>
            </div>
          </div>
        </Card>

        {/* Ind 2: Desviación */}
        <Card>
          <SectionTitle title="Desviación Plan vs Ejecución Real"
            subtitle="Actividades planificadas vs reales por OT · Objetivo: desviación &lt; 15%" iconName="scale" />
          <DataTable
            loading={loading}
            columns={[
              { label: "OT",      key: "ot"      },
              { label: "Máquina", key: "maquina" },
              { label: "Plan",    key: "plan",  align: "center" },
              { label: "Real",    key: "real",  align: "center" },
              { label: "Desv.",   key: "desv",  align: "right",
                render: row => row.desv === null
                  ? <span style={{ color: C.gray500 }}>—</span>
                  : (
                    <StatusBadge level={row.desv > 15 ? "danger" : row.desv > 5 ? "warning" : "ok"}>
                      {row.desv}%
                    </StatusBadge>
                  ),
              },
            ]}
            rows={desvRows}
            emptyMsg="Sin OTs con actividades planificadas registradas"
          />
        </Card>
      </Grid>

      {/* Ind 4: Ratio correctivo */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle title="Ratio Correctivo por Máquina"
          subtitle="% de OTs correctivas · Máquinas con > 30% candidatas a plan preventivo más agresivo"
          iconName="chartBar" />
        <DataTable
          loading={loading}
          columns={[
            { label: "Máquina",        key: "nombre"    },
            { label: "Total OTs",      key: "totalOTs",  align: "center" },
            { label: "% Correctivo",   key: "correctivo", align: "left",
              render: row => (
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 160 }}>
                  <div style={{ flex: 1 }}>
                    <ProgressBar value={row.correctivo} max={100} accent={row.correctivo > 30 ? "red" : "lime"} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, minWidth: 34,
                    color: row.correctivo > 30 ? C.red : C.lime }}>
                    {row.correctivo}%
                  </span>
                </div>
              ),
            },
            { label: "Estado", key: "correctivo", align: "right",
              render: row => (
                <StatusBadge level={row.correctivo > 30 ? "danger" : "ok"}>
                  {row.correctivo > 30 ? "Plan PM requerido" : "Dentro del objetivo"}
                </StatusBadge>
              ),
            },
          ]}
          rows={maqRatioRows}
          emptyMsg="Sin datos de actividades por máquina"
        />
        <div style={{ marginTop: 12 }}>
          <ObjetivoBadge>Correctivo &lt; 30% por máquina</ObjetivoBadge>
        </div>
      </Card>

      {/* Ind 5: Sin OT > 90 días */}
      {!loading && (
        <Card style={{
          marginBottom: 20,
          borderTop: `3px solid ${maqSinOT.length > 0 ? C.amber : C.lime}`,
        }}>
          <SectionTitle title="Maquinarias sin OT en +90 Días"
            subtitle="Equipos sin mantenimiento reciente · Objetivo: 0 máquinas activas sin revisión"
            iconName="noSymbol" />
          {maqSinOT.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <Icon name="checkCircle" size={28} color={C.lime} />
              <StatusBadge level="ok">Todas las maquinarias tienen OTs recientes registradas</StatusBadge>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {maqSinOT.map(m => (
                  <StatusBadge key={m.id} level="warning">
                    {m.codigo_maquina} · {m.nombre}
                  </StatusBadge>
                ))}
              </div>
              <ObjetivoBadge>0 máquinas activas sin revisión en más de 90 días</ObjetivoBadge>
            </>
          )}
        </Card>
      )}

      {/* ── OTs ABIERTAS POR PRIORIDAD ── */}
      <Card>
        <SectionTitle title="OTs Abiertas por Prioridad"
          subtitle="Pendientes y en proceso · Ordenadas por urgencia" iconName="clipboard" />
        <DataTable
          loading={loading}
          columns={[
            { label: "OT",       key: "ot"      },
            { label: "Máquina",  key: "maquina" },
            { label: "Prioridad", key: "prioridad",
              render: row => (
                <StatusBadge level={PRIO_LEVEL[row.prioridad] ?? "neutral"}>
                  {row.prioridad}
                </StatusBadge>
              ),
            },
            { label: "Estado", key: "estatus",
              render: row => (
                <StatusBadge level={row.estatus === "EN_PROCESO" ? "info" : "neutral"}>
                  {row.estatus === "EN_PROCESO" ? "En Proceso" : "Pendiente"}
                </StatusBadge>
              ),
            },
            { label: "Lugar", key: "lugar" },
            { label: "Fecha", key: "fecha" },
          ]}
          rows={otAbiertas}
          emptyMsg="Sin órdenes de trabajo abiertas actualmente"
        />
      </Card>
    </>
  );
}