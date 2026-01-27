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

  // Estadísticas rápidas
  const stats = {
    total: trabajadores.length,
    conUsuario: trabajadores.filter((t) => t.tiene_usuario).length,
    pendientes: trabajadores.filter((t) => !t.tiene_usuario && !t.codigo_registro).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER CON TÍTULO Y ACCIÓN */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1e3a8a]">
              Trabajadores
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestión de personal y códigos de registro
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-[#1e3a5f] text-white text-[14px] font-medium rounded-lg hover:bg-[#152d4a] transition-colors duration-200"
          >
            + Nuevo trabajador
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="px-8 py-6 space-y-6">
        {/* CARDS DE ESTADÍSTICAS (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                  Total Trabajadores
                </p>
                <p className="text-[32px] font-semibold text-[#1e3a5f] mt-2">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Con usuario */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                  Con Usuario
                </p>
                <p className="text-[32px] font-semibold text-[#84cc16] mt-2">
                  {stats.conUsuario}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#84cc16]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pendientes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                  Pendientes
                </p>
                <p className="text-[32px] font-semibold text-[#1e3a5f] mt-2">
                  {stats.pendientes}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DE TRABAJADORES */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header de tabla */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-[18px] font-semibold text-[#1e3a5f]">
              Listado de trabajadores
            </h2>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Nombre completo
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Puesto
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Estado usuario
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Código registro
                  </th>
                  <th className="px-6 py-4 text-right text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#1e3a5f] rounded-full animate-spin"></div>
                        <p className="text-[14px] text-gray-500">Cargando trabajadores...</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && trabajadores.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <p className="text-[14px] text-gray-500">No hay trabajadores registrados</p>
                        <button
                          onClick={() => setShowForm(true)}
                          className="mt-2 text-[14px] text-[#1e3a5f] hover:text-[#152d4a] font-medium"
                        >
                          Crear primer trabajador
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && trabajadores.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <p className="text-[14px] font-medium text-gray-900">
                        {t.nombres} {t.apellidos}
                      </p>
                      <p className="text-[13px] text-gray-500 mt-0.5">
                        DNI: {t.dni}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-[14px] text-gray-700">{t.puesto}</p>
                    </td>

                    <td className="px-6 py-4">
                      {t.tiene_usuario ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-green-50 text-green-700 rounded-lg border border-green-200">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Usuario creado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Pendiente
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {t.codigo_registro ? (
                        <code className="inline-block px-3 py-1.5 text-[13px] font-mono bg-gray-100 text-gray-800 rounded-lg border border-gray-200">
                          {t.codigo_registro}
                        </code>
                      ) : (
                        <span className="text-[14px] text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {!t.tiene_usuario && !t.codigo_registro ? (
                        <button
                          onClick={() => generarCodigo(t.id)}
                          className="px-4 py-2 text-[14px] font-medium bg-[#1e3a5f] text-white rounded-lg hover:bg-[#152d4a] transition-colors duration-200"
                        >
                          Generar código
                        </button>
                      ) : (
                        <span className="text-[14px] text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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