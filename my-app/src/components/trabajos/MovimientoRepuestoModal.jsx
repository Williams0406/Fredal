"use client";

import { useEffect, useMemo, useState } from "react";
import {
  itemAPI,
  movimientoConsumibleAPI,
  movimientoRepuestoAPI,
  trabajoAPI,
  trabajadorAPI,
  unidadMedidaAPI,
  unidadRelacionAPI,
} from "@/lib/api";
import ItemGroupSelector from "@/components/items/ItemGroupSelector";

export default function MovimientoRepuestoModal({ open, onClose, actividad, onSaved }) {
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
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

  const [form, setForm] = useState({
    proveedor: "",
    tecnico: "",
    item: "",
    estado_unidad: "NUEVO",
    cantidad: 1,
    unidad_conversion: "",
  });

  const movimientos = [...movimientosDB, ...movimientosNew];
  const esActividadPlanificada = Boolean(actividad?.es_planificada);
  const requiereProveedorTecnico = esActividadPlanificada;
  const selectedItem = items.find((i) => String(i.id) === String(form.item));
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

  const resetForm = () => {
    setForm({
      proveedor: "",
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
  };
  
  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  useEffect(() => {
    itemAPI.proveedoresDisponibles().then((res) => setProveedores(res.data || []));
    unidadMedidaAPI.list().then((res) => setUnidadesMedida(res.data || []));
    unidadRelacionAPI.list().then((res) => setRelaciones(res.data || []));
  }, []);

  useEffect(() => {
    if (!open || !actividad?.orden) return;

    Promise.all([trabajoAPI.retrieve(actividad.orden), trabajadorAPI.list()]).then(
      ([trabajoRes, trabajadoresRes]) => {
        const ids = trabajoRes.data?.tecnicos || [];
        const all = trabajadoresRes.data || [];
        setTecnicosAsignados(all.filter((t) => ids.includes(t.id)));
      }
    );
  }, [open, actividad?.orden]);

  useEffect(() => {
    itemAPI
      .list({ ...(form.proveedor ? { proveedor: form.proveedor } : {}), disponibles: 1 })
      .then((res) => setItems(res.data || []));
  }, [form.proveedor]);

  useEffect(() => {
    if (!form.item || selectedItem?.tipo_insumo === "CONSUMIBLE") {
      setUnidades([]);
      return;
    }

    setLoading(true);
    itemAPI
      .unidadesAsignables(form.item, {
        actividad: actividad.id,
        ...(form.proveedor ? { proveedor: form.proveedor } : {}),
      })
      .then((res) => setUnidades(res.data || []))
      .finally(() => setLoading(false));
  }, [form.item, form.proveedor, actividad?.id, selectedItem?.tipo_insumo]);

  useEffect(() => {
    if (!form.item || !selectedItem || selectedItem.tipo_insumo !== "CONSUMIBLE") {
      setStockConsumibleProveedor(0);
      return;
    }

    itemAPI
      .lotesDisponibles(form.item, { ...(form.proveedor ? { proveedor: form.proveedor } : {}) })
      .then((res) => setStockConsumibleProveedor(Number(res.data?.cantidad_disponible || 0)));
  }, [form.item, form.proveedor, selectedItem]);

  useEffect(() => {
    if (!actividad?.id) return;

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
        tecnico_nombre: m.tecnico_nombre || "",
      }));

      setMovimientosDB([...repuestos, ...consumibles]);
    });
  }, [actividad?.id]);

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
    if (requiereProveedorTecnico && (!form.proveedor || !form.tecnico)) return;

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
    if (requiereProveedorTecnico && !form.tecnico) {
      alert("Selecciona un técnico asignado antes de aplicar el grupo");
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
        ...(form.proveedor ? { proveedor: form.proveedor } : {}),
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

  const handleSave = async () => {
    setLoading(true);
    try {
      const nuevos = movimientos.filter((m) => !m.id);
      for (const m of nuevos) {
        if (m.tipo === "CONSUMIBLE") {
          await movimientoConsumibleAPI.create({
            actividad: actividad.id,
            item: m.item_id,
            cantidad: Number(m.cantidad),
            unidad_medida: m.unidad_conversion ? Number(m.unidad_conversion) : null,
            proveedor: requiereProveedorTecnico && form.proveedor ? Number(form.proveedor) : null,
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
      onSaved?.();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al guardar movimientos");
    } finally {
      setLoading(false);
    }
  };

  const itemsFiltrados = items.filter((i) => `${i.codigo} ${i.nombre}`.toLowerCase().includes(itemSearch.toLowerCase()));

  const canAddMovimiento = !requiereProveedorTecnico || (form.proveedor && form.tecnico);

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl" onClick={(e)=>e.stopPropagation()}>
        <div className="border-b border-gray-200 px-6 py-5 bg-gradient-to-r from-slate-50 to-blue-50 rounded-t-2xl">
          <h3 className="text-xl font-semibold text-[#1e3a8a]">Movimiento de Items</h3>
          <p className="text-sm text-slate-600 mt-1">Selecciona primero el item y luego completa la asignación para registrarlo en la actividad.</p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <ItemGroupSelector onApply={handleApplyGroup} />

          {requiereProveedorTecnico && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <strong>Orden sugerido:</strong> Item → Cantidad → Unidad → Estado → Proveedor → Técnico asignado.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="md:col-span-2 relative">
              <label className="block text-sm mb-2">Item</label>
              <input
                className="w-full px-3 py-2 border rounded-lg bg-white"
                placeholder="Buscar item"
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setShowItemDropdown(true);
                  setForm((p) => ({ ...p, item: "", estado_unidad: "NUEVO", cantidad: 1, unidad_conversion: "" }));
                }}
              />
              {showItemDropdown && itemSearch && (
                <div className="absolute z-30 bg-white border rounded-lg mt-1 max-h-56 overflow-y-auto shadow-lg w-full">
                  {itemsFiltrados.map((i) => (
                    <button key={i.id} type="button" className="block w-full text-left px-3 py-2 hover:bg-blue-50" onClick={() => { setForm((p) => ({ ...p, item: String(i.id) })); setItemSearch(`${i.codigo} - ${i.nombre}`); setShowItemDropdown(false); }}>
                      {i.codigo} - {i.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div><label className="block text-sm mb-2">Cantidad</label><input type="number" min={esConsumible ? "0.01" : "1"} step={esConsumible ? "0.01" : "1"} className="w-full px-3 py-2 border rounded" value={form.cantidad} onChange={(e)=>setForm((p)=>({...p,cantidad:e.target.value}))} /></div>
            <div>{esConsumible ? <><label className="block text-sm mb-2">Unidad</label><select className="w-full px-3 py-2 border rounded" value={form.unidad_conversion} onChange={(e)=>setForm((p)=>({...p,unidad_conversion:e.target.value}))}><option value="">{selectedItem?.unidad_medida_detalle?.nombre ? `Por defecto: ${selectedItem.unidad_medida_detalle.nombre}` : "Selecciona unidad"}</option>{unidadesConsumible.map((u)=><option key={u.id} value={u.id}>{u.nombre}{u.simbolo ? ` (${u.simbolo})` : ""}</option>)}</select></> : <><label className="block text-sm mb-2">Unidad</label><input disabled className="w-full px-3 py-2 border rounded bg-gray-50" value={selectedItem?.unidad_medida_detalle?.nombre || ""} /></>}</div>
            <div><label className="block text-sm mb-2">Estado</label>{esConsumible ? <input disabled className="w-full px-3 py-2 border rounded bg-gray-50 font-medium" value="NUEVO" /> : <><select className="w-full px-3 py-2 border rounded" value={form.estado_unidad} onChange={(e)=>setForm((p)=>({...p,estado_unidad:e.target.value}))}><option value="">Seleccione estado</option><option value="NUEVO">NUEVO</option><option value="USADO">USADO</option><option value="REPARADO">REPARADO</option></select><p className="text-xs text-gray-500 mt-1">Disponibles: {unidadesDisponiblesCount}</p></>}</div>

            {requiereProveedorTecnico && (
              <>
                <div>
                  <label className="block text-sm mb-2">Proveedor</label>
                  <select className="w-full px-3 py-2 border rounded-lg bg-white" value={form.proveedor} onChange={(e) => setForm((p) => ({ ...p, proveedor: e.target.value }))}>
                    <option value="">Selecciona proveedor</option>
                    {proveedores.map((p) => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Técnico asignado</label>
                  <select className="w-full px-3 py-2 border rounded-lg bg-white" value={form.tecnico} onChange={(e) => setForm((p) => ({ ...p, tecnico: e.target.value }))}>
                    <option value="">Selecciona técnico</option>
                    {tecnicosAsignados.map((t) => (<option key={t.id} value={t.id}>{t.nombres} {t.apellidos}</option>))}
                  </select>
                </div>
              </>
            )}

            <div className="flex items-end"><button disabled={!canAddMovimiento} className="w-full px-4 py-2 bg-[#84cc16] text-white rounded-lg disabled:bg-gray-300" onClick={handleAddUnidad}>Agregar</button></div>
          </div>
          
          {esConsumible && selectedItem && (
            <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded p-2">
              Stock disponible {form.proveedor ? "del proveedor" : "total"} en unidad base ({selectedItem?.unidad_medida_detalle?.nombre || "-"}): <strong>{Number(stockConsumibleProveedor || 0).toFixed(2)}</strong>
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Código</th>
                <th className="text-left">Item</th>
                <th className="text-left">Detalle</th>
                {requiereProveedorTecnico && <th className="text-left">Técnico</th>}
                <th className="text-left">Estado</th>
                <th className="text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {movimientosFiltrados.map((m,i)=>(
                <tr key={i}>
                  <td>{m.item_codigo}</td>
                  <td>{m.item_nombre}</td>
                  <td>{m.tipo==="CONSUMIBLE"?`${Number(m.cantidad).toFixed(2)} ${m.unidad_medida || ""}`:m.unidad_serie}</td>
                  {requiereProveedorTecnico && <td>{m.tecnico_nombre || "-"}</td>}
                  <td>{m.tipo==="CONSUMIBLE"?"NUEVO":m.estado}</td>
                  <td>{m.id ? <span className="text-gray-400 text-xs">Guardado</span> : <button type="button" className="text-red-600 hover:text-red-800" onClick={()=>handleRemoveMovimiento(i)}>Borrar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t px-6 py-4 flex justify-end gap-2"><button className="px-4 py-2 border rounded" onClick={onClose}>Cancelar</button><button className="px-4 py-2 bg-[#1e3a8a] text-white rounded" onClick={handleSave} disabled={loading}>Guardar</button></div>
      </div>
    </div>
  );
}