// app/(private)/dashboard/almacen/page.jsx
"use client";

/*
  Dashboard ALMACÉN — Peruvian Group Fredal
  Métricas operativas (hoja "Almacén" · Indicadores_fredal.xlsx):
    1. Stock actual por ítem
    2. Repuestos instalados en maquinaria
    3. Consumibles usados por período
    4. Valor total del inventario

  Indicadores de decisión:
    1. Ítems en stock crítico             → 0 ítems alta rotación con stock = 0
    2. Rotación por ítem                  → stock ≥ 2 semanas de consumo
    3. Ítems planificados con stock insuf → 0 OTs iniciadas sin stock
    4. Ítems sin movimiento en 6 meses    → < 5% del inventario

  ⚠️  Sin <PageWrapper> — padding gestionado por PrivateLayout.
*/

import { useState, useEffect } from "react";
import {
  itemAPI, trabajoAPI, actividadTrabajoAPI,
  movimientoConsumibleAPI,
} from "@/lib/api";
import {
  DashboardStyles, AreaBanner, SectionTitle,
  StatCard, Card, Grid, DataTable,
  DonutChart, HorizontalBarChart, Gauge,
  StatusBadge, ObjetivoBadge, Divider,
  ProgressBar, Skeleton, Icon, C,
} from "@/components/dashboard/DashboardShared";

