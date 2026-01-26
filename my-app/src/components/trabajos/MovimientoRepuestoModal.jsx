"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { itemAPI, movimientoRepuestoAPI } from "@/lib/api";

export default function MovimientoRepuestoModal({
  open,
  onClose,
  actividad,
  onSaved,
}) {

    /* ================== STATE ================== */

  const [items, setItems] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [movimientosDB, setMovimientosDB] = useState([]); // existentes
  const [movimientosNew, setMovimientosNew] = useState([]); // nuevos

  const [form, setForm] = useState({
    item: "",
    item_unidad: "",
  });
  
  const movimientos = [
    ...movimientosDB,
    ...movimientosNew,
  ];

  const movimientosFiltrados = movimientos.filter(
    (m) =>
      m.estado !== "INOPERATIVO"
  );

  /* ================== DATA ================== */

  useEffect(() => {
    if (open) {
      setForm({ item: "", item_unidad: "" });
      setUnidades([]);
      setMovimientosNew([]);
    }
  }, [open]);

  useEffect(() => {
    itemAPI.list().then((res) => setItems(res.data));
  }, []);

  useEffect(() => {
    if (!form.item) {
      setUnidades([]);
      return;
    }

    itemAPI.unidadesAsignables(form.item, {
      actividad: actividad.id,
    }).then((res) => {
      setUnidades(res.data);
    });
  }, [form.item, actividad?.id, movimientosNew]);

  useEffect(() => {
    if (!actividad?.id) return;

    movimientoRepuestoAPI.list({
      actividad: actividad.id,
    }).then((res) => {
      setMovimientosDB(
        res.data.map((m) => ({
          id: m.id,
          item_id: m.item_id,
          item_codigo: m.item_codigo,
          item_nombre: m.item_nombre,
          unidad_id: m.item_unidad,
          unidad_serie: m.unidad_serie,
          estado: m.estado,
        }))
      );
    });
  }, [actividad]);

  useEffect(() => {
    if (!actividad?.id) return;

    setForm({
      item: "",
      item_unidad: "",
    });

    setUnidades([]);
    setMovimientosNew([]);
    setMovimientosDB([]);
  }, [actividad?.id]);

  if (actividad?.tipo_actividad !== "MANTENIMIENTO") {
    return (
      <div
        className="fixed inset-0 bg-black/40 z-60 flex items-center justify-center"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-semibold mb-2">Repuestos</h3>
          <p className="text-sm text-gray-600 mb-4">
            Los repuestos solo se registran en actividades de mantenimiento
          </p>
          <div className="flex justify-end">
            <button
              className="px-3 py-1 text-sm border rounded"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================== HELPERS ================== */

  const handleAddUnidad = () => {
    if (!form.item || !form.item_unidad) return;

    const item = items.find(
      (i) => String(i.id) === String(form.item)
    );

    const unidad = unidades.find(
      (u) => String(u.id) === String(form.item_unidad)
    );

    if (!item || !unidad) return;

    setMovimientosNew((prev) => {
      // evitar duplicar el mismo item
      const filtrados = prev.filter(
        (m) => m.item_id !== item.id
      );

      return [
        ...filtrados,
        {
          item_id: item.id,
          item_codigo: item.codigo,
          item_nombre: item.nombre,
          unidad_id: unidad.id,
          unidad_serie: unidad.serie || `Unidad #${unidad.id}`,
          estado: unidad.estado,
        },
      ];
    });

    setForm({
      item: "",
      item_unidad: "",
    });

    setUnidades([]);
  };

  const handleRemove = (movimiento) => {
    setMovimientosNew((prev) =>
      prev.filter((m) => m !== movimiento)
    );
  };

  const handleSave = async () => {
    const nuevos = movimientos.filter((m) => !m.id);

    for (const m of nuevos) {
      await movimientoRepuestoAPI.create({
        actividad: actividad.id,
        item_unidad: m.unidad_id,
      });
    }

    onSaved?.();
    onClose();
  };

  /* ================== UI ================== */

  return (
    <div
      className="fixed inset-0 bg-black/40 z-60 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-3xl p-6 space-y-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-semibold">
            Movimiento de Repuestos
          </h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Item"
            value={form.item}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                item: e.target.value,
                item_unidad: "",
              }))
            }
            options={items.map((i) => ({
              value: String(i.id),
              label: `${i.codigo} - ${i.nombre}`,
            }))}
          />

          <Select
            label="Unidad"
            value={form.item_unidad}
            onChange={(e) =>
              setForm((p) => ({ ...p, item_unidad: e.target.value }))
            }
            options={unidades.map((u) => ({
              value: String(u.id),
              label: `${u.serie || `Unidad #${u.id}`} (${u.estado})`,
            }))}
          />

        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleAddUnidad}
            disabled={!form.item || !form.item_unidad}
          >
            Agregar unidad
          </Button>
        </div>

        {movimientosFiltrados.length > 0 && (
          <div className="border rounded-md p-3">
            <h4 className="font-semibold mb-2">
              Unidades agregadas
            </h4>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th>Item</th>
                  <th>Unidad</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {movimientosFiltrados.map((m, i) => (
                  <tr key={i} className="border-b">
                    <td>{m.item_codigo} - {m.item_nombre}</td>
                    <td>{m.unidad_serie}</td>
                    <td>{m.estado}</td>
                    <td className="text-right">
                      <Button
                        variant="ghost"
                        onClick={() => handleRemove(m)}
                      >
                        Quitar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={movimientosFiltrados.length === 0}
          >
            Guardar movimientos
          </Button>
        </div>
      </div>
    </div>
  );
}

function Select({ label, options = [], ...props }) {
  return (
    <div>
      <label className="text-xs text-gray-600">{label}</label>
      <select {...props} className="w-full border rounded p-1 text-sm">
        <option value="">---</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
