"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircuitBoard,
  ClipboardList,
  Layers3,
  Package,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ActividadChecklistModal from "@/components/checklist/ActividadChecklistModal";
import ActividadChecklistTable from "@/components/checklist/ActividadChecklistTable";
import ChecklistEjecucionTable from "@/components/checklist/ChecklistEjecucionTable";
import ChecklistModal from "@/components/checklist/ChecklistModal";
import ChecklistTemplateTable from "@/components/checklist/ChecklistTemplateTable";
import SistemaModal from "@/components/checklist/SistemaModal";
import SistemaTable from "@/components/checklist/SistemaTable";
import {
  actividadChecklistAPI,
  checklistAPI,
  checklistEjecucionAPI,
  itemAPI,
  sistemaAPI,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const MANAGER_ROLES = [
  "admin",
  "Jefe de Tecnicos",
  "Jefe de Almaceneros",
  "Jefe de Mantenimiento",
  "ManageCompras",
];

function normalizeCollection(response) {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function getErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  return "No se pudo cargar la vista de checklist.";
}

export default function ChecklistPage() {
  const router = useRouter();
  const { roles = [] } = useAuth();
  const [ejecuciones, setEjecuciones] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [actividadesBase, setActividadesBase] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [estadoEjecucion, setEstadoEjecucion] = useState("TODOS");
  const [estadoChecklist, setEstadoChecklist] = useState("TODOS");
  const [activeCatalogView, setActiveCatalogView] = useState("PLANTILLAS");
  const [openChecklistModal, setOpenChecklistModal] = useState(false);
  const [openActividadModal, setOpenActividadModal] = useState(false);
  const [openSistemaModal, setOpenSistemaModal] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [editingActividad, setEditingActividad] = useState(null);
  const [editingSistema, setEditingSistema] = useState(null);

  const canManage = useMemo(
    () => roles.some((role) => MANAGER_ROLES.includes(role)),
    [roles]
  );

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        ejecucionesResponse,
        checklistsResponse,
        actividadesResponse,
        sistemasResponse,
        itemsResponse,
      ] = await Promise.all([
        checklistEjecucionAPI.list(),
        checklistAPI.list(),
        actividadChecklistAPI.list(),
        sistemaAPI.list(),
        itemAPI.list(),
      ]);

      setEjecuciones(normalizeCollection(ejecucionesResponse));
      setChecklists(normalizeCollection(checklistsResponse));
      setActividadesBase(normalizeCollection(actividadesResponse));
      setSistemas(normalizeCollection(sistemasResponse));
      setItems(normalizeCollection(itemsResponse));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteChecklist = async (checklist) => {
    const confirmed = window.confirm(
      `¿Deseas borrar el checklist "${checklist?.motivo || ""}"?`
    );
    if (!confirmed) return;

    try {
      await checklistAPI.delete(checklist.id);
      await loadData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  };

  const handleDeleteActividad = async (actividad) => {
    const confirmed = window.confirm(
      `¿Deseas borrar la actividad "${actividad?.descripcion || ""}"?`
    );
    if (!confirmed) return;

    try {
      await actividadChecklistAPI.delete(actividad.id);
      await loadData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  };

  const handleDeleteSistema = async (sistema) => {
    const confirmed = window.confirm(
      `¿Deseas borrar el sistema "${sistema?.nombre || ""}"?`
    );
    if (!confirmed) return;

    try {
      await sistemaAPI.delete(sistema.id);
      await loadData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  };

  const filteredEjecuciones = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return ejecuciones.filter((ejecucion) => {
      const matchesEstado =
        estadoEjecucion === "TODOS" || ejecucion.estado === estadoEjecucion;

      const searchableText = [
        ejecucion.motivo,
        ejecucion.checklist_motivo,
        ejecucion.realizado_por_username,
        ejecucion.estado_label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      return matchesEstado && matchesSearch;
    });
  }, [ejecuciones, estadoEjecucion, search]);

  const filteredChecklists = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return checklists.filter((checklist) => {
      const matchesEstado =
        estadoChecklist === "TODOS" || checklist.estado === estadoChecklist;

      const actividadesTexto = (checklist.actividades || [])
        .map((actividad) => actividad?.actividad_detalle?.descripcion)
        .filter(Boolean)
        .join(" ");

      const searchableText = [
        checklist.motivo,
        checklist.creado_por_username,
        actividadesTexto,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      return matchesEstado && matchesSearch;
    });
  }, [checklists, estadoChecklist, search]);

  const filteredActividadesBase = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return actividadesBase;

    return actividadesBase.filter((actividad) =>
      [
        actividad.descripcion,
        actividad.tipo_respuesta_label,
        actividad.item_codigo,
        actividad.item_nombre,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [actividadesBase, search]);

  const filteredSistemas = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return sistemas;

    return sistemas.filter((sistema) =>
      [sistema.nombre, sistema.descripcion]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [sistemas, search]);

  const stats = useMemo(() => {
    const totalEjecuciones = ejecuciones.length;
    const completados = ejecuciones.filter(
      (ejecucion) => ejecucion.estado === "COMPLETADO"
    ).length;

    return {
      totalEjecuciones,
      completados,
      plantillas: checklists.length,
      catalogo:
        actividadesBase.filter((actividad) => actividad.activo !== false).length +
        sistemas.length,
    };
  }, [actividadesBase, checklists.length, ejecuciones, sistemas.length]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,35,70,0.08)]">
        <div className="relative overflow-hidden px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,35,70,0.06),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(143,191,47,0.16),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f7fafc_100%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d6e4ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#173569]">
                <ClipboardList className="h-3.5 w-3.5" />
                Checklist
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                Plantillas y ejecuciones de checklist operativo
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Consulta los checklist ya realizados y construye nuevas
                plantillas desde un flujo mas claro: primero catalogos y luego
                edicion dedicada de relaciones por plantilla.
              </p>
            </div>

            {canManage ? (
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingChecklist(null);
                    setOpenChecklistModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#173569] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(23,53,105,0.24)] transition hover:bg-[#0f2346]"
                >
                  <Plus className="h-4.5 w-4.5" />
                  Nuevo checklist
                </button>
                <button
                  type="button"
                  onClick={() => setOpenActividadModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#173569]/12 bg-white px-5 py-3 text-sm font-semibold text-[#173569] transition hover:bg-[#eef4ff]"
                >
                  <ClipboardList className="h-4.5 w-4.5" />
                  Nueva actividad
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSistema(null);
                    setOpenSistemaModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#173569]/12 bg-white px-5 py-3 text-sm font-semibold text-[#173569] transition hover:bg-[#eef4ff]"
                >
                  <CircuitBoard className="h-4.5 w-4.5" />
                  Nuevo sistema
                </button>
              </div>
            ) : null}
          </div>

          <div className="relative mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Ejecuciones"
              value={stats.totalEjecuciones}
              tone="slate"
              icon={<ClipboardList className="h-4 w-4" />}
            />
            <StatCard
              label="Completados"
              value={stats.completados}
              tone="emerald"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <StatCard
              label="Plantillas"
              value={stats.plantillas}
              tone="amber"
              icon={<ShieldAlert className="h-4 w-4" />}
            />
            <StatCard
              label="Catalogo activo"
              value={stats.catalogo}
              tone="blue"
              icon={<Package className="h-4 w-4" />}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,35,70,0.06)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Buscar
            </span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Motivo, checklist o responsable"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Estado ejecucion
            </span>
            <select
              value={estadoEjecucion}
              onChange={(event) => setEstadoEjecucion(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]"
            >
              <option value="TODOS">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="COMPLETADO">Completado</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Estado plantilla
            </span>
            <select
              value={estadoChecklist}
              onChange={(event) => setEstadoChecklist(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]"
            >
              <option value="TODOS">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      <ChecklistEjecucionTable
        ejecuciones={filteredEjecuciones}
        loading={loading}
        checklists={checklists}
        canManage={canManage}
        onChanged={loadData}
        onOpenRespuestas={(ejecucion) =>
          router.push(`/checklist/${ejecucion.id}`)
        }
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,35,70,0.06)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d6e4ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#173569]">
              <Layers3 className="h-3.5 w-3.5" />
              Catalogos checklist
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Cambia la vista del constructor
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Muestra solo la tabla que necesitas en ese momento: plantilla, actividades base o sistemas.
            </p>
          </div>

          <div className="inline-flex flex-wrap gap-2 rounded-[22px] border border-slate-200 bg-slate-50 p-1.5">
            {[
              { key: "PLANTILLAS", label: "Plantillas" },
              { key: "ACTIVIDADES", label: "Actividades" },
              { key: "SISTEMAS", label: "Sistemas" },
            ].map((view) => (
              <button
                key={view.key}
                type="button"
                onClick={() => setActiveCatalogView(view.key)}
                className={[
                  "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                  activeCatalogView === view.key
                    ? "bg-[#173569] text-white shadow-[0_12px_24px_rgba(23,53,105,0.18)]"
                    : "text-slate-600 hover:bg-white hover:text-slate-900",
                ].join(" ")}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        {activeCatalogView === "PLANTILLAS" ? (
          <ChecklistTemplateTable
            checklists={filteredChecklists}
            loading={loading}
            onEditChecklist={(checklist) => router.push(`/checklist/plantillas/${checklist.id}`)}
            onEditMetadata={(checklist) => {
              setEditingChecklist(checklist);
              setOpenChecklistModal(true);
            }}
            onDeleteChecklist={canManage ? handleDeleteChecklist : undefined}
          />
        ) : null}

        {activeCatalogView === "ACTIVIDADES" ? (
          <ActividadChecklistTable
            actividades={filteredActividadesBase}
            loading={loading}
            onCreate={canManage ? () => setOpenActividadModal(true) : undefined}
            onEdit={
              canManage
                ? (actividad) => {
                    setEditingActividad(actividad);
                    setOpenActividadModal(true);
                  }
                : undefined
            }
            onDelete={canManage ? handleDeleteActividad : undefined}
          />
        ) : null}

        {activeCatalogView === "SISTEMAS" ? (
          <SistemaTable
            sistemas={filteredSistemas}
            loading={loading}
            onCreate={canManage ? () => {
              setEditingSistema(null);
              setOpenSistemaModal(true);
            } : undefined}
            onEdit={
              canManage
                ? (sistema) => {
                    setEditingSistema(sistema);
                    setOpenSistemaModal(true);
                  }
                : undefined
            }
            onDelete={canManage ? handleDeleteSistema : undefined}
          />
        ) : null}
      </section>

      <ChecklistModal
        open={openChecklistModal}
        onClose={() => {
          setOpenChecklistModal(false);
          setEditingChecklist(null);
        }}
        onCreated={async () => {
          await loadData();
          setEditingChecklist(null);
        }}
        checklist={editingChecklist}
      />

      <ActividadChecklistModal
        open={openActividadModal}
        onClose={() => {
          setOpenActividadModal(false);
          setEditingActividad(null);
        }}
        onCreated={async () => {
          await loadData();
          setEditingActividad(null);
        }}
        items={items}
        actividad={editingActividad}
      />

      <SistemaModal
        open={openSistemaModal}
        onClose={() => {
          setOpenSistemaModal(false);
          setEditingSistema(null);
        }}
        onCreated={async () => {
          await loadData();
          setEditingSistema(null);
        }}
        sistema={editingSistema}
      />
    </div>
  );
}

function StatCard({ label, value, icon, tone = "slate" }) {
  const toneMap = {
    slate: "border-slate-200 bg-white/88 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
    amber: "border-amber-200 bg-amber-50/80 text-amber-700",
    blue: "border-[#d6e4ff] bg-[#eef4ff] text-[#173569]",
  };

  return (
    <article
      className={[
        "rounded-[24px] border px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
        toneMap[tone] || toneMap.slate,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          {icon}
        </span>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight">{value}</div>
    </article>
  );
}