export default function AlmacenDashboard() {
  const [loading, setLoading]         = useState(true);
  const [items, setItems]             = useState([]);
  const [trabajos, setTrabajos]       = useState([]);
  const [actividades, setActividades] = useState([]);
  const [movCons, setMovCons]         = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [its, tjs, mvC] = await Promise.all([
          itemAPI.list({ page_size: 500 }).then(r => r.data?.results ?? r.data ?? []),
          trabajoAPI.list({ page_size: 200 }).then(r => r.data?.results ?? r.data ?? []),
          movimientoConsumibleAPI.list({ page_size: 500 }).then(r => r.data?.results ?? r.data ?? []),
        ]);
        setItems(its); setTrabajos(tjs); setMovCons(mvC);
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

  /* — clasificación base — */
  const repuestos   = items.filter(i => i.tipo_insumo === "REPUESTO");
  const consumibles = items.filter(i => i.tipo_insumo === "CONSUMIBLE");
  const sinStock    = items.filter(i => Number(i.stock) <= 0);
  const stockBajo   = items.filter(i => Number(i.stock) > 0 && Number(i.stock) <= 3);

  /* — Ind 1: Stock crítico — */
  const freqItem = {};
  movCons.forEach(m => { const k = m.item ?? m.item_codigo; freqItem[k] = (freqItem[k] || 0) + 1; });
  const altaRot  = items.filter(i => (freqItem[i.id] ?? freqItem[i.codigo] ?? 0) >= 2);
  const criticos = altaRot.filter(i => Number(i.stock) <= 0);

  /* — Ind 2: Rotación — */
  const rotRows = consumibles
    .map(i => {
      const consumido = movCons.filter(m => m.item === i.id || m.item_codigo === i.codigo)
        .reduce((s, m) => s + Number(m.cantidad ?? 0), 0);
      const stock = Number(i.stock ?? 0);
      const idx   = stock > 0 ? +(consumido / stock).toFixed(2) : consumido > 0 ? 99 : 0;
      return { nombre: i.nombre, codigo: i.codigo, stock, consumido, idx };
    })
    .filter(r => r.consumido > 0)
    .sort((a, b) => b.idx - a.idx)
    .slice(0, 10);

  /* — Ind 3: Planificados sin stock — */
  const otsPendSet = new Set(trabajos.filter(t => t.estatus !== "FINALIZADO").map(t => t.id));
  const actsPlanPend = actividades.filter(a => a.es_planificada && otsPendSet.has(a.orden));

  /* — Ind 4: Sin movimiento 6 meses — */
  const hace6m = new Date(); hace6m.setMonth(hace6m.getMonth() - 6);
  const conMovReciente = new Set(
    movCons.filter(m => new Date(m.fecha ?? m.created_at ?? 0) >= hace6m)
      .map(m => m.item ?? m.item_codigo)
  );
  const sinMov    = items.filter(i => !conMovReciente.has(i.id) && !conMovReciente.has(i.codigo));
  const pctSinMov = items.length ? Math.round((sinMov.length / items.length) * 100) : 0;

  /* — Cumplimiento plan — */
  const otConPlan = [...new Set(actividades.filter(a => a.es_planificada).map(a => a.orden))];
  const cumplidas = otConPlan.filter(id => actividades.some(a => !a.es_planificada && a.orden === id)).length;
  const tasaCumpl = otConPlan.length ? Math.round((cumplidas / otConPlan.length) * 100) : null;

  /* — Exactitud — */
  const actsPlan   = actividades.filter(a => a.es_planificada);
  const actsReales = actividades.filter(a => !a.es_planificada);
  const coinciden  = actsReales.filter(a =>
    actsPlan.some(p => p.orden === a.orden && p.tipo_mantenimiento === a.tipo_mantenimiento)
  ).length;
  const exactitud = actsPlan.length ? Math.round((coinciden / actsPlan.length) * 100) : null;

  /* — Top consumibles — */
  const consumoMap = {};
  movCons.forEach(m => { const k = m.item_nombre ?? String(m.item ?? "?"); consumoMap[k] = (consumoMap[k] || 0) + Number(m.cantidad ?? 0); });
  const topConsumo = Object.entries(consumoMap)
    .sort((a,b) => b[1]-a[1]).slice(0,6)
    .map(([label,value]) => ({ label: label.split(" ")[0], value: Math.round(value) }));

  /* — Tabla sin stock — */
  const sinStockRows = sinStock.slice(0, 12).map(i => ({
    codigo: i.codigo, nombre: i.nombre, tipo: i.tipo_insumo,
    rotacion: freqItem[i.id] ?? freqItem[i.codigo] ?? 0,
  }));

  return (
    <>
      <DashboardStyles />
      <AreaBanner
        iconName="archive"
        area="Almacén"
        description="Control de stock · Movimientos · Planificación de insumos"
      />

      {/* ── MÉTRICAS OPERATIVAS ── */}
      <SectionTitle title="Estado del Inventario" subtitle="Métricas operativas · Stock actual" iconName="cube" />
      <Grid cols={4} gap={14} style={{ marginBottom: 22 }}>
        <StatCard label="Total Ítems"  value={items.length}      iconName="cube"    accent="navy" loading={loading} />
        <StatCard label="Repuestos"    value={repuestos.length}  iconName="cog"     accent="navy" loading={loading} />
        <StatCard label="Consumibles"  value={consumibles.length} iconName="archive" accent="navy" loading={loading} />
        <StatCard
          label="Sin Stock" value={sinStock.length} iconName="exclamation"
          accent={sinStock.length > 0 ? "red" : "lime"} loading={loading}
          sub={`${stockBajo.length} con stock ≤ 3 unidades`}
          alert={{ level: sinStock.length > 0 ? "danger" : "ok",
                   text: sinStock.length > 0 ? "Reposición urgente" : "Sin alertas" }}
        />
      </Grid>

      {/* ── INDICADORES DE DECISIÓN ── */}
      <SectionTitle
        title="Indicadores de Decisión"
        subtitle="¿Qué debo hacer? — Fuente: Indicadores_fredal.xlsx · Hoja Almacén"
        iconName="target"
      />
      <Grid cols={3} gap={16} style={{ marginBottom: 22 }}>

        {/* Stock crítico */}
        <Card style={{ borderTop: `3px solid ${criticos.length > 0 ? C.red : C.lime}` }}>
          <SectionTitle title="Ítems en Stock Crítico" subtitle="Alta rotación + stock = 0" iconName="exclamation" />
          {loading ? <Skeleton height={48} /> : (
            <>
              <div style={{ fontSize: 34, fontWeight: 700,
                color: criticos.length > 0 ? C.red : C.lime, lineHeight: 1, marginBottom: 6 }}>
                {criticos.length}
              </div>
              <div style={{ fontSize: 11, color: C.gray500, marginBottom: 10 }}>
                de {altaRot.length} ítems de alta rotación
              </div>
              <ObjetivoBadge>0 ítems de alta rotación con stock = 0</ObjetivoBadge>
            </>
          )}
        </Card>

        {/* OTs planificadas pendientes */}
        <Card style={{ borderTop: `3px solid ${actsPlanPend.length > 0 ? C.amber : C.lime}` }}>
          <SectionTitle title="OTs con Stock Insuficiente" subtitle="Actividades planificadas en OTs abiertas" iconName="calendar" />
          {loading ? <Skeleton height={48} /> : (
            <>
              <div style={{ fontSize: 34, fontWeight: 700,
                color: actsPlanPend.length > 0 ? C.amber : C.lime, lineHeight: 1, marginBottom: 6 }}>
                {actsPlanPend.length}
              </div>
              <div style={{ fontSize: 11, color: C.gray500, marginBottom: 10 }}>
                actividades planificadas en OTs no finalizadas
              </div>
              <ObjetivoBadge>0 OTs iniciadas sin stock suficiente</ObjetivoBadge>
            </>
          )}
        </Card>

        {/* Sin movimiento */}
        <Card style={{ borderTop: `3px solid ${pctSinMov > 5 ? C.amber : C.lime}` }}>
          <SectionTitle title="Ítems sin Movimiento" subtitle="Sin consumo en los últimos 6 meses" iconName="ban" />
          {loading ? <Skeleton height={48} /> : (
            <>
              <div style={{ fontSize: 34, fontWeight: 700,
                color: pctSinMov > 5 ? C.amber : C.lime, lineHeight: 1, marginBottom: 4 }}>
                {sinMov.length}
                <span style={{ fontSize: 14, color: C.gray500, marginLeft: 6 }}>({pctSinMov}%)</span>
              </div>
              <ProgressBar value={pctSinMov} max={100} accent={pctSinMov > 5 ? "amber" : "lime"} />
              <div style={{ marginTop: 10 }}>
                <ObjetivoBadge>&lt; 5% del inventario</ObjetivoBadge>
              </div>
            </>
          )}
        </Card>
      </Grid>

      {/* ── CUMPLIMIENTO + EXACTITUD ── */}
      <Grid cols={2} gap={16} style={{ marginBottom: 22 }}>
        <Card>
          <SectionTitle title="Cumplimiento del Plan de Almacén"
            subtitle="OTs con plan ejecutado ÷ total OTs con plan · Objetivo ≥ 85%" iconName="checkCircle" />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Gauge value={tasaCumpl} label="OTs cumplidas" thresholds={{ ok: 85, warn: 60 }} loading={loading} />
            <div>
              <div style={{ fontSize: 13, color: C.gray700, marginBottom: 8 }}>
                <strong>{cumplidas}</strong> de <strong>{otConPlan.length}</strong> OTs con plan cumplido
              </div>
              <StatusBadge level={tasaCumpl === null ? "neutral" : tasaCumpl >= 85 ? "ok" : tasaCumpl >= 60 ? "warning" : "danger"}>
                {tasaCumpl !== null ? `${tasaCumpl}% — Obj ≥ 85%` : "Sin datos"}
              </StatusBadge>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Exactitud del Plan"
            subtitle="Ítems reales que coinciden con planificados · Objetivo ≥ 75%" iconName="target" />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Gauge value={exactitud} label="coincidencia" thresholds={{ ok: 75, warn: 50 }} loading={loading} />
            <div>
              <div style={{ fontSize: 13, color: C.gray700, marginBottom: 8 }}>
                <strong>{coinciden}</strong> actividades reales con contraparte planificada
              </div>
              <StatusBadge level={exactitud === null ? "neutral" : exactitud >= 75 ? "ok" : exactitud >= 50 ? "warning" : "danger"}>
                {exactitud !== null ? `${exactitud}% — Obj ≥ 75%` : "Sin datos"}
              </StatusBadge>
            </div>
          </div>
        </Card>
      </Grid>

      {/* ── ROTACIÓN + TOP CONSUMIDOS ── */}
      <Grid cols={2} gap={16} style={{ marginBottom: 22 }}>
        <Card>
          <SectionTitle title="Rotación por Ítem (Top 10)"
            subtitle="Cantidad consumida ÷ stock actual · Obj: stock ≥ 2 semanas de consumo" iconName="refresh" />
          <DataTable
            loading={loading}
            columns={[
              { label: "Código",    key: "codigo"   },
              { label: "Ítem",      key: "nombre"   },
              { label: "Stock",     key: "stock",    align: "center" },
              { label: "Consumido", key: "consumido", align: "center" },
              { label: "Índice",    key: "idx",      align: "right",
                render: row => (
                  <StatusBadge level={row.idx > 5 ? "danger" : row.idx > 2 ? "warning" : "ok"}>
                    {row.idx === 99 ? "∞" : row.idx}
                  </StatusBadge>
                ),
              },
            ]}
            rows={rotRows}
            emptyMsg="Sin movimientos de consumibles registrados"
          />
        </Card>

        <Card>
          <SectionTitle title="Top Consumibles Usados"
            subtitle="Cantidad total en movimientos registrados" iconName="chartBar" />
          <HorizontalBarChart data={topConsumo} accent="navy" loading={loading} />
        </Card>
      </Grid>

      {/* ── ÍTEMS SIN STOCK ── */}
      {!loading && sinStockRows.length > 0 && (
        <Card style={{ borderTop: `3px solid ${C.red}` }}>
          <SectionTitle title="Ítems sin Stock — Reposición Urgente"
            subtitle="Ordenados por frecuencia de uso" iconName="exclamation" />
          <DataTable
            loading={false}
            columns={[
              { label: "Código", key: "codigo" },
              { label: "Nombre", key: "nombre" },
              { label: "Tipo",   key: "tipo"   },
              { label: "Stock",  key: "stock",    align: "center",
                render: () => <StatusBadge level="danger">0</StatusBadge> },
              { label: "Usos",   key: "rotacion", align: "center",
                render: row => (
                  <span style={{ fontWeight: 600, color: row.rotacion >= 2 ? C.red : C.gray500 }}>
                    {row.rotacion}
                  </span>
                ),
              },
            ]}
            rows={sinStockRows}
            emptyMsg=""
          />
        </Card>
      )}
    </>
  );
}