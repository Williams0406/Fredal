"use client";

import { useEffect, useMemo, useState } from "react";
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
    es_base: false,
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

  const basePorDimension = useMemo(() => {
    return unidades.reduce((acc, unidad) => {
      if (unidad.es_base) {
        acc[unidad.dimension] = unidad;
      }
      return acc;
    }, {});
  }, [unidades]);

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
    es_base: unidad.es_base,
    activo: unidad.activo,
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

    const baseActual = basePorDimension[formUnidad.dimension];
    if (formUnidad.es_base && baseActual && baseActual.id !== editingUnidad?.id) {
      await unidadMedidaAPI.update(
        baseActual.id,
        buildUnidadPayload(baseActual, { es_base: false })
      );
    }

    if (editingUnidad) {
      await unidadMedidaAPI.update(
        editingUnidad.id,
        buildUnidadPayload(editingUnidad, {
          nombre,
          simbolo: formUnidad.simbolo,
          dimension: Number(formUnidad.dimension),
          es_base: formUnidad.es_base,
        })
      );
    } else {
      await unidadMedidaAPI.create({
        nombre,
        simbolo: formUnidad.simbolo,
        dimension: Number(formUnidad.dimension),
        es_base: formUnidad.es_base,
        activo: true,
      });
    }

    setFormUnidad({ nombre: "", simbolo: "", dimension: "", es_base: false });
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
    setFormUnidad({ nombre: "", simbolo: "", dimension: "", es_base: false });
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
      es_base: unidad.es_base,
    });
    setOpenUnidadModal(true);
  };

  const handleDeleteDimension = async (dimension) => {
    if (!window.confirm(`¿Eliminar la dimensión ${dimension.nombre}?`)) return;
    await dimensionAPI.delete(dimension.id);
    loadData();
  };

  const handleDeleteUnidad = async (unidad) => {
    if (!window.confirm(`¿Eliminar la unidad ${unidad.nombre}?`)) return;
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
    if (
      !window.confirm(
        `¿Eliminar la relación ${relacion.unidad_base_detalle?.nombre} → ${relacion.unidad_relacionada_detalle?.nombre}?`
      )
    )
      return;
    await unidadRelacionAPI.delete(relacion.id);
    loadData();
  };

  const unidadesPorDimension = useMemo(() => {
    return unidades.filter(
      (unidad) =>
        String(unidad.dimension) === String(displayDimensionId) && unidad.activo
    );
  }, [unidades, displayDimensionId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">
            Unidades y dimensiones
          </h1>
          <p className="text-sm text-gray-500">
            Registra dimensiones, unidades y sus relaciones para usar
            equivalencias coherentes en inventario.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border px-4 py-2 text-sm"
            onClick={() => setOpenDimensionModal(true)}
          >
            Registrar dimensión
          </button>
          <button
            className="rounded-lg border px-4 py-2 text-sm"
            onClick={() => setOpenUnidadModal(true)}
          >
            Registrar unidad
          </button>
          <button
            className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm text-white"
            onClick={() => setOpenRelacionModal(true)}
          >
            Crear relación
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#1e3a8a]">
              Visualización de stock
            </h2>
            <p className="text-xs text-gray-500">
              Selecciona la dimensión y unidad para visualizar el stock de
              consumibles en el catálogo de items.
            </p>
          </div>
          <div className="grid w-full gap-3 md:max-w-xl md:grid-cols-2">
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={displayDimensionId}
              onChange={(e) => handleDisplayDimensionChange(e.target.value)}
            >
              <option value="">Selecciona dimensión</option>
              {dimensiones.map((dimension) => (
                <option key={dimension.id} value={dimension.id}>
                  {dimension.nombre} ({dimension.codigo})
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={displayUnitId}
              onChange={(e) => handleDisplayUnitChange(e.target.value)}
              disabled={!displayDimensionId}
            >
              <option value="">Unidad de visualización</option>
              {unidadesPorDimension.map((unidad) => (
                <option key={unidad.id} value={unidad.id}>
                  {unidad.nombre}
                  {unidad.simbolo ? ` (${unidad.simbolo})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
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
        title={editingDimension ? "Editar dimensión" : "Registrar dimensión"}
        description="Crea dimensiones que luego serán asignadas a las unidades."
        primaryLabel={editingDimension ? "Guardar cambios" : "Guardar dimensión"}
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
            ? "Actualiza la unidad manteniendo su dimensión."
            : "Registra la unidad con símbolo y dimensión. La relación se define después."
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
        baseActual={basePorDimension[formRelacion.dimension]}
        onClose={handleCloseRelacionModal}
        onChange={setFormRelacion}
        onSave={handleCreateRelacion}
      />
    </div>
  );
}