"use client";

import { useEffect, useState } from "react";
import { clienteAPI, ubicacionClienteAPI } from "@/lib/api";

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [formCliente, setFormCliente] = useState({ nombre: "", ruc: "" });
  const [formUbicacion, setFormUbicacion] = useState({ cliente: "", nombre: "", direccion: "" });

  const loadData = async () => {
    const [cRes, uRes] = await Promise.all([clienteAPI.list(), ubicacionClienteAPI.list()]);
    setClientes(cRes.data);
    setUbicaciones(uRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveCliente = async () => {
    if (!formCliente.nombre || !formCliente.ruc) return;
    await clienteAPI.create(formCliente);
    setFormCliente({ nombre: "", ruc: "" });
    loadData();
  };

  const saveUbicacion = async () => {
    if (!formUbicacion.cliente || !formUbicacion.nombre) return;
    await ubicacionClienteAPI.create({
      ...formUbicacion,
      cliente: Number(formUbicacion.cliente),
    });
    setFormUbicacion({ cliente: "", nombre: "", direccion: "" });
    loadData();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#1e3a8a]">Clientes y Ubicaciones</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Registrar Cliente</h2>
          <input className="w-full border rounded px-3 py-2" placeholder="Nombre" value={formCliente.nombre} onChange={(e) => setFormCliente({ ...formCliente, nombre: e.target.value })} />
          <input className="w-full border rounded px-3 py-2" placeholder="RUC" value={formCliente.ruc} onChange={(e) => setFormCliente({ ...formCliente, ruc: e.target.value })} />
          <button className="px-4 py-2 bg-[#1e3a8a] text-white rounded" onClick={saveCliente}>Guardar Cliente</button>
        </div>

        <div className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Registrar Ubicación</h2>
          <select className="w-full border rounded px-3 py-2" value={formUbicacion.cliente} onChange={(e) => setFormUbicacion({ ...formUbicacion, cliente: e.target.value })}>
            <option value="">Seleccione cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input className="w-full border rounded px-3 py-2" placeholder="Nombre ubicación" value={formUbicacion.nombre} onChange={(e) => setFormUbicacion({ ...formUbicacion, nombre: e.target.value })} />
          <input className="w-full border rounded px-3 py-2" placeholder="Dirección" value={formUbicacion.direccion} onChange={(e) => setFormUbicacion({ ...formUbicacion, direccion: e.target.value })} />
          <button className="px-4 py-2 bg-[#1e3a8a] text-white rounded" onClick={saveUbicacion}>Guardar Ubicación</button>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Clientes</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th>Nombre</th><th>RUC</th></tr></thead>
          <tbody>
            {clientes.map((c) => <tr key={c.id}><td>{c.nombre}</td><td>{c.ruc}</td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Ubicaciones</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th>Cliente</th><th>Ubicación</th><th>Dirección</th></tr></thead>
          <tbody>
            {ubicaciones.map((u) => <tr key={u.id}><td>{u.cliente_nombre}</td><td>{u.nombre}</td><td>{u.direccion}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}