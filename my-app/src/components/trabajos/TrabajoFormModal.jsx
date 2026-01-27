"use client";

import { useEffect, useState } from "react";
import { maquinariaAPI, trabajoAPI } from "@/lib/api";

const ESTADOS = ["PENDIENTE", "EN_PROCESO", "FINALIZADO"];

export default function TrabajoFormModal({
  open,
  onClose,
  onSaved,
  trabajo,
}) {
  const isEdit = Boolean(trabajo);

  const [form, setForm] = useState({
    maquinaria: null,
    fecha: "",
    lugar: "TALLER",
    ubicacion_detalle: "",
    prioridad: "REGULAR",
    estatus: "PENDIENTE",
    hora_inicio: "",
    hora_fin: "",
    horometro: "",
    estado_equipo: "",
    observaciones: "",
  });

  const [maquinarias, setMaquinarias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset form cuando se abre sin trabajo
  useEffect(() => {
    if (open && !trabajo) {
      setForm({
        maquinaria: null,
        fecha: "",
        lugar: "TALLER",
        ubicacion_detalle: "",
        prioridad: "REGULAR",
        estatus: "PENDIENTE",
        hora_inicio: "",
        hora_fin: "",
        horometro: "",
        estado_equipo: "",
        observaciones: "",
      });
      setError("");
    }
  }, [open, trabajo]);

  // Cargar maquinarias
  useEffect(() => {
    if (open) {
      maquinariaAPI.list().then((res) => setMaquinarias(res.data));
    }
  }, [open]);

  // Cargar datos del trabajo al editar
  useEffect(() => {
    if (trabajo) {
      setForm({
        maquinaria: trabajo.maquinaria || "",
        fecha: trabajo.fecha || "",
        lugar: trabajo.lugar || "TALLER",
        ubicacion_detalle: trabajo.ubicacion_detalle || "",
        prioridad: trabajo.prioridad || "REGULAR",
        estatus: trabajo.estatus || "PENDIENTE",
        hora_inicio: trabajo.hora_inicio || "",
        hora_fin: trabajo.hora_fin || "",
        horometro: trabajo.horometro || "",
        estado_equipo: trabajo.estado_equipo || "",
        observaciones: trabajo.observaciones || "",
      });
    }
  }, [trabajo]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validaciones
    if (!form.maquinaria) {
      setError("Selecciona una maquinaria");
      setLoading(false);
      return;
    }

    if (!form.fecha) {
      setError("La fecha es obligatoria");
      setLoading(false);
      return;
    }

    if (!form.ubicacion_detalle?.trim()) {
      setError("La ubicación es obligatoria");
      setLoading(false);
      return;
    }

    const payload = { ...form };

    // Limpiar campos vacíos
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "" || payload[key] === null) {
        delete payload[key];
      }
    });

    try {
      if (isEdit) {
        await trabajoAPI.update(trabajo.id, payload);
      } else {
        await trabajoAPI.create(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al guardar la orden");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#1e3a8a]">
              {isEdit ? "Editar Orden de Trabajo" : "Nueva Orden de Trabajo"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="px-6 py-6 space-y-5">
          
          {/* Mensaje de error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Maquinaria */}
          <div>
            <label htmlFor="maquinaria" className="block text-sm font-medium text-gray-700 mb-2">
              Maquinaria <span className="text-red-500">*</span>
            </label>
            <select
              id="maquinaria"
              name="maquinaria"
              value={form.maquinaria ?? ""}
              required
              onChange={(e) =>
                setForm({
                  ...form,
                  maquinaria: Number(e.target.value),
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                       transition-all duration-200"
            >
              <option value="">Seleccione una maquinaria</option>
              {maquinarias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo_maquina} - {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-2">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              id="fecha"
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                       transition-all duration-200"
            />
          </div>

          {/* Lugar y Prioridad en grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lugar" className="block text-sm font-medium text-gray-700 mb-2">
                Lugar
              </label>
              <select
                id="lugar"
                name="lugar"
                value={form.lugar}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200"
              >
                <option value="TALLER">Taller</option>
                <option value="CAMPO">Campo</option>
              </select>
            </div>

            <div>
              <label htmlFor="prioridad" className="block text-sm font-medium text-gray-700 mb-2">
                Prioridad
              </label>
              <select
                id="prioridad"
                name="prioridad"
                value={form.prioridad}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200"
              >
                <option value="REGULAR">Regular</option>
                <option value="URGENTE">Urgente</option>
                <option value="EMERGENCIA">Emergencia</option>
              </select>
            </div>
          </div>

          {/* Ubicación detalle */}
          <div>
            <label htmlFor="ubicacion_detalle" className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación exacta <span className="text-red-500">*</span>
            </label>
            <input
              id="ubicacion_detalle"
              name="ubicacion_detalle"
              placeholder="Ej: Zona A, Sector 3, Cliente XYZ"
              value={form.ubicacion_detalle}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                       transition-all duration-200 placeholder:text-gray-400"
            />
          </div>

          {/* Campos técnicos solo al finalizar */}
          {isEdit && form.estatus === "FINALIZADO" && (
            <>
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  Información técnica
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="hora_inicio" className="block text-sm font-medium text-gray-700 mb-2">
                        Hora inicio
                      </label>
                      <input
                        id="hora_inicio"
                        type="time"
                        name="hora_inicio"
                        value={form.hora_inicio}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                                 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label htmlFor="hora_fin" className="block text-sm font-medium text-gray-700 mb-2">
                        Hora fin
                      </label>
                      <input
                        id="hora_fin"
                        type="time"
                        name="hora_fin"
                        value={form.hora_fin}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                                 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="horometro" className="block text-sm font-medium text-gray-700 mb-2">
                      Horómetro
                    </label>
                    <input
                      id="horometro"
                      type="number"
                      name="horometro"
                      value={form.horometro}
                      onChange={handleChange}
                      placeholder="Horas de uso del equipo"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                               transition-all duration-200 placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="estado_equipo" className="block text-sm font-medium text-gray-700 mb-2">
                      Estado del equipo
                    </label>
                    <select
                      id="estado_equipo"
                      name="estado_equipo"
                      value={form.estado_equipo}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                               transition-all duration-200"
                    >
                      <option value="">Seleccione estado</option>
                      <option value="OPERATIVO">Operativo</option>
                      <option value="INOPERATIVO">Inoperativo</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-2">
                      Observaciones
                    </label>
                    <textarea
                      id="observaciones"
                      name="observaciones"
                      value={form.observaciones}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Detalles adicionales del trabajo realizado..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                               transition-all duration-200 placeholder:text-gray-400 resize-none"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer con botones */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white 
                       border border-gray-300 rounded-lg hover:bg-gray-50 
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2
                       transition-all duration-200 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#1e3a8a]
                       rounded-lg hover:bg-[#1e3a8a]/90 focus:outline-none 
                       focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M5 13l4 4L19 7" />
                  </svg>
                  {isEdit ? "Actualizar" : "Crear Orden"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}