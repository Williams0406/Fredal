"use client";

import { useEffect, useMemo, useState } from "react";
import { maquinariaAPI, trabajoAPI, trabajadorAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

import KanbanBoard from "@/components/trabajos/KanbanBoard";
import TrabajoFormModal from "@/components/trabajos/TrabajoFormModal";
import TrabajoDetalleModal from "@/components/trabajos/TrabajoDetalleModal";
import {
  ClipboardList,
  Clock,
  Settings,
  CheckCircle,
  AlertTriangle,
  Filter,
  Search,
} from "lucide-react";

const initialFilters = {
  prioridad: "",
  lugar: "",
  fechaDesde: "",
  fechaHasta: "",
  maquinariaId: "",
  tecnicoId: "",
  tipoActividad: "",
  tipoMantenimiento: "",
  item: "",
};

const prettyLabel = (value = "") =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function TrabajosPage() {
  const { roles, trabajador } = useAuth();
  const [trabajos, setTrabajos] = useState([]);
  const [maquinarias, setMaquinarias] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleId, setDetalleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState(initialFilters);

  const loadTrabajos = async () => {
    setLoading(true);
    try {
      const res = await trabajoAPI.list();
      setTrabajos(res.data);
    } catch (error) {
      console.error("Error cargando trabajos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
     let mounted = true;

    const bootstrap = async () => {
      setLoading(true);
      try {
        const [trabajosRes, maquinariasRes, tecnicosRes] = await Promise.all([
          trabajoAPI.list(),
          maquinariaAPI.list(),
          trabajadorAPI.list(),
        ]);

        if (!mounted) return;
        setTrabajos(trabajosRes.data);
        setMaquinarias(maquinariasRes.data);
        setTecnicos(tecnicosRes.data);
      } catch (error) {
        console.error("Error cargando datos de trabajos:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const normalizeRole = (role) => {
    if (!role) return "";
    if (typeof role === "string") return role.toLowerCase();
    return (role.name || role.nombre || "").toLowerCase();
  };

  const isTecnico = roles.map((role) => normalizeRole(role)).includes("tecnico");
  const trabajadorId = trabajador?.id ?? trabajador;
  const isTrabajoAsignado = (trabajo) =>
    Array.isArray(trabajo?.tecnicos) && trabajadorId
      ? trabajo.tecnicos.includes(trabajadorId)
      : false;
  
  const tecnicoLookup = useMemo(
    () =>
      tecnicos.reduce((acc, tecnico) => {
        acc[tecnico.id] = `${tecnico.nombres || ""} ${tecnico.apellidos || ""}`.trim() || `Técnico #${tecnico.id}`;
        return acc;
      }, {}),
    [tecnicos]
  );

  const maquinariaLookup = useMemo(
    () =>
      maquinarias.reduce((acc, maquinaria) => {
        acc[maquinaria.id] = `${maquinaria.codigo_maquina} · ${maquinaria.nombre}`;
        return acc;
      }, {}),
    [maquinarias]
  );

  const optionSets = useMemo(() => {
    const actividad = new Set();
    const mantenimiento = new Set();
    const items = new Set();

    trabajos.forEach((trabajo) => {
      (trabajo.actividades || []).forEach((act) => {
        if (act.tipo_actividad) actividad.add(act.tipo_actividad);
        if (act.tipo_mantenimiento) mantenimiento.add(act.tipo_mantenimiento);
        (act.repuestos || []).forEach((rep) => {
          if (rep.item_nombre) items.add(rep.item_nombre);
        });
        (act.consumibles || []).forEach((cons) => {
          if (cons.item_nombre) items.add(cons.item_nombre);
        });
      });
    });

    return {
      tipoActividad: Array.from(actividad).sort(),
      tipoMantenimiento: Array.from(mantenimiento).sort(),
      items: Array.from(items).sort((a, b) => a.localeCompare(b)),
    };
  }, [trabajos]);

  const handleStatusChange = async (id, nuevoEstatus) => {
    if (isTecnico && !isTrabajoAsignado(trabajos.find((t) => t.id === id))) return;

    setTrabajos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, estatus: nuevoEstatus } : t
      )
    );

    try {
      await trabajoAPI.patch(id, { estatus: nuevoEstatus });
    } catch (error) {
      console.error("Error actualizando estado", error);
      loadTrabajos();
    }
  };

  const handleDelete = async (id) => {
    if (isTecnico && !isTrabajoAsignado(trabajos.find((t) => t.id === id))) return;
    if (!confirm("¿Estás seguro de eliminar esta orden de trabajo?")) return;

    try {
      await trabajoAPI.delete(id);
      loadTrabajos();
    } catch (error) {
      console.error("Error eliminando trabajo:", error);
      alert("Error al eliminar la orden de trabajo");
    }
  };

  const handleEdit = (trabajo) => {
    if (isTecnico && !isTrabajoAsignado(trabajo)) return;
    setSelected(trabajo);
    setModalOpen(true);
  };

  const handleView = (trabajo) => {
    if (isTecnico && !isTrabajoAsignado(trabajo)) return;
    setDetalleId(trabajo.id);
    setDetalleOpen(true);
  };

  const trabajosFiltrados = trabajos.filter((t) => {
    if (isTecnico && !isTrabajoAsignado(t)) return false;
    if (filtros.prioridad && t.prioridad !== filtros.prioridad) return false;
    if (filtros.lugar && t.lugar !== filtros.lugar) return false;
    if (filtros.maquinariaId && String(t.maquinaria) !== String(filtros.maquinariaId)) return false;
    if (filtros.tecnicoId && !t.tecnicos?.includes(Number(filtros.tecnicoId))) return false;
    if (filtros.fechaDesde && t.fecha < filtros.fechaDesde) return false;
    if (filtros.fechaHasta && t.fecha > filtros.fechaHasta) return false;

    const actividades = t.actividades || [];

    if (filtros.tipoActividad && !actividades.some((a) => a.tipo_actividad === filtros.tipoActividad)) return false;
    if (filtros.tipoMantenimiento && !actividades.some((a) => a.tipo_mantenimiento === filtros.tipoMantenimiento)) return false;

    if (filtros.item) {
      const needle = filtros.item.toLowerCase().trim();
      const hayItem = actividades.some((a) => {
        const repuestos = (a.repuestos || []).some((r) => `${r.item_codigo || ""} ${r.item_nombre || ""}`.toLowerCase().includes(needle));
        const consumibles = (a.consumibles || []).some((c) => `${c.item_codigo || ""} ${c.item_nombre || ""}`.toLowerCase().includes(needle));
        return repuestos || consumibles;
      });
      if (!hayItem) return false;
    }

    return true;
  });

  const stats = {
    total: trabajosFiltrados.length,
    pendientes: trabajosFiltrados.filter((t) => t.estatus === "PENDIENTE").length,
    enProceso: trabajosFiltrados.filter((t) => t.estatus === "EN_PROCESO").length,
    finalizados: trabajosFiltrados.filter((t) => t.estatus === "FINALIZADO").length,
    urgentes: trabajosFiltrados.filter((t) => t.prioridad === "URGENTE" || t.prioridad === "EMERGENCIA").length,
  };

  const hasFilters = Object.values(filtros).some(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">Órdenes de Trabajo</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión y seguimiento de mantenimiento</p>
        </div>

        <button
          className="bg-[#1e3a8a] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1e3a8a]/90 transition-all duration-200 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isTecnico}
          onClick={() => {
            if (isTecnico) return;
            setSelected(null);
            setModalOpen(true);
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva Orden
        </button>
      </div>

      {isTecnico && (
        <p className="text-sm text-gray-500">Los técnicos solo pueden visualizar e interactuar con órdenes asignadas.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Total" value={stats.total} icon={ClipboardList} color="blue" />
        <KPICard label="Pendientes" value={stats.pendientes} icon={Clock} color="gray" />
        <KPICard label="En Proceso" value={stats.enProceso} icon={Settings} color="blue" />
        <KPICard label="Finalizados" value={stats.finalizados} icon={CheckCircle} color="green" />
        <KPICard label="Urgentes" value={stats.urgentes} icon={AlertTriangle} color="red" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Filtros avanzados</p>
              <p className="text-xs text-gray-500">Encuentra órdenes por fecha, maquinaria, técnicos, actividades y items asignados</p>
            </div>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => setFiltros(initialFilters)}
              className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1.5 rounded-lg"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3">
          <FieldSelect label="Prioridad" value={filtros.prioridad} onChange={(valor) => setFiltros((prev) => ({ ...prev, prioridad: valor }))} className="xl:col-span-2">
            <option value="">Todas</option>
            <option value="REGULAR">Regular</option>
            <option value="URGENTE">Urgente</option>
            <option value="EMERGENCIA">Emergencia</option>
          </FieldSelect>

          <FieldSelect label="Lugar" value={filtros.lugar} onChange={(valor) => setFiltros((prev) => ({ ...prev, lugar: valor }))} className="xl:col-span-2">
            <option value="">Todos</option>
            <option value="TALLER">Taller</option>
            <option value="CAMPO">Campo</option>
          </FieldSelect>

          <FieldSelect label="Maquinaria" value={filtros.maquinariaId} onChange={(valor) => setFiltros((prev) => ({ ...prev, maquinariaId: valor }))} className="xl:col-span-4">
            <option value="">Todas las máquinas</option>
            {maquinarias.map((maq) => (
              <option key={maq.id} value={maq.id}>{maq.codigo_maquina} · {maq.nombre}</option>
            ))}
          </FieldSelect>

          <FieldSelect label="Técnico asignado" value={filtros.tecnicoId} onChange={(valor) => setFiltros((prev) => ({ ...prev, tecnicoId: valor }))} className="xl:col-span-4">
            <option value="">Todos los técnicos</option>
            {tecnicos.map((tec) => (
              <option key={tec.id} value={tec.id}>{`${tec.nombres} ${tec.apellidos}`.trim()}</option>
            ))}
          </FieldSelect>

          <FieldInput label="Fecha desde" type="date" value={filtros.fechaDesde} onChange={(valor) => setFiltros((prev) => ({ ...prev, fechaDesde: valor }))} className="xl:col-span-2" />
          <FieldInput label="Fecha hasta" type="date" value={filtros.fechaHasta} onChange={(valor) => setFiltros((prev) => ({ ...prev, fechaHasta: valor }))} className="xl:col-span-2" />

          <FieldSelect label="Tipo de actividad" value={filtros.tipoActividad} onChange={(valor) => setFiltros((prev) => ({ ...prev, tipoActividad: valor }))} className="xl:col-span-3">
            <option value="">Todas</option>
            {optionSets.tipoActividad.map((tipo) => (
              <option key={tipo} value={tipo}>{prettyLabel(tipo)}</option>
            ))}
          </FieldSelect>

          <FieldSelect label="Tipo de mantenimiento" value={filtros.tipoMantenimiento} onChange={(valor) => setFiltros((prev) => ({ ...prev, tipoMantenimiento: valor }))} className="xl:col-span-3">
            <option value="">Todos</option>
            {optionSets.tipoMantenimiento.map((tipo) => (
              <option key={tipo} value={tipo}>{prettyLabel(tipo)}</option>
            ))}
          </FieldSelect>

          <div className="xl:col-span-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Item asignado</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                list="items-trabajo"
                value={filtros.item}
                onChange={(e) => setFiltros((prev) => ({ ...prev, item: e.target.value }))}
                placeholder="Código o nombre del item"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <datalist id="items-trabajo">
              {optionSets.items.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="xl:col-span-12 text-xs text-gray-500">
            Mostrando <span className="font-semibold text-[#1e3a8a]">{trabajosFiltrados.length}</span> de {trabajos.length} órdenes.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Cargando órdenes de trabajo...</p>
          </div>
        </div>
      ) : (
        <KanbanBoard
          trabajos={trabajosFiltrados}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          tecnicoLookup={tecnicoLookup}
          maquinariaLookup={maquinariaLookup}
        />
      )}

      <TrabajoFormModal
        open={modalOpen}
        trabajo={selected}
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
        }}
        onSaved={async (savedTrabajo, isEdit) => {
          await loadTrabajos();
          if (!isEdit && savedTrabajo?.id) {
            setDetalleId(savedTrabajo.id);
            setDetalleOpen(true);
          }
        }}
      />

      <TrabajoDetalleModal
        open={detalleOpen}
        trabajoId={detalleId}
        onClose={() => {
          setDetalleOpen(false);
          setDetalleId(null);
        }}
        onUpdated={(trabajoActualizado) => {
          setTrabajos((prev) =>
            prev.map((t) =>
              t.id === trabajoActualizado.id ? trabajoActualizado : t
            )
          );
        }}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, className = "", children }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
        {children}
      </select>
    </div>
  );
}

function FieldInput({ label, type = "text", value, onChange, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color }) {
  const colorClasses = {
    blue: "text-[#1e3a8a]",
    green: "text-[#84cc16]",
    red: "text-red-600",
    gray: "text-gray-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg bg-gray-50 ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>

        <span className={`text-3xl font-semibold ${colorClasses[color]}`}>{value}</span>
      </div>

      <p className="text-sm text-gray-600 font-medium">{label}</p>
    </div>
  );
}