// app/(private)/dashboard/compras/page.jsx
"use client";

/*
  Dashboard COMPRAS — Peruvian Group Fredal
  Métricas operativas (hoja "Compras" · Indicadores_fredal.xlsx):
    1. Gasto total por período
    2. Gasto por proveedor
    3. Gasto por tipo de insumo
    4. Ítems más comprados
    5. Precio promedio histórico por ítem

  Indicadores de decisión:
    1. Variación de precio por proveedor → variación < 10%
    2. Concentración de proveedores      → ningún proveedor > 50%
    3. Ítems sin proveedor registrado    → objetivo 0

  ⚠️  Sin <PageWrapper> — padding gestionado por PrivateLayout.
*/

import { useState, useEffect } from "react";
import { compraAPI, proveedorAPI, itemAPI, tipoCambioAPI } from "@/lib/api";
import {
  DashboardStyles, AreaBanner, SectionTitle,
  StatCard, Card, Grid, DataTable,
  DonutChart, HorizontalBarChart, VerticalBarChart,
  StatusBadge, ObjetivoBadge, Divider,
  ProgressBar, Skeleton, Icon, C,
} from "@/components/dashboard/DashboardShared";

const PEN = (n) =>
  "S/ " + Number(n ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function agruparPorMes(compras, toPEN) {
  const now = new Date(); const m = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    m[k] = { label: d.toLocaleString("es-PE",{ month:"short" }).toUpperCase(), value: 0 };
  }
  compras.forEach(c => {
    const k = (c.fecha ?? "").slice(0,7);
    if (!m[k]) return;
    (c.detalles ?? []).forEach(d => {
      m[k].value += toPEN(Number(d.valor_unitario??0) * Number(d.cantidad??0), c.moneda);
    });
  });
  return Object.values(m).map(x => ({ ...x, value: Math.round(x.value) }));
}

