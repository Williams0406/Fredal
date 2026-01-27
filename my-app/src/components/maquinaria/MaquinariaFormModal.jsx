"use client";

import { useEffect, useState } from "react";
import { maquinariaAPI } from "@/lib/api";

export default function MaquinariaFormModal({
  open,
  onClose,
  onSaved,
  maquinaria = null,
}) {
  const isEdit = Boolean(maquinaria);

  const [form, setForm] = useState({
    codigo_maquina: "",
    nombre: "",
    descripcion: "",
    observacion: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (maquinaria) {
      setForm({
        codigo_maquina: maquinaria.codigo_maquina || "",
        nombre: maquinaria.nombre || "",
        descripcion: maquinaria.descripcion || "",
        observacion: maquinaria.observacion || "",
      });
    } else {
      // Reset form cuando se abre para crear nueva
      setForm({
        codigo_maquina: "",
        nombre: "",
        descripcion: "",
        observacion: "",
      });
    }
    setError("");
  }, [maquinaria, open]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    // Limpiar error al escribir
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isEdit) {
        await maquinariaAPI.update(maquinaria.id, form);
      } else {
        await maquinariaAPI.create(form);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        "Error al guardar la maquinaria. Por favor intente nuevamente."
      );
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
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-[#1e3a8a]">
            {isEdit ? "Editar Maquinaria" : "Nueva Maquinaria"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Maquinaria
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="codigo_maquina"
                placeholder="Ej: VM-001"
                value={form.codigo_maquina}
                onChange={handleChange}
                required
                disabled={isEdit}
                className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 transition-colors ${
                  isEdit
                    ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                    : "bg-white border-gray-300 hover:border-[#1e3a8a] focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                } outline-none`}
              />
              {isEdit && (
                <p className="text-xs text-gray-500 mt-1.5">
                  El código no puede modificarse después de crear la maquinaria
                </p>
              )}
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                placeholder="Ej: Excavadora Volvo EC210"
                value={form.nombre}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 hover:border-[#1e3a8a] focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                name="descripcion"
                placeholder="Detalles técnicos y características del equipo..."
                value={form.descripcion}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 hover:border-[#1e3a8a] focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-colors"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                name="observacion"
                placeholder="Notas adicionales, condiciones especiales..."
                value={form.observacion}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 hover:border-[#1e3a8a] focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-colors"
              />
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#1e3a8a] text-white font-medium rounded-lg hover:bg-[#1e40af] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}