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
  const hasHorometro = (value) =>
    value !== null && value !== undefined && value !== "";
  const buildInitialForm = (source = null) => ({
    codigo_maquina: source?.codigo_maquina || "",
    nombre: source?.nombre || "",
    descripcion: source?.descripcion || "",
    observacion: source?.observacion || "",
    horometro_manual: source?.horometro_manual ?? "",
  });
  const formatHorometroDate = (value) => {
    if (!value) return null;
    const safeValue =
      typeof value === "string" && value.includes("T")
        ? value
        : `${value}T00:00:00`;
    return new Date(safeValue).toLocaleDateString("es-PE");
  };

  const [form, setForm] = useState(buildInitialForm());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (maquinaria) {
      setForm(buildInitialForm(maquinaria));
    } else {
      setForm(buildInitialForm());
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
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        horometro_manual:
          form.horometro_manual === "" ? null : Number(form.horometro_manual),
      };

      if (isEdit) {
        await maquinariaAPI.update(maquinaria.id, payload);
      } else {
        await maquinariaAPI.create(payload);
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
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40"
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl sm:max-h-[calc(100dvh-4rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-[#1e3a8a]">
            {isEdit ? "Editar Maquinaria" : "Nueva Maquinaria"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
            disabled={loading}
          >
            <svg
              className="h-6 w-6"
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

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600"
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

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Codigo de Maquinaria
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                type="text"
                name="codigo_maquina"
                placeholder="Ej: VM-001"
                value={form.codigo_maquina}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition-colors hover:border-[#1e3a8a] focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nombre
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                placeholder="Ej: Excavadora Volvo EC210"
                value={form.nombre}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition-colors hover:border-[#1e3a8a] focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {isEdit && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Horometro actual
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-base font-semibold text-gray-900">
                      {hasHorometro(maquinaria?.horometro_actual)
                        ? Number(maquinaria.horometro_actual).toLocaleString("es-PE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "Sin registro"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {maquinaria?.horometro_fuente === "MANUAL" &&
                      maquinaria?.horometro_manual_actualizado_en
                        ? `Valor manual actualizado el ${formatHorometroDate(maquinaria.horometro_manual_actualizado_en)}.`
                        : maquinaria?.fecha_ultimo_horometro
                          ? `Ultima OT registrada el ${formatHorometroDate(maquinaria.fecha_ultimo_horometro)}.`
                          : "Se toma del horometro de la orden de trabajo mas reciente para esta maquinaria."}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Horometro manual
                  </label>
                  <input
                    type="number"
                    name="horometro_manual"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 1250.50"
                    value={form.horometro_manual}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition-colors hover:border-[#1e3a8a] focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Puedes corregirlo manualmente. Si luego aparece una OT mas reciente con horometro,
                    ese ultimo registro volvera a ser el valor actual.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Descripcion
              </label>
              <textarea
                name="descripcion"
                placeholder="Detalles tecnicos y caracteristicas del equipo..."
                value={form.descripcion}
                onChange={handleChange}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition-colors hover:border-[#1e3a8a] focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Observaciones
              </label>
              <textarea
                name="observacion"
                placeholder="Notas adicionales, condiciones especiales..."
                value={form.observacion}
                onChange={handleChange}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition-colors hover:border-[#1e3a8a] focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg bg-gray-100 px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <svg
                    className="h-5 w-5"
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
