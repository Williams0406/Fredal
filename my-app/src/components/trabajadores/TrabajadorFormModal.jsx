"use client";

export default function TrabajadorFormModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Nuevo trabajador</h2>

        <form onSubmit={onSubmit} className="space-y-3">
          {[
            ["nombres", "Nombres"],
            ["apellidos", "Apellidos"],
            ["dni", "DNI"],
            ["puesto", "Puesto"],
          ].map(([key, label]) => (
            <input
              key={key}
              placeholder={label}
              value={form[key]}
              onChange={(e) =>
                setForm({ ...form, [key]: e.target.value })
              }
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
