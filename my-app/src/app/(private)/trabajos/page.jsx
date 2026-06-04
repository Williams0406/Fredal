"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { maquinariaAPI, trabajoAPI, trabajadorAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDisplayDate } from "@/lib/utils";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

import KanbanBoard from "@/components/trabajos/KanbanBoard";
import TrabajoFormModal from "@/components/trabajos/TrabajoFormModal";
import TrabajoDetalleModal from "@/components/trabajos/TrabajoDetalleModal";
import { FilterField, FilterInput, FilterPanel, FilterSelect } from "@/components/ui/FilterPanel";
import { Search } from "lucide-react";

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

const formatTrabajoFecha = (value) => {
  if (!value) return "-";
  return formatDisplayDate(value);
};

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
  const [viewMode, setViewMode] = useState("kanban");

  const loadTrabajos = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await trabajoAPI.list();
      setTrabajos(res.data);
    } catch (error) {
      console.error("Error cargando trabajos:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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

  useAutoRefresh(
    () => loadTrabajos({ silent: true }),
    5000,
    !modalOpen && !detalleOpen
  );

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

  const hasFilters = Object.values(filtros).some(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        <div className="hidden">
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">Órdenes de Trabajo</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión y seguimiento de mantenimiento</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setViewMode((prev) => (prev === "kanban" ? "table" : "kanban"))}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200"
          >
            {viewMode === "kanban" ? "Ver como tabla" : "Ver como kanban"}
          </button>

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
      </div>

      {isTecnico && (
        <p className="text-sm text-gray-500">Los técnicos solo pueden visualizar e interactuar con órdenes asignadas.</p>
      )}

      <FilterPanel
        title="Filtros avanzados"
        description="Encuentra órdenes por fecha, maquinaria, técnicos, actividades e items asignados."
        collapsible
        hasActiveFilters={hasFilters}
        onClear={() => setFiltros(initialFilters)}
        bodyClassName="space-y-3"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
          <FilterSelect
            label="Prioridad"
            value={filtros.prioridad}
            onChange={(e) => setFiltros((prev) => ({ ...prev, prioridad: e.target.value }))}
            className="xl:col-span-2"
          >
            <option value="">Todas</option>
            <option value="REGULAR">Regular</option>
            <option value="URGENTE">Urgente</option>
            <option value="EMERGENCIA">Emergencia</option>
          </FilterSelect>

          <FilterSelect
            label="Lugar"
            value={filtros.lugar}
            onChange={(e) => setFiltros((prev) => ({ ...prev, lugar: e.target.value }))}
            className="xl:col-span-2"
          >
            <option value="">Todos</option>
            <option value="TALLER">Taller</option>
            <option value="CAMPO">Campo</option>
          </FilterSelect>

          <FilterSelect
            label="Maquinaria"
            value={filtros.maquinariaId}
            onChange={(e) => setFiltros((prev) => ({ ...prev, maquinariaId: e.target.value }))}
            className="xl:col-span-4"
          >
            <option value="">Todas las máquinas</option>
            {maquinarias.map((maq) => (
              <option key={maq.id} value={maq.id}>{maq.codigo_maquina} · {maq.nombre}</option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Técnico asignado"
            value={filtros.tecnicoId}
            onChange={(e) => setFiltros((prev) => ({ ...prev, tecnicoId: e.target.value }))}
            className="xl:col-span-4"
          >
            <option value="">Todos los técnicos</option>
            {tecnicos.map((tec) => (
              <option key={tec.id} value={tec.id}>{`${tec.nombres} ${tec.apellidos}`.trim()}</option>
            ))}
          </FilterSelect>

          <FilterInput
            label="Fecha desde"
            type="date"
            value={filtros.fechaDesde}
            onChange={(e) => setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))}
            className="xl:col-span-2"
          />
          <FilterInput
            label="Fecha hasta"
            type="date"
            value={filtros.fechaHasta}
            onChange={(e) => setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value }))}
            className="xl:col-span-2"
          />

          <FilterSelect
            label="Tipo de actividad"
            value={filtros.tipoActividad}
            onChange={(e) => setFiltros((prev) => ({ ...prev, tipoActividad: e.target.value }))}
            className="xl:col-span-3"
          >
            <option value="">Todas</option>
            {optionSets.tipoActividad.map((tipo) => (
              <option key={tipo} value={tipo}>{prettyLabel(tipo)}</option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Tipo de mantenimiento"
            value={filtros.tipoMantenimiento}
            onChange={(e) => setFiltros((prev) => ({ ...prev, tipoMantenimiento: e.target.value }))}
            className="xl:col-span-3"
          >
            <option value="">Todos</option>
            {optionSets.tipoMantenimiento.map((tipo) => (
              <option key={tipo} value={tipo}>{prettyLabel(tipo)}</option>
            ))}
          </FilterSelect>

          <FilterField label="Item asignado" className="xl:col-span-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                list="items-trabajo"
                value={filtros.item}
                onChange={(e) => setFiltros((prev) => ({ ...prev, item: e.target.value }))}
                placeholder="Código o nombre del item"
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <datalist id="items-trabajo">
              {optionSets.items.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </FilterField>
        </div>

        <div className="text-xs text-gray-500">
          Mostrando <span className="font-semibold text-[#1e3a8a]">{trabajosFiltrados.length}</span> de {trabajos.length} órdenes.
        </div>
      </FilterPanel>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Cargando órdenes de trabajo...</p>
          </div>
        </div>
      ) : viewMode === "table" ? (
        <TrabajosTableView
          trabajos={trabajosFiltrados}
          onView={handleView}
          maquinariaLookup={maquinariaLookup}
        />
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

function TrabajosTableView({ trabajos, onView, maquinariaLookup = {} }) {
  const prioridadStyles = {
    REGULAR: "bg-gray-100 text-gray-700",
    URGENTE: "bg-yellow-50 text-yellow-700",
    EMERGENCIA: "bg-red-50 text-red-700",
  };

  const estadoStyles = {
    PENDIENTE: "bg-gray-100 text-gray-700",
    EN_PROCESO: "bg-blue-50 text-[#1e3a8a]",
    FINALIZADO: "bg-lime-50 text-[#4d7c0f]",
  };

  if (trabajos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 py-12 px-6 text-center">
        <p className="text-sm font-medium text-gray-700">No hay ordenes para mostrar en tabla.</p>
        <p className="text-xs text-gray-500 mt-1">Ajusta los filtros o crea una nueva orden.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Vista de tabla</p>
          <p className="text-xs text-gray-500">Haz clic en una fila para abrir el detalle de la orden.</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600">
          {trabajos.length} ordenes
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Maquinaria</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Prioridad</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Lugar</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Estado</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {trabajos.map((trabajo) => {
              const maquinariaTexto =
                trabajo.maquinaria_nombre ||
                maquinariaLookup[trabajo.maquinaria] ||
                "Sin maquinaria";

              return (
                <tr
                  key={trabajo.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onView(trabajo)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onView(trabajo);
                    }
                  }}
                  className="cursor-pointer hover:bg-blue-50/60 focus:outline-none focus:bg-blue-50/70"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{maquinariaTexto}</span>
                      <span className="text-xs text-gray-500">{trabajo.codigo_orden}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatTrabajoFecha(trabajo.fecha)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${prioridadStyles[trabajo.prioridad] || prioridadStyles.REGULAR}`}>
                      {prettyLabel(trabajo.prioridad || "REGULAR")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{prettyLabel(trabajo.lugar || "-")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${estadoStyles[trabajo.estatus] || estadoStyles.PENDIENTE}`}>
                      {prettyLabel(trabajo.estatus || "PENDIENTE")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
