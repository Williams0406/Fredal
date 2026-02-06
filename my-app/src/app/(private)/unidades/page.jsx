"use client";

import { useEffect, useState } from "react";
import { unidadEquivalenciaAPI } from "@/lib/api";

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState([]);
  const [form, setForm] = useState({ nombre: "", factor_a_unidad: "1" });

  const loadData = async () => {
    const res = await unidadEquivalenciaAPI.list();
    setUnidades(res.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const save = async () => {
    if (!form.nombre || !form.factor_a_unidad) return;
    await unidadEquivalenciaAPI.create({
      nombre: form.nombre,
      factor_a_unidad: Number(form.factor_a_unidad),
      activo: true,
    });
    setForm({ nombre: "", factor_a_unidad: "1" });
    loadData();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#1e3a8a]">Unidades y Equivalencias</h1>

      <div className="bg-white border rounded-lg p-4 space-y-3 max-w-xl">
        <h2 className="font-semibold">Registrar Unidad</h2>
        <input className="w-full border rounded px-3 py-2" placeholder="Ej: GALON" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value.toUpperCase() })} />
        <input className="w-full border rounded px-3 py-2" type="number" step="0.0001" placeholder="Factor a UNIDAD" value={form.factor_a_unidad} onChange={(e) => setForm({ ...form, factor_a_unidad: e.target.value })} />
        <button className="px-4 py-2 bg-[#1e3a8a] text-white rounded" onClick={save}>Guardar</button>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Tabla de Equivalencias</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th>Unidad</th><th>Factor a UNIDAD</th><th>Activo</th></tr></thead>
          <tbody>
            {unidades.map((u) => (
              <tr key={u.id}><td>{u.nombre}</td><td>{u.factor_a_unidad}</td><td>{u.activo ? "Sí" : "No"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}