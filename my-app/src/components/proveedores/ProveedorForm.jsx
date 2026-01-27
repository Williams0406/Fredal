"use client";

import { useEffect, useState } from "react";
import { proveedorAPI } from "@/lib/api";

export default function ProveedorForm({ 
  open, 
  onClose, 
  onCreated,
  proveedor = null 
}) {
  const isEdit = Boolean(proveedor);

  const [form, setForm] = useState({
    nombre: "",
    ruc: "",
    direccion: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (proveedor) {
      setForm({
        nombre: proveedor.nombre || "",
        ruc: proveedor.ruc || "",
        direccion: proveedor.direccion || "",
      });
    } else {
      setForm({
        nombre: "",
        ruc: "",
        direccion: "",
      });
    }
    setError("");
  }, [proveedor, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validación específica para RUC (solo números)
    if (name === "ruc") {
      const onlyNumbers = value.replace(/\D/g, "");
      setForm({ ...form, [name]: onlyNumbers });
    } else {
      setForm({ ...form, [name]: value });
    }

    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validación de RUC (11 dígitos para Perú)
    if (form.ruc.length !== 11) {
      setError("El RUC debe tener 11 dígitos");
      setLoading(false);
      return;
    }

    try {
      if (isEdit) {
        await proveedorAPI.update(proveedor.id, form);
      } else {
        await proveedorAPI.create(form);
      }

      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      
      // Manejo de errores específicos
      if (err.response?.data?.ruc) {
        setError("Ya existe un proveedor con este RUC");
      } else {
        setError(
          err.response?.data?.message || 
          "Error al guardar el proveedor. Por favor intente nuevamente."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#1e3a8a]">
              {isEdit ? "Editar Proveedor" : "Nuevo Proveedor"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
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

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre o Razón Social
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Ej: Distribuidora Volvo Perú SAC"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 hover:border-[#1e3a8a] focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
                />
              </div>

              {/* RUC */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RUC
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="ruc"
                    placeholder="20123456789"
                    value={form.ruc}
                    onChange={handleChange}
                    required
                    maxLength={11}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 hover:border-[#1e3a8a] focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    {form.ruc.length}/11
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Ingrese los 11 dígitos del RUC sin espacios ni guiones
                </p>
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección Fiscal
                </label>
                <textarea
                  name="direccion"
                  placeholder="Av. Principal 123, Lima, Perú"
                  value={form.direccion}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 hover:border-[#1e3a8a] focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Dirección completa del proveedor (opcional)
                </p>
              </div>

              {/* Info adicional */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Información importante</p>
                    <p className="text-xs text-blue-700">
                      El RUC debe ser único y no puede modificarse después de crear el proveedor.
                      Asegúrese de verificar los datos antes de guardar.
                    </p>
                  </div>
                </div>
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
                disabled={loading || form.ruc.length !== 11}
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
    </div>
  );
}