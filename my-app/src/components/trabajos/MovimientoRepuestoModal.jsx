"use client";

import { useEffect, useState } from "react";
import {
  itemAPI,
  movimientoConsumibleAPI,
  movimientoRepuestoAPI,
  unidadMedidaAPI,
  unidadRelacionAPI,
} from "@/lib/api";
import ItemGroupSelector from "@/components/items/ItemGroupSelector";

export default function MovimientoRepuestoModal({ open, onClose, actividad, onSaved }) {
  const [items, setItems] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [unidadesMedida, setUnidadesMedida] = useState([]);
  const [relaciones, setRelaciones] = useState([]);
  const [movimientosDB, setMovimientosDB] = useState([]);
  const [movimientosNew, setMovimientosNew] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  const [form, setForm] = useState({
    item: "",
    estado_unidad: "NUEVO",
    cantidad: 1,
    unidad_conversion: "",
  });

  const movimientos = [...movimientosDB, ...movimientosNew];
  const movimientosFiltrados = movimientos.filter((m) => m.tipo === "CONSUMIBLE" || m.estado !== "INOPERATIVO");
  
  useEffect(() => {
    if (open) {
      setForm({ item: "", estado_unidad: "NUEVO", cantidad: 1, unidad_conversion: "" });
      setUnidades([]);
      setMovimientosNew([]);
    }
  }, [open]);

  useEffect(() => {
    itemAPI.list().then((res) => setItems(res.data));
    unidadMedidaAPI.list().then((res) =>
      setUnidadesMedida(res.data.filter((u) => u.activo))
    );
    unidadRelacionAPI.list().then((res) => setRelaciones(res.data));
  }, []);

  useEffect(() => {
    if (!form.item) {
      setUnidades([]);
      return;
    }

    const selectedItem = items.find((i) => String(i.id) === String(form.item));
    if (selectedItem?.tipo_insumo === "CONSUMIBLE") {
      setUnidades([]);
      return;
    }

    setLoading(true);
    itemAPI
      .unidadesAsignables(form.item, { actividad: actividad.id })
      .then((res) => setUnidades(res.data))
      .finally(() => setLoading(false));
  }, [form.item, actividad?.id, items]);

  useEffect(() => {
    if (!actividad?.id) return;

    Promise.all([
      movimientoRepuestoAPI.list({ actividad: actividad.id }),
      movimientoConsumibleAPI.list({ actividad: actividad.id }),
    ]).then(([repuestoRes, consumibleRes]) => {
      const repuestos = repuestoRes.data.map((m) => ({
        id: m.id,
        tipo: "REPUESTO",
        item_id: m.item_id,
        item_codigo: m.item_codigo,
        item_nombre: m.item_nombre,
        unidad_id: m.item_unidad,
        unidad_serie: m.unidad_serie,
        estado: m.estado,
      }));

      const consumibles = consumibleRes.data.map((m) => ({
        id: m.id,
        tipo: "CONSUMIBLE",
        item_id: m.item_id,
        item_codigo: m.item_codigo,
        item_nombre: m.item_nombre,
        cantidad: m.cantidad,
        unidad_medida: m.unidad_medida_detalle || "",
      }));

      setMovimientosDB([...repuestos, ...consumibles]);
    });
  }, [actividad]);

  useEffect(() => {
    if (!actividad?.id) return;
    setForm({ item: "", estado_unidad: "NUEVO", cantidad: 1, unidad_conversion: "" });
    setUnidades([]);
    setMovimientosNew([]);
    setMovimientosDB([]);
  }, [actividad?.id]);

  if (!open) return null;

  if (actividad?.tipo_actividad !== "MANTENIMIENTO") {
    return <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}><div className="bg-white rounded-xl w-full max-w-md" onClick={(e)=>e.stopPropagation()}><div className="border-b border-gray-200 px-6 py-4"><h3 className="text-xl font-semibold text-[#1e3a8a]">Repuestos</h3></div><div className="px-6 py-6"><p className="text-sm text-gray-700">Los repuestos solo se registran en actividades de mantenimiento.</p></div><div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex justify-end"><button className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg" onClick={onClose}>Cerrar</button></div></div></div>;
  }

  const selectedItem = items.find((i) => String(i.id) === String(form.item));
  const esConsumible = selectedItem?.tipo_insumo === "CONSUMIBLE";
  const unidadesConsumible = unidadesMedida.filter(
    (u) => u.activo && u.dimension === selectedItem?.dimension
  );

  const unidadesDisponiblesCount = unidades.filter(
    (u) => u.estado === form.estado_unidad
  ).length;

  const handleAddUnidad = () => {
    if (!form.item || !form.cantidad) return;
    const item = selectedItem;
    const cantidad = Number(form.cantidad) || 0;
    if (!item || cantidad <= 0) return;

    if (item.tipo_insumo === "CONSUMIBLE") {
      const stockBase = Number(item.stock ?? item.unidades_disponibles ?? 0);
      let stockDisponible = stockBase;
      if (form.unidad_conversion) {
        const unidadSeleccionada = unidadesMedida.find(
          (u) => String(u.id) === String(form.unidad_conversion)
        );
        if (unidadSeleccionada && item.unidad_medida_detalle) {
          if (String(unidadSeleccionada.id) === String(item.unidad_medida_detalle.id)) {
            stockDisponible = stockBase;
          } else {
            const relacion = relaciones.find(
              (rel) =>
                String(rel.unidad_base) === String(item.unidad_medida_detalle.id) &&
                String(rel.unidad_relacionada) === String(unidadSeleccionada.id)
            );
            if (relacion) {
              stockDisponible = stockBase * Number(relacion.factor);
            }
          }
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
            ? (unidadesMedida.find((u) => String(u.id) === String(form.unidad_conversion))?.nombre || item.unidad_medida_detalle?.nombre)
            : item.unidad_medida_detalle?.nombre,
          unidad_conversion: form.unidad_conversion || "",
        },
      ]);
      setForm({ item: "", estado_unidad: "NUEVO", cantidad: 1, unidad_conversion: "" });
      return;
    }

    if (!form.estado_unidad) return;
    const unidadesDisponibles = unidades.filter(
      (u) => u.estado === form.estado_unidad && !movimientos.some((m) => String(m.unidad_id) === String(u.id))
    );
    if (unidadesDisponibles.length < cantidad) {
      alert("No hay suficientes unidades disponibles con ese estado");
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
      })),
    ]);
    setForm({ item: "", estado_unidad: "NUEVO", cantidad: 1, unidad_conversion: "" });
  };

  const handleApplyGroup = async (group) => {
    if (!group?.items?.length || !actividad?.id) return;

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
        });
        continue;
      }

      const unidadesRes = await itemAPI.unidadesAsignables(item.id, { actividad: actividad.id });
      const cantidadUnidades = Math.floor(cantidad);
      const disponibles = (unidadesRes.data || []).filter(
        (unidad) =>
          unidad.estado === "NUEVO" &&
          !movimientos.some((movimiento) => String(movimiento.unidad_id) === String(unidad.id)) &&
          !nuevosMovimientos.some((movimiento) => String(movimiento.unidad_id) === String(unidad.id))
      );

      if (disponibles.length < cantidadUnidades) {
        alert(`No hay suficientes unidades NUEVAS para ${item.nombre}.`);
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
    setMovimientosNew((prev) =>
      prev.filter((m) => m !== movimiento)
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const nuevos = movimientos.filter((m) => !m.id)
      for (const m of nuevos) {
        if (m.tipo === "CONSUMIBLE") {
          await movimientoConsumibleAPI.create({
            actividad: actividad.id,
            item: m.item_id,
            cantidad: Number(m.cantidad),
            unidad_medida: m.unidad_conversion ? Number(m.unidad_conversion) : null,
          });
        } else {
          await movimientoRepuestoAPI.create({ actividad: actividad.id, item_unidad: m.unidad_id });
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

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e)=>e.stopPropagation()}>
        <div className="border-b border-gray-200 px-6 py-4"><h3 className="text-xl font-semibold text-[#1e3a8a]">Movimiento de Items</h3></div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <ItemGroupSelector
            onApply={handleApplyGroup}
          />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm mb-2">Item</label>
              <input className="w-full px-3 py-2 border rounded" value={itemSearch} onChange={(e)=>{setItemSearch(e.target.value);setShowItemDropdown(true);setForm((p)=>({...p,item:"",estado_unidad:"NUEVO",cantidad:1,unidad_conversion:""}));}} />
              {showItemDropdown && itemSearch && <div className="absolute z-30 bg-white border rounded mt-1 max-h-56 overflow-y-auto">{itemsFiltrados.map((i)=><button type="button" key={i.id} className="block w-full text-left px-3 py-2 hover:bg-blue-50" onClick={()=>{setForm((p)=>({...p,item:String(i.id)}));setItemSearch(`${i.codigo} - ${i.nombre}`);setShowItemDropdown(false);}}>{i.codigo} - {i.nombre}</button>)}</div>}
            </div>
            <div><label className="block text-sm mb-2">Cantidad</label><input type="number" min={esConsumible ? "0.01" : "1"} step={esConsumible ? "0.01" : "1"} className="w-full px-3 py-2 border rounded" value={form.cantidad} onChange={(e)=>setForm((p)=>({...p,cantidad:e.target.value}))} /></div>
            <div>
              {esConsumible ? <><label className="block text-sm mb-2">Unidad</label><select className="w-full px-3 py-2 border rounded" value={form.unidad_conversion} onChange={(e)=>setForm((p)=>({...p,unidad_conversion:e.target.value}))}><option value="">{selectedItem?.unidad_medida_detalle?.nombre ? `Por defecto: ${selectedItem.unidad_medida_detalle.nombre}` : "Selecciona unidad"}</option>{unidadesConsumible.map((u)=><option key={u.id} value={u.id}>{u.nombre}{u.simbolo ? ` (${u.simbolo})` : ""}</option>)}</select></> : <><label className="block text-sm mb-2">Unidad</label><input disabled className="w-full px-3 py-2 border rounded bg-gray-50" value={selectedItem?.unidad_medida_detalle?.nombre || ""} /></>}
            </div>
            <div>
              <label className="block text-sm mb-2">Estado</label>
              {esConsumible ? <input disabled className="w-full px-3 py-2 border rounded bg-gray-50 font-medium" value="NUEVO" /> : <><select className="w-full px-3 py-2 border rounded" value={form.estado_unidad} onChange={(e)=>setForm((p)=>({...p,estado_unidad:e.target.value}))}><option value="">Seleccione estado</option><option value="NUEVO">NUEVO</option><option value="USADO">USADO</option><option value="REPARADO">REPARADO</option></select><p className="text-xs text-gray-500 mt-1">Disponibles: {unidadesDisponiblesCount}</p></>}
            </div>

            <div className="flex items-end"><button className="w-full px-4 py-2 bg-[#84cc16] text-white rounded" onClick={handleAddUnidad}>Agregar</button></div>
          </div>
          <table className="w-full text-sm"><thead><tr><th className="text-left">Código</th><th className="text-left">Item</th><th className="text-left">Detalle</th><th className="text-left">Estado</th><th className="text-left">Acción</th></tr></thead><tbody>{movimientosFiltrados.map((m,i)=><tr key={i}><td>{m.item_codigo}</td><td>{m.item_nombre}</td><td>{m.tipo==="CONSUMIBLE"?`${Number(m.cantidad).toFixed(2)} ${m.unidad_medida || ""}`:m.unidad_serie}</td><td>{m.tipo==="CONSUMIBLE"?"NUEVO":m.estado}</td><td>{m.id ? <span className="text-gray-400 text-xs">Guardado</span> : <button type="button" className="text-red-600 hover:text-red-800" onClick={()=>handleRemoveMovimiento(i)}>Borrar</button>}</td></tr>)}</tbody></table>
        </div>
        <div className="border-t px-6 py-4 flex justify-end gap-2"><button className="px-4 py-2 border rounded" onClick={onClose}>Cancelar</button><button className="px-4 py-2 bg-[#1e3a8a] text-white rounded" onClick={handleSave} disabled={loading}>Guardar</button></div>
      </div>
    </div>
  );
}