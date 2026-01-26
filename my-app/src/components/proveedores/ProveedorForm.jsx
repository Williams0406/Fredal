import { useState } from "react";
import { proveedorAPI } from "@/lib/api";

export default function ProveedorForm({ onCreated }) {
  const [isOpen, setIsOpen] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    ruc: "",
    direccion: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await proveedorAPI.create(form);

    setForm({ nombre: "", ruc: "", direccion: "" });
    setIsOpen(false);        // 🔹 cerrar modal
    onCreated();             // 🔹 recargar tabla
  };

  return (
    <>
      {/* BOTÓN ABRIR MODAL */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Nuevo proveedor
      </button>

      {/* MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-md rounded shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Nuevo proveedor
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                name="nombre"
                placeholder="Nombre"
                value={form.nombre}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />

              <input
                name="ruc"
                placeholder="RUC"
                value={form.ruc}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />

              <input
                name="direccion"
                placeholder="Dirección"
                value={form.direccion}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
