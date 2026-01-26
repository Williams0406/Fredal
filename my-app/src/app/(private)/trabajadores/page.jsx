"use client";

import { useEffect, useState } from "react";
import { trabajadorAPI } from "@/lib/api";
import TrabajadorFormModal from "@/components/trabajadores/TrabajadorFormModal";

export default function TrabajadoresPage() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    dni: "",
    puesto: "",
  });

  const load = async () => {
    setLoading(true);
    const res = await trabajadorAPI.list();
    setTrabajadores(res.data);
    setLoading(false);
  };

  const generarCodigo = async (id) => {
    try {
      const res = await trabajadorAPI.generarCodigo(id);
      alert(`Código generado:\n${res.data.codigo}`);
      load();
    } catch {
      alert("No se pudo generar el código");
    }
  };

  const crearTrabajador = async (e) => {
    e.preventDefault();
    await trabajadorAPI.create(form);

    setShowForm(false);
    setForm({
      nombres: "",
      apellidos: "",
      dni: "",
      puesto: "",
    });

    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">👷 Trabajadores</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Nuevo trabajador
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Puesto</th>
              <th className="p-3">Usuario</th>
              <th className="p-3">Código</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Cargando trabajadores...
                </td>
              </tr>
            )}

            {!loading && trabajadores.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No hay trabajadores registrados
                </td>
              </tr>
            )}

            {trabajadores.map((t) => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">
                  {t.nombres} {t.apellidos}
                </td>
                <td className="p-3">{t.puesto}</td>

                <td className="p-3">
                  {t.tiene_usuario ? (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      ✔ Usuario creado
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                      Pendiente
                    </span>
                  )}
                </td>

                <td className="p-3">
                  {t.codigo_registro ? (
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {t.codigo_registro}
                    </code>
                  ) : (
                    "—"
                  )}
                </td>

                <td className="p-3 text-right">
                  {!t.tiene_usuario && !t.codigo_registro ? (
                    <button
                      onClick={() => generarCodigo(t.id)}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Generar código
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL COMPONENT */}
      <TrabajadorFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        form={form}
        setForm={setForm}
        onSubmit={crearTrabajador}
      />
    </div>
  );
}
