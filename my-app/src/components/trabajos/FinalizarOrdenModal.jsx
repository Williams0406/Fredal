// src/components/trabajos/FinalizarOrdenModal.jsx

import { useState } from "react";
import { trabajoAPI } from "@/lib/api";

export default function FinalizarOrdenModal({
  trabajo,
  onClose,
  onFinalizado,
}) {
  const [form, setForm] = useState({
    hora_inicio: trabajo.hora_inicio || "",
    hora_fin: trabajo.hora_fin || "",
    horometro: trabajo.horometro || "",
    estado_equipo: trabajo.estado_equipo || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (error) setError(null);
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!form.hora_inicio || !form.hora_fin) {
      setError("Las horas de inicio y fin son obligatorias");
      return;
    }

    if (!form.horometro) {
      setError("El horómetro es obligatorio");
      return;
    }

    if (!form.estado_equipo) {
      setError("El estado del equipo es obligatorio");
      return;
    }

    // Validar que hora_fin > hora_inicio
    if (form.hora_inicio && form.hora_fin && form.hora_inicio >= form.hora_fin) {
      setError("La hora de fin debe ser posterior a la hora de inicio");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await trabajoAPI.finalizar(trabajo.id, form);
      onFinalizado(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Error al finalizar la orden");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[#1e3a8a]">
                Finalizar Orden de Trabajo
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {trabajo.codigo_orden}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-5">
          
          {/* Warning message */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  Acción Irreversible
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Una vez finalizada la orden, no podrás modificar ni agregar actividades
                </p>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Horas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={(e) => handleChange("hora_inicio", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de fin <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.hora_fin}
                onChange={(e) => handleChange("hora_fin", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200"
              />
            </div>
          </div>

          {/* Duración calculada */}
          {form.hora_inicio && form.hora_fin && form.hora_inicio < form.hora_fin && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <span className="font-medium">Duración:</span>{" "}
                {calcularDuracion(form.hora_inicio, form.hora_fin)}
              </p>
            </div>
          )}

          {/* Horómetro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horómetro (horas) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.horometro}
              onChange={(e) => handleChange("horometro", e.target.value)}
              min="0"
              step="0.1"
              placeholder="Ej: 1250.5"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                       transition-all duration-200 placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-500 mt-2">
              Horas acumuladas de uso del equipo
            </p>
          </div>

          {/* Estado del equipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado del equipo <span className="text-red-500">*</span>
            </label>
            <select
              value={form.estado_equipo}
              onChange={(e) => handleChange("estado_equipo", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                       transition-all duration-200"
            >
              <option value="">Seleccione el estado</option>
              <option value="OPERATIVO">✓ Operativo</option>
              <option value="INOPERATIVO">✗ Inoperativo</option>
            </select>
          </div>

          {/* Info estado */}
          {form.estado_equipo === "OPERATIVO" && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✓ El equipo quedará disponible para nuevas asignaciones
              </p>
            </div>
          )}

          {form.estado_equipo === "INOPERATIVO" && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                ✗ El equipo no estará disponible hasta nueva revisión
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white 
                       border border-gray-300 rounded-lg hover:bg-gray-50 
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2
                       transition-all duration-200 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-red-600
                       rounded-lg hover:bg-red-700 focus:outline-none 
                       focus:ring-2 focus:ring-red-600 focus:ring-offset-2
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Finalizando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Finalizar Orden
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper para calcular duración
function calcularDuracion(inicio, fin) {
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  
  let totalMinutos = (h2 * 60 + m2) - (h1 * 60 + m1);
  
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  
  return `${horas}h ${minutos}m`;
}