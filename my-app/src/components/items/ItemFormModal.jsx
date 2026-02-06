"use client";

import { useEffect, useMemo, useState } from "react";
import { itemAPI, unidadEquivalenciaAPI } from "@/lib/api";

export default function ItemFormModal({ open, onClose, onCreated }) {
  const [autoCode, setAutoCode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    tipo_insumo: "REPUESTO",
    unidad_medida: "UNIDAD",
    unidad_equivalencia: "",
    volvo: false,
  });
  const [unidadesBase, setUnidadesBase] = useState([]);

  useEffect(() => {
    if (!open) return;
    unidadEquivalenciaAPI
      .list()
      .then((res) =>
        setUnidadesBase(res.data.filter((u) => u.activo && u.unidad_base))
      );
  }, [open]);

  const dimensionesDisponibles = useMemo(() => {
    const categorias = new Map();
    unidadesBase.forEach((unidad) => {
      if (!categorias.has(unidad.categoria)) {
        categorias.set(unidad.categoria, unidad);
      }
    });
    return Array.from(categorias.values());
  }, [unidadesBase]);

  if (!open) return null;

  const generateCode = () =>
    `ITEM-${Math.floor(Math.random() * 99999)
      .toString()
      .padStart(5, "0")}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validaciones
    if (!autoCode && !form.codigo.trim()) {
      setError("El código es obligatorio");
      return;
    }

    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    if (form.tipo_insumo === "CONSUMIBLE" && !form.unidad_equivalencia) {
      setError("Selecciona la dimensión para el consumible");
      return;
    }

    setLoading(true);

    const payload = {
      ...form,
      unidad_equivalencia: form.unidad_equivalencia
        ? Number(form.unidad_equivalencia)
        : null,
      codigo: autoCode ? generateCode() : form.codigo.trim(),
    };

    try {
      await itemAPI.create(payload);
      onCreated();
      onClose();
      
      // Reset form
      setForm({
        codigo: "",
        nombre: "",
        tipo_insumo: "REPUESTO",
        unidad_medida: "UNIDAD",
        unidad_equivalencia: "",
        volvo: false,
      });
      setAutoCode(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Error al crear el item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#1e3a8a]">
              Nuevo Item
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

        {/* Content */}
        <div className="px-6 py-6 space-y-5">
          
          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Código autogenerado checkbox */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCode}
                onChange={() => setAutoCode(!autoCode)}
                className="w-4 h-4 text-[#1e3a8a] border-gray-300 rounded 
                         focus:ring-2 focus:ring-[#1e3a8a]"
              />
              <div>
                <span className="text-sm font-medium text-blue-900">
                  Código autogenerado
                </span>
                <p className="text-xs text-blue-700 mt-0.5">
                  El sistema generará un código único automáticamente
                </p>
              </div>
            </label>
          </div>

          {/* Código manual */}
          {!autoCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código del item <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: ITEM-00123"
                required
                value={form.codigo}
                onChange={(e) => {
                  setForm({ ...form, codigo: e.target.value });
                  if (error) setError("");
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200 placeholder:text-gray-400"
              />
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del item <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Filtro de aceite"
              required
              value={form.nombre}
              onChange={(e) => {
                setForm({ ...form, nombre: e.target.value });
                if (error) setError("");
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                       transition-all duration-200 placeholder:text-gray-400"
            />
          </div>

          {/* Tipo de insumo y Dimensión */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de insumo
              </label>
              <select
                value={form.tipo_insumo}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tipo_insumo: e.target.value,
                    unidad_medida: e.target.value === "REPUESTO" ? "UNIDAD" : prev.unidad_medida,
                    unidad_equivalencia: e.target.value === "REPUESTO" ? "" : prev.unidad_equivalencia,
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200"
              >
                <option value="REPUESTO">Repuesto</option>
                <option value="CONSUMIBLE">Consumible</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dimensión (solo consumibles)
              </label>
              <select
                value={form.unidad_equivalencia}
                onChange={(e) => {
                  setForm({
                    ...form,
                    unidad_equivalencia: e.target.value,
                    unidad_medida:
                      unidadesBase.find(
                        (u) => String(u.id) === String(e.target.value)
                      )?.nombre || form.unidad_medida,
                  });
                  if (error) setError("");
                }}
                disabled={form.tipo_insumo === "REPUESTO"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200 placeholder:text-gray-400"
              >
                <option value="">Selecciona dimensión</option>
                {dimensionesDisponibles.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.categoria} · {unidad.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
            <p className="font-semibold text-gray-700">Reglas</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Los consumibles deben elegir una dimensión.</li>
              <li>Los repuestos usan la dimensión CANTIDAD y la unidad UNIDAD por defecto.</li>
            </ul>
          </div>

          {/* Repuesto Volvo */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.volvo}
                onChange={() =>
                  setForm({ ...form, volvo: !form.volvo })
                }
                className="w-4 h-4 text-[#1e3a8a] border-gray-300 rounded 
                         focus:ring-2 focus:ring-[#1e3a8a]"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Repuesto Original Volvo
                </span>
                <p className="text-xs text-gray-600 mt-0.5">
                  Marca este item si es un repuesto original de Volvo
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
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
                  Guardar Item
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}