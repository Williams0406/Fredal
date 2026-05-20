"use client";

import { useEffect, useMemo, useState } from "react";
import { itemAPI, ordenRequerimientoAPI, proveedorAPI, trabajadorAPI, userAPI } from "@/lib/api";

const emptyRow = {
  item: "",
  cantidad: "1",
  unidad_medida: "",
  proveedor: "",
};

const normalizeRole = (role) =>
  String(role?.name || role?.nombre || role || "").toLowerCase().trim();

const parseCollection = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
};

const getItemUnidadLabel = (item) => {
  const unidadNombre = item?.unidad_medida_detalle?.nombre || item?.unidad_medida_nombre || "";
  const unidadSimbolo = item?.unidad_medida_detalle?.simbolo || item?.unidad_medida_simbolo || "";

  if (unidadNombre && unidadSimbolo) {
    return `${unidadNombre} (${unidadSimbolo})`;
  }

  return unidadNombre || unidadSimbolo || "Sin unidad configurada";
};

export default function OrdenRequerimientoFormModal({
  trabajoId,
  onCreated,
  triggerLabel = "Crear orden de requerimiento",
  disabled = false,
  disabledReason = "",
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [users, setUsers] = useState([]);
  const [rows, setRows] = useState([{ ...emptyRow }]);
  const [tecnicoAsignado, setTecnicoAsignado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    Promise.all([itemAPI.list(), proveedorAPI.list(), trabajadorAPI.list(), userAPI.list()])
      .then(([itemsRes, proveedoresRes, trabajadoresRes, usersRes]) => {
        setItems(parseCollection(itemsRes.data));
        setProveedores(parseCollection(proveedoresRes.data));
        setTrabajadores(parseCollection(trabajadoresRes.data));
        setUsers(parseCollection(usersRes.data));
      })
      .catch((err) => {
        console.error("Error cargando datos del requerimiento:", err);
      });
  }, [open]);

  const tecnicos = useMemo(() => {
    const rolesPorTrabajador = (users || []).reduce((acc, user) => {
      const trabajadorId = user.trabajador_id ?? user.trabajador?.id ?? user.trabajador;
      if (!trabajadorId) return acc;
      acc[trabajadorId] = (user.roles || []).map(normalizeRole);
      return acc;
    }, {});

    return (trabajadores || []).filter((trabajador) => {
      const roles = rolesPorTrabajador[trabajador.id] || [];
      return roles.includes("tecnico") || String(trabajador.puesto || "").toLowerCase().includes("tecnico");
    });
  }, [trabajadores, users]);

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  };

  const handleItemChange = (index, itemId) => {
    const selectedItem = items.find((item) => String(item.id) === String(itemId));
    setRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              item: itemId,
              unidad_medida: selectedItem?.unidad_medida ? String(selectedItem.unidad_medida) : "",
            }
          : row
      )
    );
  };

  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);
  const removeRow = (index) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const extractErrorMessage = (data) => {
    if (!data) return null;
    if (typeof data === "string") return data;
    if (typeof data.detail === "string") return data.detail;

    if (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) {
      return data.non_field_errors[0];
    }

    for (const value of Object.values(data)) {
      if (Array.isArray(value) && value[0]) return value[0];
      if (typeof value === "string") return value;
    }

    return null;
  };

  const handleSubmit = async () => {
    setError("");

    if (disabled) {
      setError(disabledReason || "Esta orden ya no permite emitir requerimientos.");
      return;
    }

    const payloadRows = rows
      .map((row) => ({
        item: Number(row.item),
        cantidad: Number(row.cantidad),
        unidad_medida: row.unidad_medida ? Number(row.unidad_medida) : null,
        proveedor: row.proveedor ? Number(row.proveedor) : null,
      }))
      .filter((row) => row.item && row.cantidad > 0);

    if (!trabajoId) {
      setError("Debes abrir un trabajo para emitir el requerimiento.");
      return;
    }

    if (!payloadRows.length) {
      setError("Debes agregar al menos un item válido.");
      return;
    }

    setLoading(true);
    try {
      await ordenRequerimientoAPI.create({
        trabajo: trabajoId,
        tecnico_asignado: tecnicoAsignado ? Number(tecnicoAsignado) : null,
        observaciones,
        items: payloadRows,
      });

      setOpen(false);
      setRows([{ ...emptyRow }]);
      setObservaciones("");
      setTecnicoAsignado("");
      onCreated?.();
    } catch (err) {
      console.error("Error creando orden de requerimiento:", err);
      setError(extractErrorMessage(err?.response?.data) || "No se pudo crear la orden de requerimiento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
        className="px-4 py-2.5 rounded-lg bg-[#84cc16] text-white text-sm font-medium hover:bg-[#65a30d] transition-colors disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full max-w-4xl rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#1e3a8a]">Nueva orden de requerimiento</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Solicita materiales para este trabajo y deja listo el técnico destino.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trabajador</label>
                  <select
                    value={tecnicoAsignado}
                    onChange={(event) => setTecnicoAsignado(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
                  >
                    <option value="">Asignar después</option>
                    {tecnicos.map((trabajador) => (
                      <option key={trabajador.id} value={trabajador.id}>
                        {trabajador.nombres} {trabajador.apellidos}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
                  <textarea
                    value={observaciones}
                    onChange={(event) => setObservaciones(event.target.value)}
                    rows={3}
                    placeholder="Indicaciones para almacén"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {rows.map((row, index) => {
                  const selectedItem = items.find((item) => String(item.id) === String(row.item));

                  return (
                    <div key={`req-row-${index}`} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-800">Item #{index + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Quitar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-5">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Item</label>
                          <select
                            value={row.item}
                            onChange={(event) => handleItemChange(index, event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          >
                            <option value="">Selecciona un item</option>
                            {items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.codigo} - {item.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Cantidad</label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={row.cantidad}
                            onChange={(event) => updateRow(index, "cantidad", event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Unidad</label>
                          <input
                            type="text"
                            disabled
                            value={selectedItem ? getItemUnidadLabel(selectedItem) : ""}
                            placeholder="Selecciona un item"
                            className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-gray-700"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor</label>
                          <select
                            value={row.proveedor}
                            onChange={(event) => updateRow(index, "proveedor", event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          >
                            <option value="">Sin proveedor definido</option>
                            {proveedores.map((proveedor) => (
                              <option key={proveedor.id} value={proveedor.id}>
                                {proveedor.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {selectedItem && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
                          <div className="rounded-lg bg-white border border-gray-200 px-3 py-2">
                            <span className="block text-gray-500">Código</span>
                            <span className="font-semibold text-gray-800">{selectedItem.codigo}</span>
                          </div>
                          <div className="rounded-lg bg-white border border-gray-200 px-3 py-2">
                            <span className="block text-gray-500">Nombre</span>
                            <span className="font-semibold text-gray-800">{selectedItem.nombre}</span>
                          </div>
                          <div className="rounded-lg bg-white border border-gray-200 px-3 py-2">
                            <span className="block text-gray-500">Unidad</span>
                            <span className="font-semibold text-gray-800">{getItemUnidadLabel(selectedItem)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addRow}
                className="px-4 py-2 rounded-lg border border-dashed border-[#1e3a8a] text-[#1e3a8a] text-sm font-medium hover:bg-blue-50"
              >
                Agregar item
              </button>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="px-4 py-2.5 rounded-lg bg-[#1e3a8a] text-white text-sm font-medium disabled:opacity-60"
              >
                {loading ? "Guardando..." : "Emitir requerimiento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
