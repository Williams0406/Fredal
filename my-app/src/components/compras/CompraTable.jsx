"use client";

import { useEffect, useState } from "react";
import { compraAPI } from "@/lib/api";

export default function CompraTable({ refresh }) {
  const [compras, setCompras] = useState([]);

  const [search, setSearch] = useState("");
  const [moneda, setMoneda] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    compraAPI.list().then((res) => setCompras(res.data));
  }, [refresh]);

  const comprasFiltradas = compras.filter((c) => {
    const texto =
      `${c.item_nombre} ${c.item_codigo} ${c.proveedor_nombre || ""} ${
        c.codigo_comprobante || ""
      }`
        .toLowerCase()
        .includes(search.toLowerCase());

    const monedaOK = moneda ? c.moneda === moneda : true;
    const proveedorOK = proveedor
      ? (c.proveedor_nombre || "")
          .toLowerCase()
          .includes(proveedor.toLowerCase())
      : true;

    const fechaOK =
      (!fechaDesde || c.fecha >= fechaDesde) &&
      (!fechaHasta || c.fecha <= fechaHasta);

    return texto && monedaOK && proveedorOK && fechaOK;
  });

  return (
    <div>
      {/* FILTROS */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Buscar item, código, proveedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Proveedor"
          value={proveedor}
          onChange={(e) => setProveedor(e.target.value)}
        />

        <select
          className="border rounded px-2 py-1 text-sm"
          value={moneda}
          onChange={(e) => setMoneda(e.target.value)}
        >
          <option value="">Todas las monedas</option>
          <option value="PEN">PEN</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>

        <input
          type="date"
          className="border rounded px-2 py-1 text-sm"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
        />

        <input
          type="date"
          className="border rounded px-2 py-1 text-sm"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
        />
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Fecha</th>
              <th className="p-2 border">Item</th>
              <th className="p-2 border">Código</th>
              <th className="p-2 border">Proveedor</th>
              <th className="p-2 border">Cant.</th>
              <th className="p-2 border">Valor unit.</th>
              <th className="p-2 border">Valor total</th>
              <th className="p-2 border">Costo unit.</th>
              <th className="p-2 border">Costo total</th>
              <th className="p-2 border">Moneda</th>
              <th className="p-2 border">Comprobante</th>
            </tr>
          </thead>

          <tbody>
            {comprasFiltradas.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2 border">{c.fecha}</td>
                <td className="p-2 border">{c.item_nombre}</td>
                <td
                  className={`p-2 border font-mono ${
                    c.item_volvo ? "bg-yellow-200 font-bold" : ""
                  }`}
                >
                  {c.item_codigo}
                </td>
                <td className="p-2 border">
                  {c.proveedor_nombre || "-"}
                </td>
                <td className="p-2 border text-center">{c.cantidad}</td>
                <td className="p-2 border">
                  {Number(c.valor_unitario).toFixed(2)}
                </td>
                <td className="p-2 border">
                  {Number(c.valor_total).toFixed(2)}
                </td>
                <td className="p-2 border">
                  {Number(c.costo_unitario).toFixed(2)}
                </td>
                <td className="p-2 border font-semibold">
                  {Number(c.costo_total).toFixed(2)}
                </td>
                <td className="p-2 border text-center">{c.moneda}</td>
                <td className="p-2 border">
                  {c.tipo_comprobante} {c.codigo_comprobante}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
