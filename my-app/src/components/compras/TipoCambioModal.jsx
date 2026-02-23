"use client";

import { useEffect, useMemo, useState } from "react";
import { tipoCambioAPI } from "@/lib/api";

const buildInitialForm = () => ({
  fecha: new Date().toISOString().split("T")[0],
  compra_usd: "",
  venta_usd: "",
  compra_eur: "",
  venta_eur: "",
});

export default function TipoCambioModal({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(buildInitialForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tiposCambio, setTiposCambio] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  const resetForm = () => {
    setForm(buildInitialForm());
    setEditingId(null);
    setError("");
  };

  const loadTiposCambio = async () => {
    try {
      const res = await tipoCambioAPI.list();
      setTiposCambio(res.data);
    } catch (err) {
      console.error("Error cargando tipos de cambio", err);
    }
  };

  useEffect(() => {
    if (open) {
      loadTiposCambio();
    }
  }, [open]);

  const validarFormulario = () => {
    if (!form.fecha || !form.compra_usd || !form.venta_usd || !form.compra_eur || !form.venta_eur) {
      setError("Completa fecha y tipos de cambio para USD y EUR.");
      return false;
    }
    return true;
  };

  const payload = {
    fecha: form.fecha,
    compra_usd: Number(form.compra_usd),
    venta_usd: Number(form.venta_usd),
    compra_eur: Number(form.compra_eur),
    venta_eur: Number(form.venta_eur),
  };

  const handleSubmit = async () => {
    setError("");
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      if (isEditing) {
        await tipoCambioAPI.update(editingId, payload);
      } else {
        await tipoCambioAPI.create(payload);
      }

      await loadTiposCambio();
      resetForm();
      onCreated?.();
    } catch (err) {
      const detail = err.response?.data;
      if (detail?.fecha?.length) {
        setError(detail.fecha[0]);
      } else {
        setError(isEditing ? "No se pudo actualizar el tipo de cambio." : "No se pudo registrar el tipo de cambio.");
      }
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (tc) => {
    setEditingId(tc.id);
    setForm({
      fecha: tc.fecha,
      compra_usd: String(tc.compra_usd ?? ""),
      venta_usd: String(tc.venta_usd ?? ""),
      compra_eur: String(tc.compra_eur ?? ""),
      venta_eur: String(tc.venta_eur ?? ""),
    });
    setError("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border border-[#1e3a8a] text-[#1e3a8a] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50"
      >
        Tipo de cambio
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => {
            setOpen(false);
            resetForm();
          }}
        >
          <div
            className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1e3a8a]">
                {isEditing ? "Editar tipo de cambio diario" : "Registrar tipo de cambio diario"}
              </h3>
              <button
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                    disabled={isEditing}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Compra USD</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.compra_usd}
                    onChange={(e) => setForm((prev) => ({ ...prev, compra_usd: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                    placeholder="3.7200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Venta USD</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.venta_usd}
                    onChange={(e) => setForm((prev) => ({ ...prev, venta_usd: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                    placeholder="3.7600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Compra EUR</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.compra_eur}
                    onChange={(e) => setForm((prev) => ({ ...prev, compra_eur: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                    placeholder="4.0500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Venta EUR</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.venta_eur}
                    onChange={(e) => setForm((prev) => ({ ...prev, venta_eur: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                    placeholder="4.1200"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
                >
                  {loading ? "Guardando..." : isEditing ? "Actualizar tipo de cambio" : "Guardar tipo de cambio"}
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar edición
                  </button>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Tipos de cambio registrados</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2">Fecha</th>
                        <th className="text-right px-3 py-2">Compra USD</th>
                        <th className="text-right px-3 py-2">Venta USD</th>
                        <th className="text-right px-3 py-2">Compra EUR</th>
                        <th className="text-right px-3 py-2">Venta EUR</th>
                        <th className="text-center px-3 py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiposCambio.map((tc) => (
                        <tr key={tc.id} className="border-t border-gray-100">
                          <td className="px-3 py-2">{tc.fecha}</td>
                          <td className="px-3 py-2 text-right">{Number(tc.compra_usd).toFixed(4)}</td>
                          <td className="px-3 py-2 text-right">{Number(tc.venta_usd).toFixed(4)}</td>
                          <td className="px-3 py-2 text-right">{Number(tc.compra_eur).toFixed(4)}</td>
                          <td className="px-3 py-2 text-right">{Number(tc.venta_eur).toFixed(4)}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => startEdit(tc)}
                              className="px-3 py-1.5 text-xs font-medium border border-[#1e3a8a] text-[#1e3a8a] rounded-lg hover:bg-blue-50"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {tiposCambio.length === 0 && (
                        <tr>
                          <td className="px-3 py-3 text-gray-500" colSpan={6}>
                            Aún no hay tipos de cambio registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}