"use client";

import { useEffect, useState } from "react";
import { trabajoAPI } from "@/lib/api";
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
} from "lucide-react";

export default function TrabajosPage() {
  const { roles, trabajador } = useAuth();
  const [trabajos, setTrabajos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleId, setDetalleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    prioridad: "",
    lugar: "",
  });

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
    loadTrabajos();
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

  const handleStatusChange = async (id, nuevoEstatus) => {
    if (isTecnico && !isTrabajoAsignado(trabajos.find((t) => t.id === id))) return;
    // Actualización optimista
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

  // Filtrar trabajos
  const trabajosFiltrados = trabajos.filter((t) => {
    if (isTecnico && !isTrabajoAsignado(t)) return false;
    if (filtros.prioridad && t.prioridad !== filtros.prioridad) return false;
    if (filtros.lugar && t.lugar !== filtros.lugar) return false;
    return true;
  });

  // Estadísticas
  const stats = {
    total: trabajos.length,
    pendientes: trabajos.filter((t) => t.estatus === "PENDIENTE").length,
    enProceso: trabajos.filter((t) => t.estatus === "EN_PROCESO").length,
    finalizados: trabajos.filter((t) => t.estatus === "FINALIZADO").length,
    urgentes: trabajos.filter((t) => t.prioridad === "URGENTE" || t.prioridad === "EMERGENCIA").length,
  };

  return (
    <div className="space-y-6">
      
      {/* Header con título y acción principal */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">
            Órdenes de Trabajo
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión y seguimiento de mantenimiento
          </p>
        </div>

        <button
          className="bg-[#1e3a8a] text-white px-5 py-2.5 rounded-lg text-sm font-medium
                   hover:bg-[#1e3a8a]/90 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] 
                   focus:ring-offset-2 transition-all duration-200 flex items-center gap-2
                   disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isTecnico}
          onClick={() => {
            if (isTecnico) return;
            setSelected(null);
            setModalOpen(true);
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Orden
        </button>
      </div>
      {isTecnico && (
        <p className="text-sm text-gray-500">
          Los técnicos solo pueden visualizar e interactuar con órdenes asignadas.
        </p>
      )}

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          label="Total"
          value={stats.total}
          icon={ClipboardList}
          color="blue"
        />

        <KPICard
          label="Pendientes"
          value={stats.pendientes}
          icon={Clock}
          color="gray"
        />

        <KPICard
          label="En Proceso"
          value={stats.enProceso}
          icon={Settings}
          color="blue"
        />

        <KPICard
          label="Finalizados"
          value={stats.finalizados}
          icon={CheckCircle}
          color="green"
        />

        <KPICard
          label="Urgentes"
          value={stats.urgentes}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>

          <select
            value={filtros.prioridad}
            onChange={(e) => setFiltros({ ...filtros, prioridad: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                     transition-all duration-200"
          >
            <option value="">Todas las prioridades</option>
            <option value="REGULAR">Regular</option>
            <option value="URGENTE">Urgente</option>
            <option value="EMERGENCIA">Emergencia</option>
          </select>

          <select
            value={filtros.lugar}
            onChange={(e) => setFiltros({ ...filtros, lugar: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                     transition-all duration-200"
          >
            <option value="">Todos los lugares</option>
            <option value="TALLER">Taller</option>
            <option value="CAMPO">Campo</option>
          </select>

          {(filtros.prioridad || filtros.lugar) && (
            <button
              onClick={() => setFiltros({ prioridad: "", lugar: "" })}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1
                       transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
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
        />
      )}

      {/* Modales */}
      <TrabajoFormModal
        open={modalOpen}
        trabajo={selected}
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
        }}
        onSaved={loadTrabajos}
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

// Componente KPI Card
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

        <span className={`text-3xl font-semibold ${colorClasses[color]}`}>
          {value}
        </span>
      </div>

      <p className="text-sm text-gray-600 font-medium">{label}</p>
    </div>
  );
}