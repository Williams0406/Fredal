"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import TableActionButton from "@/components/ui/TableActionButton";
import { reporteIpercAPI } from "@/lib/api";

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

const MOTIVO_OPTIONS = [
  { value: "ACTIVIDAD_NUEVA", label: "Actividad nueva" },
  { value: "CAMBIO_PROCESO", label: "Cambio del proceso" },
  { value: "TRABAJO_NO_RUTINARIO", label: "Trabajo no rutinario" },
  { value: "INCIDENTE_ACCIDENTE", label: "Incidente / accidente" },
  {
    value: "INDICADORES_DETERIORO",
    label: "Indicadores de deterioro operativo",
  },
  { value: "FRECUENCIA_PERIODICA", label: "Frecuencia periodica" },
  { value: "LICITACIONES_AUDITORIAS", label: "Licitaciones o auditorias" },
];

function getErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") return firstValue;
  }
  return "No se pudo crear el reporte IPERC.";
}

export default function ReporteIpercModal({
  open,
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState({
    motivo: "ACTIVIDAD_NUEVA",
    tarea: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      motivo: "ACTIVIDAD_NUEVA",
      tarea: "",
    });
    setSaving(false);
    setError("");
  }, [open]);

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.tarea.trim()) {
      setError("Escribe el nombre de la tarea.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await reporteIpercAPI.create({
        motivo: form.motivo,
        tarea: form.tarea.trim(),
      });
      onCreated?.(response.data);
      onClose?.();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo reporte IPERC" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div>
          <label className="text-sm font-semibold text-slate-700">Motivo</label>
          <select
            value={form.motivo}
            onChange={(event) => handleChange("motivo", event.target.value)}
            className={inputClassName}
          >
            {MOTIVO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">Tarea</label>
          <textarea
            value={form.tarea}
            onChange={(event) => handleChange("tarea", event.target.value)}
            className={`${inputClassName} min-h-[132px] resize-y`}
            placeholder="Escribe el nombre de la tarea que dara origen al IPERC."
          />
        </div>

        <div className="flex justify-end gap-2">
          <TableActionButton onClick={onClose} tone="neutral" disabled={saving}>
            Cancelar
          </TableActionButton>
          <TableActionButton type="submit" tone="success" disabled={saving}>
            {saving ? "Guardando..." : "Crear reporte"}
          </TableActionButton>
        </div>
      </form>
    </Modal>
  );
}
