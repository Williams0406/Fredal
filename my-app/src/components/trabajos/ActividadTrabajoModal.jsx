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
}) {
  const [form, setForm] = useState({
    tipo_actividad: "",
    tipo_mantenimiento: "",
    subtipo: "",
    descripcion: "",
  });

  const esRevision = form.tipo_actividad === "REVISION";
  const esMantenimiento = form.tipo_actividad === "MANTENIMIENTO";
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

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
     CARGAR ÍTEMS DE LA MAQUINARIA
  ========================= */
  useEffect(() => {
    if (!esMantenimiento) return;

    const loadItems = async () => {
      const res = await itemAPI.list();
      setItems(res.data);
    };

    loadItems();
  }, [esMantenimiento]);


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
  };

  const handleSave = async () => {
    const payload = {
      tipo_actividad: form.tipo_actividad,
      descripcion: form.descripcion,
      orden: trabajoId,
    };

    if (form.tipo_actividad === "MANTENIMIENTO") {
      payload.tipo_mantenimiento = form.tipo_mantenimiento;
      payload.subtipo = form.subtipo;
    }

    await actividadTrabajoAPI.create(payload);

    onSaved();
    onClose();
  };

  const puedeGuardar =
    form.tipo_actividad &&
    (
      esRevision ||
      (
        esMantenimiento &&
        form.tipo_mantenimiento &&
        form.subtipo
      )
    );

  /* =========================
     UI
  ========================= */
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-60"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold">Nueva actividad</h3>

        <Select
          label="Tipo de actividad"
          name="tipo_actividad"
          value={form.tipo_actividad}
          onChange={handleChange}
          options={TIPO_ACTIVIDAD}
        />

        <Select
          label="Tipo de mantenimiento"
          name="tipo_mantenimiento"
          value={form.tipo_mantenimiento}
          onChange={handleChange}
          options={TIPO_MANTENIMIENTO}
          disabled={esRevision}
        />

        <Select
          label="Subtipo"
          name="subtipo"
          value={form.subtipo}
          onChange={handleChange}
          options={subtipoOptions}
          disabled={esRevision || !form.tipo_mantenimiento}
        />

        <Textarea
          label="Descripción"
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
        />

        {esRevision && (
          <p className="text-xs text-gray-500">
            En una revisión no se registra mantenimiento
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onClose}>
            Cancelar
          </button>

          <button
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            onClick={handleSave}
            disabled={!puedeGuardar}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   CONTROLES BÁSICOS
========================= */
function Textarea({ label, ...props }) {
  return (
    <div>
      <label className="text-xs text-gray-600">{label}</label>
      <textarea {...props} className="w-full border rounded p-1 text-sm" />
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
