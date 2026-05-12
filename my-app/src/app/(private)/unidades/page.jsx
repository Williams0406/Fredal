"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers3, Repeat2, Ruler, Settings2 } from "lucide-react";
import {
  dimensionAPI,
  unidadMedidaAPI,
  unidadRelacionAPI,
} from "@/lib/api";
import DimensionModal from "@/components/unidades/DimensionModal";
import DimensionesTable from "@/components/unidades/DimensionesTable";
import UnidadMedidaModal from "@/components/unidades/UnidadMedidaModal";
import UnidadesMedidaTable from "@/components/unidades/UnidadesMedidaTable";
import UnidadRelacionModal from "@/components/unidades/UnidadRelacionModal";
import UnidadesRelacionTable from "@/components/unidades/UnidadesRelacionTable";

const selectClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

export default function UnidadesPage() {
  const [dimensiones, setDimensiones] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [relaciones, setRelaciones] = useState([]);
  const [openDimensionModal, setOpenDimensionModal] = useState(false);
  const [openUnidadModal, setOpenUnidadModal] = useState(false);
  const [openRelacionModal, setOpenRelacionModal] = useState(false);
  const [editingDimension, setEditingDimension] = useState(null);
  const [editingUnidad, setEditingUnidad] = useState(null);
  const [editingRelacion, setEditingRelacion] = useState(null);
  const [displayUnitId, setDisplayUnitId] = useState("");
  const [displayDimensionId, setDisplayDimensionId] = useState("");
  const [formDimension, setFormDimension] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
  });
  const [formUnidad, setFormUnidad] = useState({
    nombre: "",
    simbolo: "",
    dimension: "",
  });
  const [formRelacion, setFormRelacion] = useState({
    dimension: "",
    unidad_base: "",
    unidad_relacionada: "",
    factor: "",
  });

  const loadData = async () => {
    const [dimensionesRes, unidadesRes, relacionesRes] = await Promise.all([
      dimensionAPI.list(),
      unidadMedidaAPI.list(),
      unidadRelacionAPI.list(),
    ]);
    setDimensiones(dimensionesRes.data);
    setUnidades(unidadesRes.data);
    setRelaciones(relacionesRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const savedUnitId = window.localStorage.getItem("stock_display_unit_id");
    const savedDimension = window.localStorage.getItem(
      "stock_display_dimension_id"
    );
    if (savedUnitId) setDisplayUnitId(savedUnitId);
    if (savedDimension) setDisplayDimensionId(savedDimension);
  }, []);

  const buildDimensionPayload = (dimension, overrides = {}) => ({
    codigo: dimension.codigo,
    nombre: dimension.nombre,
    descripcion: dimension.descripcion,
    activo: dimension.activo,
    ...overrides,
  });

  const buildUnidadPayload = (unidad, overrides = {}) => ({
    nombre: unidad.nombre,
    simbolo: unidad.simbolo,
    dimension: unidad.dimension,
    ...overrides,
  });

  const handleCreateDimension = async () => {
    if (!formDimension.codigo || !formDimension.nombre) return;

    if (editingDimension) {
      await dimensionAPI.update(
        editingDimension.id,
        buildDimensionPayload(editingDimension, {
          codigo: formDimension.codigo,
          nombre: formDimension.nombre,
          descripcion: formDimension.descripcion,
        })
      );
    } else {
      await dimensionAPI.create({
        codigo: formDimension.codigo,
        nombre: formDimension.nombre,
        descripcion: formDimension.descripcion,
        activo: true,
      });
    }

    setFormDimension({ codigo: "", nombre: "", descripcion: "" });
    setEditingDimension(null);
    setOpenDimensionModal(false);
    loadData();
  };

  const handleCreateUnidad = async () => {
    if (!formUnidad.nombre || !formUnidad.dimension) return;
    const nombre = formUnidad.nombre.toUpperCase();

    if (editingUnidad) {
      await unidadMedidaAPI.update(
        editingUnidad.id,
        buildUnidadPayload(editingUnidad, {
          nombre,
          simbolo: formUnidad.simbolo,
          dimension: Number(formUnidad.dimension),
        })
      );
    } else {
      await unidadMedidaAPI.create({
        nombre,
        simbolo: formUnidad.simbolo,
        dimension: Number(formUnidad.dimension),
      });
    }

    setFormUnidad({ nombre: "", simbolo: "", dimension: "" });
    setEditingUnidad(null);
    setOpenUnidadModal(false);
    loadData();
  };

  const handleCreateRelacion = async () => {
    if (
      !formRelacion.dimension ||
      !formRelacion.unidad_base ||
      !formRelacion.unidad_relacionada ||
      !formRelacion.factor
    ) {
      return;
    }

    if (formRelacion.unidad_base === formRelacion.unidad_relacionada) {
      return;
    }

    const payload = {
      dimension: Number(formRelacion.dimension),
      unidad_base: Number(formRelacion.unidad_base),
      unidad_relacionada: Number(formRelacion.unidad_relacionada),
      factor: Number(formRelacion.factor),
      activo: true,
    };

    if (editingRelacion) {
      await unidadRelacionAPI.update(editingRelacion.id, payload);
    } else {
      await unidadRelacionAPI.create(payload);
    }

    setFormRelacion({
      dimension: "",
      unidad_base: "",
      unidad_relacionada: "",
      factor: "",
    });
    setEditingRelacion(null);
    setOpenRelacionModal(false);
    loadData();
  };

  const handleDisplayDimensionChange = (value) => {
    setDisplayDimensionId(value);
    setDisplayUnitId("");
    window.localStorage.setItem("stock_display_dimension_id", value);
    window.localStorage.removeItem("stock_display_unit_id");
    window.dispatchEvent(new Event("stockDisplayChange"));
  };

  const handleDisplayUnitChange = (value) => {
    setDisplayUnitId(value);
    if (value) {
      window.localStorage.setItem("stock_display_unit_id", value);
    } else {
      window.localStorage.removeItem("stock_display_unit_id");
    }
    window.dispatchEvent(new Event("stockDisplayChange"));
  };

  const handleCloseDimensionModal = () => {
    setOpenDimensionModal(false);
    setEditingDimension(null);
    setFormDimension({ codigo: "", nombre: "", descripcion: "" });
  };

  const handleCloseUnidadModal = () => {
    setOpenUnidadModal(false);
    setEditingUnidad(null);
    setFormUnidad({ nombre: "", simbolo: "", dimension: "" });
  };

  const handleCloseRelacionModal = () => {
    setOpenRelacionModal(false);
    setEditingRelacion(null);
    setFormRelacion({
      dimension: "",
      unidad_base: "",
      unidad_relacionada: "",
      factor: "",
    });
  };

  const handleEditDimension = (dimension) => {
    setEditingDimension(dimension);
    setFormDimension({
      codigo: dimension.codigo,
      nombre: dimension.nombre,
      descripcion: dimension.descripcion ?? "",
    });
    setOpenDimensionModal(true);
  };

  const handleEditUnidad = (unidad) => {
    setEditingUnidad(unidad);
    setFormUnidad({
      nombre: unidad.nombre,
      simbolo: unidad.simbolo ?? "",
      dimension: String(unidad.dimension),
    });
    setOpenUnidadModal(true);
  };

  const handleDeleteDimension = async (dimension) => {
    if (!window.confirm(`Eliminar la dimension ${dimension.nombre}?`)) return;
    await dimensionAPI.delete(dimension.id);
    loadData();
  };

  const handleDeleteUnidad = async (unidad) => {
    if (!window.confirm(`Eliminar la unidad ${unidad.nombre}?`)) return;
    await unidadMedidaAPI.delete(unidad.id);
    loadData();
  };

  const handleEditRelacion = (relacion) => {
    setEditingRelacion(relacion);
    setFormRelacion({
      dimension: String(relacion.dimension),
      unidad_base: String(relacion.unidad_base),
      unidad_relacionada: String(relacion.unidad_relacionada),
      factor: String(relacion.factor ?? ""),
    });
    setOpenRelacionModal(true);
  };

  const handleDeleteRelacion = async (relacion) => {
    const label = `${relacion.unidad_base_detalle?.nombre} -> ${relacion.unidad_relacionada_detalle?.nombre}`;
    if (!window.confirm(`Eliminar la relacion ${label}?`)) return;
    await unidadRelacionAPI.delete(relacion.id);
    loadData();
  };

  const unidadesPorDimension = useMemo(() => {
    return unidades.filter(
      (unidad) => String(unidad.dimension) === String(displayDimensionId)
    );
  }, [unidades, displayDimensionId]);

  const selectedDisplayDimension = useMemo(
    () =>
      dimensiones.find(
        (dimension) => String(dimension.id) === String(displayDimensionId)
      ),
    [dimensiones, displayDimensionId]
  );

  const selectedDisplayUnit = useMemo(
    () =>
      unidades.find((unidad) => String(unidad.id) === String(displayUnitId)),
    [unidades, displayUnitId]
  );

  const activeDimensions = useMemo(
    () => dimensiones.filter((dimension) => dimension.activo).length,
    [dimensiones]
  );

  const activeUnits = useMemo(
    () => unidades.filter((unidad) => unidad.activo).length,
    [unidades]
  );

  const baseUnits = useMemo(
    () => unidades.filter((unidad) => unidad.es_base).length,
    [unidades]
  );

  const activeRelations = useMemo(
    () => relaciones.filter((relacion) => relacion.activo).length,
    [relaciones]
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.95fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF1FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#173569]">
            <Layers3 className="h-4 w-4" strokeWidth={2.2} />
            Arquitectura de unidades
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#12233D]">
            Ordena dimensiones, unidades y conversiones con una lectura mas
            consistente.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5F6C80]">
            Esta vista sostiene inventario, compras y valorizacion. Por eso la
            interfaz ahora prioriza lo estructural primero y deja las acciones
            de registro mas a mano.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              icon={Layers3}
              label="Dimensiones"
              value={dimensiones.length}
              helper={`${activeDimensions} activas`}
            />
            <StatTile
              icon={Ruler}
              label="Unidades"
              value={unidades.length}
              helper={`${baseUnits} base`}
            />
            <StatTile
              icon={Repeat2}
              label="Relaciones"
              value={relaciones.length}
              helper={`${activeRelations} activas`}
            />
            <StatTile
              icon={Settings2}
              label="Unidades activas"
              value={activeUnits}
              helper="listas para operar"
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#EAF1FF] text-[#173569]">
              <Settings2 className="h-5 w-5" strokeWidth={2.1} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#12233D]">
                Visualizacion de stock
              </p>
              <p className="mt-1 text-sm leading-6 text-[#5F6C80]">
                Define la referencia preferida para mostrar cantidades
                convertidas en inventario.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5F6C80]">
                Dimension
              </span>
              <select
                value={displayDimensionId}
                onChange={(event) =>
                  handleDisplayDimensionChange(event.target.value)
                }
                className={selectClassName}
              >
                <option value="">Sin dimension fija</option>
                {dimensiones.map((dimension) => (
                  <option key={dimension.id} value={dimension.id}>
                    {dimension.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5F6C80]">
                Unidad preferida
              </span>
              <select
                value={displayUnitId}
                onChange={(event) => handleDisplayUnitChange(event.target.value)}
                disabled={!displayDimensionId}
                className={`${selectClassName} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
              >
                <option value="">
                  {displayDimensionId
                    ? "Sin unidad preferida"
                    : "Selecciona una dimension"}
                </option>
                {unidadesPorDimension.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.nombre}
                    {unidad.simbolo ? ` (${unidad.simbolo})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-[22px] bg-slate-50 p-4 text-sm text-[#5F6C80]">
              {selectedDisplayUnit ? (
                <>
                  El stock se mostrara usando{" "}
                  <span className="font-semibold text-[#173569]">
                    {selectedDisplayUnit.nombre}
                  </span>
                  {selectedDisplayUnit.simbolo
                    ? ` (${selectedDisplayUnit.simbolo})`
                    : ""}
                  {selectedDisplayDimension
                    ? ` dentro de ${selectedDisplayDimension.nombre}.`
                    : "."}
                </>
              ) : (
                "Si no eliges una unidad preferida, cada item seguira mostrando su unidad principal."
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => setOpenDimensionModal(true)}
        >
          Registrar dimension
        </button>
        <button
          type="button"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => setOpenUnidadModal(true)}
        >
          Registrar unidad
        </button>
        <button
          type="button"
          className="rounded-2xl bg-[#173569] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f2346]"
          onClick={() => setOpenRelacionModal(true)}
        >
          Crear relacion
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DimensionesTable
          dimensiones={dimensiones}
          onEdit={handleEditDimension}
          onDelete={handleDeleteDimension}
        />
        <UnidadesMedidaTable
          unidades={unidades}
          onEdit={handleEditUnidad}
          onDelete={handleDeleteUnidad}
        />
      </div>

      <UnidadesRelacionTable
        relaciones={relaciones}
        dimensiones={dimensiones}
        onEdit={handleEditRelacion}
        onDelete={handleDeleteRelacion}
      />

      <DimensionModal
        open={openDimensionModal}
        form={formDimension}
        title={editingDimension ? "Editar dimension" : "Registrar dimension"}
        description="Crea dimensiones que luego seran asignadas a las unidades."
        primaryLabel={
          editingDimension ? "Guardar cambios" : "Guardar dimension"
        }
        onClose={handleCloseDimensionModal}
        onChange={setFormDimension}
        onSave={handleCreateDimension}
      />

      <UnidadMedidaModal
        open={openUnidadModal}
        form={formUnidad}
        dimensiones={dimensiones}
        title={editingUnidad ? "Editar unidad" : "Registrar unidad"}
        description={
          editingUnidad
            ? "Actualiza la unidad manteniendo su dimension."
            : "Registra la unidad con simbolo y dimension. La relacion se define despues."
        }
        primaryLabel={editingUnidad ? "Guardar cambios" : "Guardar unidad"}
        onClose={handleCloseUnidadModal}
        onChange={setFormUnidad}
        onSave={handleCreateUnidad}
      />

      <UnidadRelacionModal
        open={openRelacionModal}
        form={formRelacion}
        dimensiones={dimensiones}
        unidades={unidades}
        onClose={handleCloseRelacionModal}
        onChange={setFormRelacion}
        onSave={handleCreateRelacion}
      />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#173569] shadow-sm">
        <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#5F6C80]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[#12233D]">
        {value}
      </p>
      <p className="mt-1 text-sm text-[#5F6C80]">{helper}</p>
    </div>
  );
}
