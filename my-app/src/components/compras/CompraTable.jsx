"use client";

import { useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";

export default function CompraTable({ compras = [], onDeleteRegistro, deletingCompraId = null }) {
  const [search, setSearch] = useState("");
  const [moneda, setMoneda] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const comprasFiltradas = useMemo(() => compras.filter((c) => {
    const texto = `${c.item_nombre} ${c.item_codigo} ${c.proveedor_nombre || ""} ${c.codigo_comprobante || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const monedaOK = moneda ? c.moneda === moneda : true;
    const proveedorOK = proveedor
      ? (c.proveedor_nombre || "").toLowerCase().includes(proveedor.toLowerCase())
      : true;
    const fechaOK = (!fechaDesde || c.fecha >= fechaDesde) && (!fechaHasta || c.fecha <= fechaHasta);
    return texto && monedaOK && proveedorOK && fechaOK;
  }), [compras, search, moneda, proveedor, fechaDesde, fechaHasta]);

  const hasFilters = search || moneda || proveedor || fechaDesde || fechaHasta;
  const clearFilters = () => {
    setSearch("");
    setMoneda("");
    setProveedor("");
    setFechaDesde("");
    setFechaHasta("");
    setPage(1);
  };

  const totalPorMoneda = useMemo(() => ["PEN", "USD", "EUR"].map((mon) => ({
    moneda: mon,
    total: comprasFiltradas.filter((c) => c.moneda === mon).reduce((sum, c) => sum + Number(c.costo_total), 0),
  })), [comprasFiltradas]);
  
  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const [year, month, day] = String(fecha).split("-");
    if (!year || !month || !day) return fecha;
    return `${day}/${month}/${year}`;
  };

  const totalPages = Math.max(1, Math.ceil(comprasFiltradas.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const comprasPagina = comprasFiltradas.slice(startIndex, startIndex + pageSize);

  const canDeleteCompra = (compraId) => !!compraId && deletingCompraId !== compraId;
  const confirmDelete = (row) => {
    if (!onDeleteRegistro || !row.compra_id) return;
    const message = `Vas a eliminar el registro de compra ${row.tipo_comprobante} ${row.codigo_comprobante}.\n\nTambién se eliminarán los detalles y movimientos relacionados.\n¿Deseas continuar?`;
    if (!window.confirm(message)) return;
    onDeleteRegistro(row.compra_id);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1e3a8a] flex items-center justify-center"><Search className="w-4 h-4" /></div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Filtros de búsqueda</p>
              <p className="text-xs text-gray-500">Refina por texto, proveedor, moneda y rango de fechas</p>
            </div>
          </div>
          {hasFilters && <button onClick={clearFilters} className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1.5 rounded-lg">Limpiar filtros</button>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4"><label className="block text-xs font-semibold text-gray-600 mb-1">Búsqueda global</label><input placeholder="Item, código, proveedor o comprobante" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
          <div className="lg:col-span-3"><label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor</label><input placeholder="Nombre del proveedor" value={proveedor} onChange={(e) => { setProveedor(e.target.value); setPage(1); }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
          <div className="lg:col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Moneda</label><select value={moneda} onChange={(e) => { setMoneda(e.target.value); setPage(1); }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"><option value="">Todas</option><option value="PEN">PEN</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
          <div className="lg:col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Filas por página</label><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></div>
          <div className="lg:col-span-3 grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Desde</label><input type="date" value={fechaDesde} onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Hasta</label><input type="date" value={fechaHasta} onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Fecha','Código','Item','Proveedor','Cant.','Unidad','V. Unit.','V. Total','C. Unit.','C. Total S/.','C. Total $','C. Total €','Mon.','Comprobante','Acciones'].map((h)=><th key={h} className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comprasPagina.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatFecha(c.fecha)}</td>
                  <td className={`px-4 py-3 text-sm font-mono font-semibold whitespace-nowrap ${c.item_volvo ? "bg-yellow-50 text-yellow-900" : "text-gray-900"}`}>{c.item_codigo}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.item_nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.proveedor_nombre || <span className="text-gray-400">Sin proveedor</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{c.cantidad}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{c.unidad_medida_simbolo || c.unidad_medida_nombre || "UNID"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{Number(c.valor_unitario).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{Number(c.valor_total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{Number(c.costo_unitario).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{c.costo_total_pen ? Number(c.costo_total_pen).toFixed(2) : "-"}</td>
                  <td className="px-4 py-3 text-sm text-[#1e3a8a] whitespace-nowrap">{c.costo_total_usd ? Number(c.costo_total_usd).toFixed(2) : "-"}</td>
                  <td className="px-4 py-3 text-sm text-emerald-700 whitespace-nowrap">{c.costo_total_eur ? Number(c.costo_total_eur).toFixed(2) : "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">{c.moneda}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"><div><span className="font-medium">{c.tipo_comprobante}</span></div><div className="text-xs text-gray-500">{c.codigo_comprobante}</div></td>
                  <td className="px-4 py-3">
                    <button type="button" disabled={!canDeleteCompra(c.compra_id)} onClick={() => confirmDelete(c)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40">
                      <Trash2 className="w-3 h-3" />
                      {deletingCompraId === c.compra_id ? "Eliminando..." : "Borrar registro"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-200 px-4 py-3 bg-white flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Mostrando <span className="font-semibold text-[#1e3a8a]">{comprasFiltradas.length ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, comprasFiltradas.length)}</span> de {comprasFiltradas.length}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={safePage === 1} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-40">Anterior</button>
            <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage === totalPages} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-40">Siguiente</button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-t border-gray-200 px-4 py-3">
          <div className="flex flex-wrap gap-6 text-sm">
            {totalPorMoneda.map(({ moneda: mon, total }) => total > 0 && (
              <div key={mon} className="flex items-center gap-2"><span className="text-gray-600">Total {mon}:</span><span className="font-semibold text-[#1e3a8a]">{total.toFixed(2)}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}