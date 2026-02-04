import { useEffect, useState } from "react";
import { actividadTrabajoAPI, itemAPI, trabajoAPI } from "@/lib/api";

const TIPO_ACTIVIDAD = [
  { value: "REVISION", label: "Revisión" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
];

const TIPO_MANTENIMIENTO = [
  { value: "PREVENTIVO", label: "Preventivo" },
  { value: "CORRECTIVO", label: "Correctivo" },
  { value: "PREDICTIVO", label: "Predictivo" },
];

const SUBTIPOS_PREVENTIVO = [
  { value: "PM1", label: "PM1" },
  { value: "PM2", label: "PM2" },
  { value: "PM3", label: "PM3" },
  { value: "PM4", label: "PM4" },
];

const SUBTIPOS_CORRECTIVO = [
  { value: "LEVE", label: "Leve" },
  { value: "MEDIANO", label: "Mediano" },
  { value: "GRAVE", label: "Grave" },
];

export default function ActividadTrabajoModal({
  trabajoId,
  onClose,
  onSaved,
  esPlanificada = false,
}) {
  const [form, setForm] = useState({
    tipo_actividad: "",
    tipo_mantenimiento: "",
    subtipo: "",
    descripcion: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const esRevision = form.tipo_actividad === "REVISION";
  const esMantenimiento = form.tipo_actividad === "MANTENIMIENTO";

  /* =========================
     SUBTIPOS DINÁMICOS
  ========================= */
  const subtipoOptions = (() => {
    if (form.tipo_mantenimiento === "PREVENTIVO") {
      return SUBTIPOS_PREVENTIVO;
    }
    if (
      form.tipo_mantenimiento === "CORRECTIVO" ||
      form.tipo_mantenimiento === "PREDICTIVO"
    ) {
      return SUBTIPOS_CORRECTIVO;
    }
    return [];
  })();

  /* =========================
     HANDLERS
  ========================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "tipo_actividad"
        ? { tipo_mantenimiento: "", subtipo: "" }
        : {}),
      ...(name === "tipo_mantenimiento"
        ? { subtipo: "" }
        : {}),
    }));

    if (error) setError("");
  };

  const handleSave = async () => {
    setError("");

    // Validación
    if (!form.tipo_actividad) {
      setError("Selecciona un tipo de actividad");
      return;
    }

    if (esMantenimiento && !form.tipo_mantenimiento) {
      setError("Selecciona un tipo de mantenimiento");
      return;
    }

    if (esMantenimiento && !form.subtipo) {
      setError("Selecciona un subtipo");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        tipo_actividad: form.tipo_actividad,
        descripcion: form.descripcion,
        orden: trabajoId,
        es_planificada: esPlanificada,
      };

      if (form.tipo_actividad === "MANTENIMIENTO") {
        payload.tipo_mantenimiento = form.tipo_mantenimiento;
        payload.subtipo = form.subtipo;
      }

      await actividadTrabajoAPI.create(payload);

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al guardar la actividad");
    } finally {
      setSaving(false);
    }
  };

  const puedeGuardar =
    form.tipo_actividad &&
    (esRevision || (esMantenimiento && form.tipo_mantenimiento && form.subtipo));

  /* =========================
     UI
  ========================= */
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
            <h3 className="text-xl font-semibold text-[#1e3a8a]">
              {esPlanificada ? "Nueva Actividad a Realizar" : "Nueva Actividad Registrada"}
            </h3>
            <button
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

          {/* Tipo de actividad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de actividad <span className="text-red-500">*</span>
            </label>
            <select
              name="tipo_actividad"
              value={form.tipo_actividad}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                       transition-all duration-200"
            >
              <option value="">Seleccione una opción</option>
              {TIPO_ACTIVIDAD.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de mantenimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de mantenimiento
              {esMantenimiento && <span className="text-red-500"> *</span>}
            </label>
            <select
              name="tipo_mantenimiento"
              value={form.tipo_mantenimiento}
              onChange={handleChange}
              disabled={esRevision}
              className={`
                w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                transition-all duration-200
                ${esRevision ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
              `}
            >
              <option value="">Seleccione una opción</option>
              {TIPO_MANTENIMIENTO.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {esRevision && (
              <p className="text-xs text-gray-500 mt-2">
                Las revisiones no requieren tipo de mantenimiento
              </p>
            )}
          </div>

          {/* Subtipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subtipo
              {esMantenimiento && form.tipo_mantenimiento && (
                <span className="text-red-500"> *</span>
              )}
            </label>
            <select
              name="subtipo"
              value={form.subtipo}
              onChange={handleChange}
              disabled={esRevision || !form.tipo_mantenimiento}
              className={`
                w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                transition-all duration-200
                ${esRevision || !form.tipo_mantenimiento 
                  ? "bg-gray-50 text-gray-500 cursor-not-allowed" 
                  : ""
                }
              `}
            >
              <option value="">Seleccione una opción</option>
              {subtipoOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {esMantenimiento && !form.tipo_mantenimiento && (
              <p className="text-xs text-gray-500 mt-2">
                Primero seleccione un tipo de mantenimiento
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows={4}
              placeholder="Describe los detalles de la actividad..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                       transition-all duration-200 placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* Info adicional para revisión */}
          {esRevision && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Actividad de Revisión
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    En una revisión no se registra mantenimiento ni se asignan repuestos
                  </p>
                </div>
              </div>
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
              onClick={handleSave}
              disabled={!puedeGuardar || saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#1e3a8a]
                       rounded-lg hover:bg-[#1e3a8a]/90 focus:outline-none 
                       focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            >
              {saving ? (
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
                  Guardar Actividad
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