export default function ComprasDashboard() {
  const [loading, setLoading]         = useState(true);
  const [compras, setCompras]         = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [items, setItems]             = useState([]);
  const [tipoCambio, setTipoCambio]   = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cs, pvs, its, tc] = await Promise.all([
          compraAPI.list({ page_size: 300 }).then(r => r.data?.results ?? r.data ?? []),
          proveedorAPI.list().then(r => r.data?.results ?? r.data ?? []),
          itemAPI.list({ page_size: 500 }).then(r => r.data?.results ?? r.data ?? []),
          tipoCambioAPI.list({ page_size: 1 }).then(r => (r.data?.results ?? r.data ?? [])[0] ?? null),
        ]);
        setCompras(cs); setProveedores(pvs); setItems(its); setTipoCambio(tc);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const tcUSD = Number(tipoCambio?.compra_usd ?? 3.7);
  const tcEUR = Number(tipoCambio?.compra_eur ?? 4.0);
  const toPEN = (m, mon) => mon === "USD" ? m * tcUSD : mon === "EUR" ? m * tcEUR : m;

  /* — agregados — */
  let gastoTotal = 0, gastoRep = 0, gasCons = 0;
  const gastoProv  = {};
  const itemCount  = {};
  const precioHist = {};

  compras.forEach(c => {
    const pvN = c.proveedor_nombre ?? String(c.proveedor ?? "Sin proveedor");
    (c.detalles ?? []).forEach(d => {
      const monto = toPEN(Number(d.valor_unitario??0) * Number(d.cantidad??0) * 1.18, c.moneda);
      gastoTotal += monto;
      gastoProv[pvN] = (gastoProv[pvN] || 0) + monto;
      const tipo = d.tipo_insumo ?? items.find(i => i.id === d.item)?.tipo_insumo;
      if (tipo === "REPUESTO") gastoRep += monto; else gasCons += monto;
      const iKey = d.item_nombre ?? String(d.item ?? "—");
      itemCount[iKey] = (itemCount[iKey] || 0) + Number(d.cantidad ?? 0);
      const phKey = `${pvN}::${iKey}`;
      if (!precioHist[phKey]) precioHist[phKey] = [];
      precioHist[phKey].push({ fecha: c.fecha, precio: Number(d.valor_unitario ?? 0) });
    });
  });

  const totalPvG   = Object.values(gastoProv).reduce((a,b) => a+b, 0) || 1;
  const topProvRows = Object.entries(gastoProv)
    .sort((a,b) => b[1]-a[1]).slice(0,8)
    .map(([nombre,monto],i) => ({ rank: i+1, nombre, monto, pct: Math.round((monto/totalPvG)*100) }));
  const topProv   = topProvRows[0];
  const pctTopProv = topProv?.pct ?? 0;

  /* — variación precios — */
  const varRows = Object.entries(precioHist)
    .filter(([,arr]) => arr.length >= 2)
    .map(([key, arr]) => {
      arr.sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
      const p0 = arr[0].precio, p1 = arr[arr.length-1].precio;
      const v  = p0 > 0 ? Math.round(((p1-p0)/p0)*100) : 0;
      const [prov,item] = key.split("::");
      return { prov, item, p0, p1, v };
    })
    .filter(r => Math.abs(r.v) > 0)
    .sort((a,b) => Math.abs(b.v)-Math.abs(a.v))
    .slice(0,10);

  const itemsSinProv = items.filter(i => !i.proveedores || i.proveedores.length === 0);
  const topItemsRows = Object.entries(itemCount)
    .sort((a,b) => b[1]-a[1]).slice(0,8)
    .map(([nombre,cantidad],i) => ({ rank: i+1, nombre, cantidad }));
  const mesesData  = agruparPorMes(compras, toPEN);
  const topProvBars = topProvRows.slice(0,6).map(p => ({ label: p.nombre.split(" ")[0], value: Math.round(p.monto) }));

  return (
    <>
      <DashboardStyles />
      <AreaBanner
        iconName="cart"
        area="Compras"
        description="Gestión de adquisiciones · Proveedores · Control de costos"
      />

      {/* ── MÉTRICAS OPERATIVAS ── */}
      <SectionTitle title="Métricas Operativas" subtitle="¿Qué está pasando? — Estado actual de compras" iconName="chartBar" />
      <Grid cols={4} gap={14} style={{ marginBottom: 22 }}>
        <StatCard label="Gasto Total (con IGV)" value={loading ? null : PEN(gastoTotal)}
          sub={`TC: USD ${tcUSD} · EUR ${tcEUR}`}
          iconName="cash" accent="navy" loading={loading} />
        <StatCard label="Total Compras"     value={compras.length}     iconName="document" accent="navy" loading={loading} />
        <StatCard label="Proveedores"       value={proveedores.length} iconName="office"   accent="navy" loading={loading} />
        <StatCard
          label="Ítems sin Proveedor" value={itemsSinProv.length}
          iconName="userRemove"
          accent={itemsSinProv.length > 0 ? "red" : "lime"} loading={loading}
          alert={{ level: itemsSinProv.length > 0 ? "danger" : "ok",
                   text: itemsSinProv.length > 0 ? "Objetivo: 0" : "Sin alertas" }}
        />
      </Grid>

      {/* ── GRÁFICOS ── */}
      <Grid cols={3} gap={16} style={{ marginBottom: 22 }}>
        <Card style={{ gridColumn: "span 2" }}>
          <SectionTitle title="Gasto Mensual" subtitle="Últimos 6 meses · sin IGV · PEN estimado" iconName="trendUp" />
          <VerticalBarChart data={mesesData} accent="navy" height={128} loading={loading} />
        </Card>
        <Card>
          <SectionTitle title="Por Tipo de Insumo" subtitle="Gasto con IGV · en PEN" iconName="cube" />
          <DonutChart loading={loading} segments={[
            { label: "Repuestos",   value: Math.round(gastoRep),  color: C.navy      },
            { label: "Consumibles", value: Math.round(gasCons),   color: C.navyLight },
          ]} />
        </Card>
      </Grid>

      <Divider />

      {/* ── INDICADORES DE DECISIÓN ── */}
      <SectionTitle
        title="Indicadores de Decisión"
        subtitle="¿Qué debo hacer? — Fuente: Indicadores_fredal.xlsx · Hoja Compras"
        iconName="target"
      />
      <Grid cols={2} gap={16} style={{ marginBottom: 22 }}>

        {/* Concentración */}
        <Card style={{ borderTop: `3px solid ${pctTopProv > 50 ? C.red : C.lime}` }}>
          <SectionTitle title="Concentración de Proveedores"
            subtitle="% del gasto total en el proveedor principal" iconName="office" />
          {loading ? <Skeleton height={56} /> : topProv ? (
            <>
              <div style={{ fontSize: 13, color: C.gray700, marginBottom: 10 }}>
                Proveedor principal: <strong style={{ color: C.navy }}>{topProv.nombre}</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 34, fontWeight: 700, color: pctTopProv > 50 ? C.red : C.lime }}>
                  {pctTopProv}%
                </div>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={pctTopProv} max={100} accent={pctTopProv > 50 ? "red" : "lime"} />
                  <div style={{ fontSize: 11, color: C.gray500, marginTop: 3 }}>del gasto total · umbral 50%</div>
                </div>
              </div>
              <ObjetivoBadge>Ningún proveedor &gt; 50% del gasto</ObjetivoBadge>
            </>
          ) : <span style={{ fontSize: 13, color: C.gray500 }}>Sin datos de proveedores</span>}
        </Card>

        {/* Top proveedores barras */}
        <Card>
          <SectionTitle title="Gasto por Proveedor" subtitle="Top 6 · en PEN con IGV" iconName="chartBar" />
          <HorizontalBarChart data={topProvBars} accent="navy" loading={loading} />
        </Card>
      </Grid>

      <Grid cols={2} gap={16} style={{ marginBottom: 22 }}>
        {/* Ranking proveedores */}
        <Card>
          <SectionTitle title="Ranking de Proveedores" subtitle="Por monto total facturado" iconName="office" />
          <DataTable
            loading={loading}
            columns={[
              { label: "#",       key: "rank",   align: "center" },
              { label: "Proveedor", key: "nombre" },
              { label: "Monto PEN", key: "monto", align: "right",
                render: row => <span style={{ fontWeight: 600, color: C.navy }}>{PEN(row.monto)}</span> },
              { label: "% Total",   key: "pct",   align: "right",
                render: row => (
                  <StatusBadge level={row.pct > 50 ? "danger" : row.pct > 30 ? "warning" : "ok"}>
                    {row.pct}%
                  </StatusBadge>
                ),
              },
            ]}
            rows={topProvRows}
            emptyMsg="Sin compras registradas"
          />
        </Card>

        {/* Variación precios */}
        <Card style={{ borderTop: `3px solid ${varRows.some(r => Math.abs(r.v)>10) ? C.amber : C.lime}` }}>
          <SectionTitle title="Variación de Precio por Proveedor"
            subtitle="Precio inicial vs último · Objetivo: variación < 10%" iconName="tag" />
          <DataTable
            loading={loading}
            columns={[
              { label: "Ítem",     key: "item" },
              { label: "Proveedor", key: "prov" },
              { label: "Inicio",   key: "p0", align: "right",
                render: row => <span>S/ {row.p0.toFixed(2)}</span> },
              { label: "Actual",   key: "p1", align: "right",
                render: row => <span style={{ fontWeight: 600 }}>S/ {row.p1.toFixed(2)}</span> },
              { label: "Var %",    key: "v",  align: "right",
                render: row => (
                  <StatusBadge level={Math.abs(row.v)>10 ? "danger" : Math.abs(row.v)>5 ? "warning" : "ok"}>
                    {row.v > 0 ? "▲" : "▼"} {Math.abs(row.v)}%
                  </StatusBadge>
                ),
              },
            ]}
            rows={varRows}
            emptyMsg="Se necesitan ≥ 2 compras del mismo ítem para calcular variación"
          />
          <div style={{ marginTop: 12 }}>
            <ObjetivoBadge>Ningún ítem con variación acumulada &gt; 10%</ObjetivoBadge>
          </div>
        </Card>
      </Grid>

      {/* ── ÍTEMS MÁS COMPRADOS + SIN PROVEEDOR ── */}
      <Grid cols={2} gap={16}>
        <Card>
          <SectionTitle title="Ítems Más Comprados" subtitle="Por cantidad total adquirida" iconName="chartBar" />
          <DataTable
            loading={loading}
            columns={[
              { label: "#",    key: "rank",     align: "center" },
              { label: "Ítem", key: "nombre"   },
              { label: "Cant.", key: "cantidad", align: "right",
                render: row => <strong>{row.cantidad}</strong> },
            ]}
            rows={topItemsRows}
            emptyMsg="Sin compras con detalle registradas"
          />
        </Card>

        <Card style={{ borderTop: `3px solid ${itemsSinProv.length > 0 ? C.red : C.lime}` }}>
          <SectionTitle title="Ítems sin Proveedor"
            subtitle="Sin proveedor no se puede gestionar compra urgente" iconName="userRemove" />
          {loading ? <Skeleton height={120} /> : itemsSinProv.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "20px 0", gap: 10 }}>
              <Icon name="checkCircle" size={32} color={C.lime} />
              <StatusBadge level="ok">Todos los ítems tienen proveedor asignado</StatusBadge>
            </div>
          ) : (
            <>
              <DataTable
                loading={false}
                columns={[
                  { label: "Código", key: "codigo"     },
                  { label: "Nombre", key: "nombre"     },
                  { label: "Tipo",   key: "tipo_insumo" },
                ]}
                rows={itemsSinProv.slice(0, 8)}
                emptyMsg=""
              />
              <div style={{ marginTop: 12 }}>
                <ObjetivoBadge>Objetivo: 0 ítems sin proveedor</ObjetivoBadge>
              </div>
            </>
          )}
        </Card>
      </Grid>
    </>
  );
}