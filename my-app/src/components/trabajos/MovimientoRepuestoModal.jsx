"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  actividadTrabajoAPI,
  itemAPI,
  movimientoConsumibleAPI,
  movimientoRepuestoAPI,
  trabajoAPI,
  trabajadorAPI,
  unidadMedidaAPI,
  unidadRelacionAPI,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ItemGroupSelector from "@/components/items/ItemGroupSelector";

const MAX_EVIDENCIAS_PENDIENTES = 10;
const MAX_EVIDENCIA_SIZE_MB = 10;
const MAX_EVIDENCIA_SIZE_BYTES = MAX_EVIDENCIA_SIZE_MB * 1024 * 1024;

const createPendingEvidence = (file) => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
  file,
  previewUrl: URL.createObjectURL(file),
});

const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function MovimientoRepuestoModal({
  open,
  onClose,
  actividad,
  onSaved,
  canManagePlannedActivities = false,
}) {
  const { trabajador } = useAuth();
  const [items, setItems] = useState([]);
  const [tecnicosAsignados, setTecnicosAsignados] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [unidadesMedida, setUnidadesMedida] = useState([]);
  const [relaciones, setRelaciones] = useState([]);
  const [movimientosDB, setMovimientosDB] = useState([]);
  const [movimientosNew, setMovimientosNew] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [stockConsumibleProveedor, setStockConsumibleProveedor] = useState(0);
  const [evidenciasGuardadas, setEvidenciasGuardadas] = useState([]);
  const [evidenciasPendientes, setEvidenciasPendientes] = useState([]);
  const [evidenciaError, setEvidenciaError] = useState("");
  const [removingEvidenceId, setRemovingEvidenceId] = useState(null);
  const itemSelectorRef = useRef(null);

  const [form, setForm] = useState({
    tecnico: "",
    item: "",
    estado_unidad: "NUEVO",
    cantidad: 1,
    unidad_conversion: "",
  });

  const movimientos = [...movimientosDB, ...movimientosNew];
  const esActividadPlanificada = Boolean(actividad?.es_planificada);
  const esActividadRealizada = !esActividadPlanificada;
  const canManageEvidencias = esActividadRealizada || canManagePlannedActivities;
  const selectedItem = items.find((i) => String(i.id) === String(form.item));
  const selectedItemLabel = selectedItem ? `${selectedItem.codigo} - ${selectedItem.nombre}` : "";
  const esConsumible = selectedItem?.tipo_insumo === "CONSUMIBLE";

  const tecnicoSeleccionado = useMemo(
    () => tecnicosAsignados.find((t) => String(t.id) === String(form.tecnico)),
    [tecnicosAsignados, form.tecnico]
  );
  const tecnicoNombreSeleccionado = tecnicoSeleccionado
    ? `${tecnicoSeleccionado.nombres} ${tecnicoSeleccionado.apellidos}`.trim()
    : "";

  const movimientosFiltrados = movimientos.filter(
    (m) => m.tipo === "CONSUMIBLE" || m.estado !== "INOPERATIVO"
  );
  
  useEffect(() => {
    if (!open) return;

    setForm({
      tecnico: "",
      item: "",
      estado_unidad: "NUEVO",
      cantidad: 1,
      unidad_conversion: "",
    });
    setUnidades([]);
    setMovimientosNew([]);
    setMovimientosDB([]);
    setItemSearch("");
    setStockConsumibleProveedor(0);
    setEvidenciasPendientes([]);
    setEvidenciasGuardadas(Array.isArray(actividad?.evidencias) ? actividad.evidencias : []);
    setEvidenciaError("");
    setRemovingEvidenceId(null);
  }, [open, actividad]);

  useEffect(() => () => {
    evidenciasPendientes.forEach((evidencia) => {
      if (evidencia.previewUrl) {
        URL.revokeObjectURL(evidencia.previewUrl);
      }
    });
  }, [evidenciasPendientes]);

  useEffect(() => {
    unidadMedidaAPI.list().then((res) => setUnidadesMedida(res.data || []));
    unidadRelacionAPI.list().then((res) => setRelaciones(res.data || []));
  }, []);

  useEffect(() => {
    if (!showItemDropdown) return undefined;

    const handleClickOutside = (event) => {
      if (itemSelectorRef.current && !itemSelectorRef.current.contains(event.target)) {
        setShowItemDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showItemDropdown]);

  useEffect(() => {
    if (!open || !actividad?.orden) return;

    Promise.all([trabajoAPI.retrieve(actividad.orden), trabajadorAPI.list()]).then(
      ([trabajoRes, trabajadoresRes]) => {
        const ids = trabajoRes.data?.tecnicos || [];
        const all = trabajadoresRes.data || [];
        const asignados = all
          .filter((t) => ids.includes(t.id))
          .sort((left, right) => ids.indexOf(left.id) - ids.indexOf(right.id));

        setTecnicosAsignados(asignados);

        const tecnicoActual =
          (trabajador?.id && asignados.find((t) => String(t.id) === String(trabajador.id))) ||
          asignados[0] ||
          null;

        setForm((prev) => {
          const tecnicoPrevio = asignados.find((t) => String(t.id) === String(prev.tecnico));
          return {
            ...prev,
            tecnico: tecnicoPrevio
              ? String(tecnicoPrevio.id)
              : tecnicoActual
                ? String(tecnicoActual.id)
                : "",
          };
        });
      }
    );
  }, [open, actividad?.orden, trabajador?.id]);

  useEffect(() => {
    if (!actividad?.id || !form.tecnico) {
      setItems([]);
      return;
    }

    itemAPI
      .list({
        actividad: actividad.id,
        ...(form.tecnico ? { tecnico: form.tecnico } : {}),
        disponibles: 1,
      })
      .then((res) => setItems(res.data || []));
  }, [actividad?.id, form.tecnico]);

  useEffect(() => {
    if (!form.item || selectedItem?.tipo_insumo === "CONSUMIBLE") {
      setUnidades([]);
      return;
    }

    setLoading(true);
    itemAPI
      .unidadesAsignables(form.item, {
        actividad: actividad.id,
        ...(form.tecnico ? { tecnico: form.tecnico } : {}),
      })
      .then((res) => setUnidades(res.data || []))
      .finally(() => setLoading(false));
  }, [form.item, form.tecnico, actividad?.id, selectedItem?.tipo_insumo]);

  useEffect(() => {
    if (!form.item || !selectedItem || selectedItem.tipo_insumo !== "CONSUMIBLE") {
      setStockConsumibleProveedor(0);
      return;
    }

    itemAPI
      .lotesDisponibles(form.item, {
        actividad: actividad.id,
        ...(form.tecnico ? { tecnico: form.tecnico } : {}),
      })
      .then((res) => setStockConsumibleProveedor(Number(res.data?.cantidad_disponible || 0)));
  }, [form.item, form.tecnico, actividad?.id, selectedItem]);

  useEffect(() => {
    if (!actividad?.id || !form.tecnico) {
      setMovimientosDB([]);
      return;
    }

    Promise.all([
      movimientoRepuestoAPI.list({ actividad: actividad.id }),
      movimientoConsumibleAPI.list({ actividad: actividad.id }),
    ]).then(([repuestoRes, consumibleRes]) => {
      const repuestos = (repuestoRes.data || []).map((m) => ({
        id: m.id,
        tipo: "REPUESTO",
        item_id: m.item_id,
        item_codigo: m.item_codigo,
        item_nombre: m.item_nombre,
        unidad_id: m.item_unidad,
        unidad_serie: m.unidad_serie,
        estado: m.estado,
        tecnico: m.tecnico ? Number(m.tecnico) : m.tecnico_id ? Number(m.tecnico_id) : null,
        tecnico_nombre: m.tecnico_nombre || "",
      }));

      const consumibles = (consumibleRes.data || []).map((m) => ({
        id: m.id,
        tipo: "CONSUMIBLE",
        item_id: m.item_id,
        item_codigo: m.item_codigo,
        item_nombre: m.item_nombre,
        cantidad: m.cantidad,
        unidad_medida: m.unidad_medida_detalle || "",
        tecnico: m.tecnico ? Number(m.tecnico) : m.tecnico_id ? Number(m.tecnico_id) : null,
        tecnico_nombre: m.tecnico_nombre || "",
      }));

      setMovimientosDB(
        [...repuestos, ...consumibles].filter(
          (movimiento) => String(movimiento.tecnico || "") === String(form.tecnico)
        )
      );
    });
  }, [actividad?.id, form.tecnico]);

  if (!open) return null;

  if (actividad?.tipo_actividad !== "MANTENIMIENTO") {
    return <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}><div className="bg-white rounded-xl w-full max-w-md" onClick={(e)=>e.stopPropagation()}><div className="border-b border-gray-200 px-6 py-4"><h3 className="text-xl font-semibold text-[#1e3a8a]">Repuestos</h3></div><div className="px-6 py-6"><p className="text-sm text-gray-700">Los repuestos solo se registran en actividades de mantenimiento.</p></div><div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex justify-end"><button className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg" onClick={onClose}>Cerrar</button></div></div></div>;
  }

  const unidadesConsumible = unidadesMedida.filter((u) => u.dimension === selectedItem?.dimension);
  const unidadesDisponiblesCount = esActividadPlanificada
    ? unidades.filter((u) => u.estado === form.estado_unidad).length
    : unidades.length;

  const handleAddUnidad = () => {
    if (!form.item || !form.cantidad) return;
    if (!form.tecnico) return;

    const item = selectedItem;
    const cantidad = Number(form.cantidad) || 0;
    if (!item || cantidad <= 0) return;

    if (item.tipo_insumo === "CONSUMIBLE") {
      let stockDisponible = Number(stockConsumibleProveedor || 0);
      if (form.unidad_conversion) {
        const unidadSel = unidadesMedida.find((u) => String(u.id) === String(form.unidad_conversion));
        if (unidadSel && item.unidad_medida_detalle && String(unidadSel.id) !== String(item.unidad_medida_detalle.id)) {
          const relacion = relaciones.find(
            (rel) =>
              String(rel.unidad_base) === String(item.unidad_medida_detalle.id) &&
              String(rel.unidad_relacionada) === String(unidadSel.id)
          );
          if (relacion) stockDisponible = stockDisponible * Number(relacion.factor);
        }
      }
      
      if (cantidad > stockDisponible) {
        alert("La cantidad excede el stock disponible");
        return;
      }

      setMovimientosNew((prev) => [
        ...prev,
        {
          tipo: "CONSUMIBLE",
          item_id: item.id,
          item_codigo: item.codigo,
          item_nombre: item.nombre,
          cantidad,
          unidad_medida: form.unidad_conversion
            ? unidadesMedida.find((u) => String(u.id) === String(form.unidad_conversion))?.nombre || item.unidad_medida_detalle?.nombre
            : item.unidad_medida_detalle?.nombre,
          unidad_conversion: form.unidad_conversion || "",
          tecnico: form.tecnico,
          tecnico_nombre: tecnicoNombreSeleccionado,
        },
      ]);
      
      setForm((prev) => ({ ...prev, item: "", estado_unidad: "NUEVO", cantidad: 1, unidad_conversion: "" }));
      setItemSearch("");
      return;
    }

    const unidadesDisponibles = unidades.filter((u) => {
      const noRegistrada = !movimientos.some((m) => String(m.unidad_id) === String(u.id));
      if (!noRegistrada) return false;
      return esActividadPlanificada ? u.estado === form.estado_unidad : true;
    });

    if (unidadesDisponibles.length < cantidad) {
      alert(esActividadPlanificada
        ? "No hay suficientes unidades disponibles con ese estado"
        : "No hay suficientes unidades disponibles según lo planificado"
      );
      return;
    }

    setMovimientosNew((prev) => [
      ...prev,
      ...unidadesDisponibles.slice(0, cantidad).map((u) => ({
        tipo: "REPUESTO",
        item_id: item.id,
        item_codigo: item.codigo,
        item_nombre: item.nombre,
        unidad_id: u.id,
        unidad_serie: u.serie || `Unidad #${u.id}`,
        estado: u.estado,
        tecnico: form.tecnico,
        tecnico_nombre: tecnicoNombreSeleccionado,
      })),
    ]);
    
    setForm((prev) => ({ ...prev, item: "", estado_unidad: "NUEVO", cantidad: 1, unidad_conversion: "" }));
    setItemSearch("");
  };

  const handleApplyGroup = async (group) => {
    if (!group?.items?.length || !actividad?.id) return;
    if (!form.tecnico) {
      alert("Asigna primero un técnico a la orden para aplicar el grupo");
      return;
    }

    const nuevosMovimientos = [];

    for (const groupItem of group.items) {
      const item = items.find((it) => String(it.id) === String(groupItem.item));
      if (!item) continue;

      const cantidad = Number(groupItem.cantidad) || 0;
      if (cantidad <= 0) continue;

      if (item.tipo_insumo === "CONSUMIBLE") {
        nuevosMovimientos.push({
          tipo: "CONSUMIBLE",
          item_id: item.id,
          item_codigo: item.codigo,
          item_nombre: item.nombre,
          cantidad,
          unidad_medida: groupItem.unidad_nombre || item.unidad_medida_detalle?.nombre || "",
          unidad_conversion: groupItem.unidad_medida ? String(groupItem.unidad_medida) : "",
          tecnico: form.tecnico,
          tecnico_nombre: tecnicoNombreSeleccionado,
        });
        continue;
      }

      const unidadesRes = await itemAPI.unidadesAsignables(item.id, {
        actividad: actividad.id,
        ...(form.tecnico ? { tecnico: form.tecnico } : {}),
      });

      const cantidadUnidades = Math.floor(cantidad);
      const disponibles = (unidadesRes.data || []).filter((unidad) => {
        const noExiste =
          !movimientos.some((m) => String(m.unidad_id) === String(unidad.id)) &&
          !nuevosMovimientos.some((m) => String(m.unidad_id) === String(unidad.id));
        if (!noExiste) return false;
        return esActividadPlanificada ? unidad.estado === "NUEVO" : true;
      });

      if (disponibles.length < cantidadUnidades) {
        alert(`No hay suficientes unidades disponibles para ${item.nombre}.`);
        continue;
      }

      nuevosMovimientos.push(
        ...disponibles.slice(0, cantidadUnidades).map((unidad) => ({
          tipo: "REPUESTO",
          item_id: item.id,
          item_codigo: item.codigo,
          item_nombre: item.nombre,
          unidad_id: unidad.id,
          unidad_serie: unidad.serie || `Unidad #${unidad.id}`,
          estado: unidad.estado,
          tecnico: form.tecnico,
          tecnico_nombre: tecnicoNombreSeleccionado,
        }))
      );
    }

    if (nuevosMovimientos.length) {
      setMovimientosNew((prev) => [...prev, ...nuevosMovimientos]);
    }
  };

  const handleRemoveMovimiento = (index) => {
    const movimiento = movimientosFiltrados[index];
    if (!movimiento || movimiento.id) return;
    setMovimientosNew((prev) => prev.filter((m) => m !== movimiento));
  };

  const handleEvidenciasChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (!selectedFiles.length) return;

    const invalidFiles = selectedFiles.filter((file) => !file.type.startsWith("image/"));
    if (invalidFiles.length) {
      setEvidenciaError("Solo se permiten archivos de imagen como evidencia.");
      return;
    }

    const oversizedFiles = selectedFiles.filter((file) => file.size > MAX_EVIDENCIA_SIZE_BYTES);
    if (oversizedFiles.length) {
      setEvidenciaError(`Cada imagen debe pesar como maximo ${MAX_EVIDENCIA_SIZE_MB} MB.`);
      return;
    }

    setEvidenciaError("");

    setEvidenciasPendientes((prev) => {
      const existingKeys = new Set(
        prev.map((entry) => `${entry.file.name}-${entry.file.size}-${entry.file.lastModified}`)
      );

      const remainingSlots = Math.max(MAX_EVIDENCIAS_PENDIENTES - prev.length, 0);
      const filesToAdd = selectedFiles
        .filter((file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`))
        .slice(0, remainingSlots);

      if (filesToAdd.length < selectedFiles.length) {
        setEvidenciaError(
          `Se admiten hasta ${MAX_EVIDENCIAS_PENDIENTES} evidencias pendientes por carga.`
        );
      }

      return [...prev, ...filesToAdd.map(createPendingEvidence)];
    });
  };

  const handleRemovePendingEvidence = (evidenciaId) => {
    setEvidenciasPendientes((prev) => {
      const evidencia = prev.find((entry) => entry.id === evidenciaId);
      if (evidencia?.previewUrl) {
        URL.revokeObjectURL(evidencia.previewUrl);
      }
      return prev.filter((entry) => entry.id !== evidenciaId);
    });
  };

  const handleRemoveSavedEvidence = async (evidenciaId) => {
    if (!actividad?.id || removingEvidenceId) return;

    const confirmed = window.confirm("Esta evidencia se eliminara de la actividad. Deseas continuar?");
    if (!confirmed) return;

    setRemovingEvidenceId(evidenciaId);
    try {
      const response = await actividadTrabajoAPI.eliminarEvidencia(actividad.id, evidenciaId);
      setEvidenciasGuardadas(response.data?.evidencias || []);
      await onSaved?.();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || "No se pudo eliminar la evidencia.");
    } finally {
      setRemovingEvidenceId(null);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (canManageEvidencias && evidenciasPendientes.length) {
        const uploadRes = await actividadTrabajoAPI.subirEvidencias(
          actividad.id,
          evidenciasPendientes.map((entry) => entry.file)
        );
        setEvidenciasGuardadas(uploadRes.data?.evidencias || []);
        setEvidenciasPendientes([]);
      }

      const nuevos = movimientos.filter((m) => !m.id);
      for (const m of nuevos) {
        if (m.tipo === "CONSUMIBLE") {
          await movimientoConsumibleAPI.create({
            actividad: actividad.id,
            item: m.item_id,
            cantidad: Number(m.cantidad),
            unidad_medida: m.unidad_conversion ? Number(m.unidad_conversion) : null,
            tecnico: m.tecnico ? Number(m.tecnico) : null,
          });
        } else {
          await movimientoRepuestoAPI.create({
            actividad: actividad.id,
            item_unidad: m.unidad_id,
            tecnico: m.tecnico ? Number(m.tecnico) : null,
          });
        }
      }
      await onSaved?.();
      onClose();
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.detail ||
          "Error al guardar movimientos o evidencias"
      );
    } finally {
      setLoading(false);
    }
  };

  const itemsFiltrados = items.filter((i) => {
    const term = itemSearch.trim().toLowerCase();
    const mostrarTodo = !term || (selectedItemLabel && term === selectedItemLabel.toLowerCase());
    return mostrarTodo
      ? true
      : `${i.codigo} ${i.nombre}`.toLowerCase().includes(term);
  });

  const canAddMovimiento = Boolean(form.tecnico);
  const totalEvidencias = evidenciasGuardadas.length + evidenciasPendientes.length;

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl" onClick={(e)=>e.stopPropagation()}>
        <div className="border-b border-gray-200 px-6 py-5 bg-gradient-to-r from-slate-50 to-blue-50 rounded-t-2xl">
          <h3 className="text-xl font-semibold text-[#1e3a8a]">Movimiento de Items</h3>
          <p className="text-sm text-slate-600 mt-1">Selecciona ítem, completa los datos y agrega al listado antes de guardar.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-white border text-slate-700">Registros: {movimientosFiltrados.length}</span>
            <span className="px-2.5 py-1 rounded-full bg-white border text-slate-700">Nuevos: {movimientosNew.length}</span>
            <span className="px-2.5 py-1 rounded-full bg-white border text-slate-700">Guardados: {movimientosDB.length}</span>
            {canManageEvidencias && <span className="px-2.5 py-1 rounded-full bg-white border text-slate-700">Evidencias: {totalEvidencias}</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <ItemGroupSelector onApply={handleApplyGroup} />

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {tecnicoSeleccionado ? (
                <>
                  Materiales filtrados por el técnico asignado a la OT:{" "}
                  <strong>{tecnicoNombreSeleccionado}</strong>.
                </>
              ) : (
                <>
                  Asigna un técnico a la orden para ver y planificar solo los items que tiene
                  disponibles.
                </>
              )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="md:col-span-12">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tecnico</label>
              <select
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm"
                value={form.tecnico}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    tecnico: value,
                    item: "",
                    estado_unidad: "NUEVO",
                    cantidad: 1,
                    unidad_conversion: "",
                  }));
                  setItemSearch("");
                }}
              >
                <option value="">Selecciona un tecnico</option>
                {tecnicosAsignados.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {`${tecnico.nombres} ${tecnico.apellidos}`.trim()}
                  </option>
                ))}
              </select>
            </div>

            <div ref={itemSelectorRef} className="md:col-span-4 relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Item</label>
              <input
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#1e3a8a]"
                placeholder={items.length ? "Buscar por código o nombre" : "Sin items disponibles"}
                value={itemSearch}
                onClick={() => setShowItemDropdown(true)}
                onFocus={() => setShowItemDropdown(true)}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setShowItemDropdown(true);
                  setForm((p) => ({ ...p, item: "", estado_unidad: "NUEVO", cantidad: 1, unidad_conversion: "" }));
                }}
              />
              {showItemDropdown && (
                <div className="absolute z-30 bg-white border border-gray-200 rounded-lg mt-1 max-h-56 overflow-y-auto shadow-lg w-full">
                  {itemsFiltrados.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500">Sin items disponibles.</p>
                  ) : (
                    itemsFiltrados.map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                        onClick={() => {
                          setForm((p) => ({ ...p, item: String(i.id) }));
                          setItemSearch(`${i.codigo} - ${i.nombre}`);
                          setShowItemDropdown(false);
                        }}
                      >
                        {i.codigo} - {i.nombre}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cantidad</label>
              <input type="number" min={esConsumible ? "0.01" : "1"} step={esConsumible ? "0.01" : "1"} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" value={form.cantidad} onChange={(e)=>setForm((p)=>({...p,cantidad:e.target.value}))} />
            </div>

            <div className="md:col-span-2">
              {esConsumible ? (
                <>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unidad</label>
                  <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" value={form.unidad_conversion} onChange={(e)=>setForm((p)=>({...p,unidad_conversion:e.target.value}))}>
                    <option value="">{selectedItem?.unidad_medida_detalle?.nombre ? `Base: ${selectedItem.unidad_medida_detalle.nombre}` : "Selecciona unidad"}</option>
                    {unidadesConsumible.map((u)=><option key={u.id} value={u.id}>{u.nombre}{u.simbolo ? ` (${u.simbolo})` : ""}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unidad</label>
                  <input disabled className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm" value={selectedItem?.unidad_medida_detalle?.nombre || ""} />
                </>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
              {esConsumible ? (
                <input disabled className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 font-medium text-sm" value="NUEVO" />
              ) : (
                <>
                  <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" value={form.estado_unidad} onChange={(e)=>setForm((p)=>({...p,estado_unidad:e.target.value}))}>
                    <option value="">Seleccione estado</option>
                    <option value="NUEVO">NUEVO</option>
                    <option value="USADO">USADO</option>
                    <option value="REPARADO">REPARADO</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Disponibles: {unidadesDisponiblesCount}</p>
                </>
              )}
            </div>

            <div className="md:col-span-2 flex items-end">
              <button disabled={!canAddMovimiento} className="w-full px-4 py-2.5 bg-[#84cc16] text-white rounded-lg text-sm font-medium disabled:bg-gray-300" onClick={handleAddUnidad}>Agregar al listado</button>
            </div>
          </div>

          {esConsumible && selectedItem && (
            <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
              Stock disponible en unidad base ({selectedItem?.unidad_medida_detalle?.nombre || "-"}): <strong>{Number(stockConsumibleProveedor || 0).toFixed(2)}</strong>
            </div>
          )}

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Detalle</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {movimientosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">Aún no hay movimientos en el listado.</td>
                    </tr>
                  ) : (
                    movimientosFiltrados.map((m,i)=>(
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{m.item_codigo}</td>
                        <td className="px-4 py-3">{m.item_nombre}</td>
                        <td className="px-4 py-3">{m.tipo==="CONSUMIBLE"?`${Number(m.cantidad).toFixed(2)} ${m.unidad_medida || ""}`:m.unidad_serie}</td>
                        <td className="px-4 py-3">{m.tipo==="CONSUMIBLE"?"NUEVO":m.estado}</td>
                        <td className="px-4 py-3">{m.id ? <span className="text-gray-400 text-xs">Guardado</span> : <button type="button" className="text-red-600 hover:text-red-800 font-medium" onClick={()=>handleRemoveMovimiento(i)}>Borrar</button>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {canManageEvidencias && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Evidencias de trabajo</h4>
                  <p className="text-xs text-slate-600">
                    Puedes adjuntar varias fotos para respaldar esta actividad. En Railway usa Cloudinary si las variables estan configuradas; en local guarda en `media/`.
                  </p>
                </div>

                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">
                  Agregar imagenes
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleEvidenciasChange}
                  />
                </label>
              </div>

              {evidenciaError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {evidenciaError}
                </div>
              )}

              {evidenciasPendientes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pendientes por subir
                  </p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {evidenciasPendientes.map((evidencia) => (
                      <div key={evidencia.id} className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
                        <img
                          src={evidencia.previewUrl}
                          alt={evidencia.file.name}
                          className="h-32 w-full object-cover"
                        />
                        <div className="space-y-2 p-3">
                          <p className="truncate text-xs font-medium text-slate-700">{evidencia.file.name}</p>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                            <span>{formatFileSize(evidencia.file.size)}</span>
                            <button
                              type="button"
                              className="font-medium text-red-600 hover:text-red-800"
                              onClick={() => handleRemovePendingEvidence(evidencia.id)}
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {evidenciasGuardadas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Evidencias guardadas
                  </p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {evidenciasGuardadas.map((evidencia) => (
                      <div
                        key={evidencia.id}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                      >
                        <a
                          href={evidencia.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <img
                            src={evidencia.url}
                            alt={evidencia.nombre || `Evidencia ${evidencia.id}`}
                            className="h-32 w-full object-cover"
                          />
                        </a>
                        <div className="space-y-2 p-3">
                          <p className="truncate text-xs font-medium text-slate-700">
                            {evidencia.nombre || `Evidencia ${evidencia.id}`}
                          </p>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                            <a
                              href={evidencia.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-slate-600 hover:text-[#1e3a8a]"
                            >
                              Ver
                            </a>
                            <button
                              type="button"
                              className="font-medium text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:text-red-300"
                              onClick={() => handleRemoveSavedEvidence(evidencia.id)}
                              disabled={removingEvidenceId === evidencia.id}
                            >
                              {removingEvidenceId === evidencia.id ? "Quitando..." : "Eliminar"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-2 bg-white">
          <button className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm" onClick={onClose}>Cancelar</button>
          <button className="px-4 py-2.5 bg-[#1e3a8a] text-white rounded-lg text-sm font-medium disabled:opacity-60" onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Guardar movimientos"}</button>
        </div>
      </div>
    </div>
  );
}
