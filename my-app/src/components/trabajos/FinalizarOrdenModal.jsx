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

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await trabajoAPI.finalizar(trabajo.id, form);
      onFinalizado(res.data); // 👈 devolver el trabajo
    } catch (err) {
      setError(err.response?.data || "Error al finalizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold">
          Finalizar orden {trabajo.codigo_orden}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="time"
            value={form.hora_inicio}
            onChange={(e) =>
              setForm({ ...form, hora_inicio: e.target.value })
            }
            className="border rounded p-1 text-sm"
          />

          <input
            type="time"
            value={form.hora_fin}
            onChange={(e) =>
              setForm({ ...form, hora_fin: e.target.value })
            }
            className="border rounded p-1 text-sm"
          />

          <input
            type="number"
            value={form.horometro}
            onChange={(e) =>
              setForm({ ...form, horometro: e.target.value })
            }
            placeholder="Horómetro"
            className="border rounded p-1 text-sm col-span-2"
          />

          <select
            value={form.estado_equipo}
            onChange={(e) =>
              setForm({ ...form, estado_equipo: e.target.value })
            }
            className="border rounded p-1 text-sm col-span-2"
          >
            <option value="">Estado equipo</option>
            <option value="OPERATIVO">Operativo</option>
            <option value="INOPERATIVO">Inoperativo</option>
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-600">
            {JSON.stringify(error)}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1 border rounded"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>

          <button
            className="px-3 py-1 bg-red-600 text-white rounded"
            onClick={handleSubmit}
            disabled={saving}
          >
            Finalizar orden
          </button>
        </div>
      </div>
    </div>
  );
}
