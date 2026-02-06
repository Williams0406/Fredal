"use client";

import { useEffect, useMemo, useState } from "react";
import { unidadEquivalenciaAPI } from "@/lib/api";
import UnidadModal from "@/components/unidades/UnidadModal";
import EquivalenciaModal from "@/components/unidades/EquivalenciaModal";
import UnidadesTable from "@/components/unidades/UnidadesTable";
import EquivalenciasTable from "@/components/unidades/EquivalenciasTable";

const CATEGORIAS = [
  { value: "VOLUMEN", label: "Volumen" },
  { value: "LONGITUD", label: "Longitud" },
  { value: "MASA", label: "Masa" },
  { value: "AREA", label: "Área" },
  { value: "TIEMPO", label: "Tiempo" },
  { value: "OTRO", label: "Otro" },
];

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState([]);
  const [openUnidadModal, setOpenUnidadModal] = useState(false);
  const [openEquivalenciaModal, setOpenEquivalenciaModal] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState(null);
  const [displayUnitId, setDisplayUnitId] = useState("");
  const [displayCategory, setDisplayCategory] = useState("");
  const [formUnidad, setFormUnidad] = useState({
    nombre: "",
    simbolo: "",
    categoria: "",
  });
  const [formEquivalencia, setFormEquivalencia] = useState({
    categoria: "",
    unidadBaseId: "",
    unidadRelacionId: "",
    factor_a_unidad: "",
  });

  const loadData = async () => {
    const res = await unidadEquivalenciaAPI.list();
    setUnidades(res.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const savedUnitId = window.localStorage.getItem("stock_display_unit_id");
    const savedCategory = window.localStorage.getItem("stock_display_categoria");
    if (savedUnitId) setDisplayUnitId(savedUnitId);
    if (savedCategory) setDisplayCategory(savedCategory);
  }, []);

  const basesPorCategoria = useMemo(() => {
    return unidades.reduce((acc, unidad) => {
      if (unidad.unidad_base) {
        acc[unidad.categoria] = unidad;
      }
      return acc;
    }, {});
  }, [unidades]);

  const buildPayload = (unidad, overrides = {}) => ({
    nombre: unidad.nombre,
    simbolo: unidad.simbolo,
    categoria: unidad.categoria,
    factor_a_unidad: Number(unidad.factor_a_unidad),
    unidad_base: unidad.unidad_base,
    activo: unidad.activo,
    ...overrides,
  });

  const handleCreateUnidad = async () => {
    if (!formUnidad.nombre || !formUnidad.categoria) return;
    const nombre = formUnidad.nombre.toUpperCase();

    if (editingUnidad) {
      await unidadEquivalenciaAPI.update(
        editingUnidad.id,
        buildPayload(editingUnidad, {
          nombre,
          simbolo: formUnidad.simbolo,
          categoria: formUnidad.categoria,
        })
      );
    } else {
      await unidadEquivalenciaAPI.create({
        nombre,
        simbolo: formUnidad.simbolo,
        categoria: formUnidad.categoria,
        factor_a_unidad: 1,
        unidad_base: false,
        activo: true,
      });
    }

    setFormUnidad({ nombre: "", simbolo: "", categoria: "" });
    setEditingUnidad(null);
    setOpenUnidadModal(false);
    loadData();
  };

  const handleCreateEquivalencia = async () => {
    if (
      !formEquivalencia.categoria ||
      !formEquivalencia.unidadBaseId ||
      !formEquivalencia.unidadRelacionId ||
      !formEquivalencia.factor_a_unidad
    ) {
      return;
    }

    if (formEquivalencia.unidadBaseId === formEquivalencia.unidadRelacionId) {
      return;
    }

    const baseActual = basesPorCategoria[formEquivalencia.categoria];
    const baseSeleccionada = unidades.find(
      (unidad) => unidad.id === Number(formEquivalencia.unidadBaseId)
    );

    if (!baseSeleccionada) return;

    if (baseActual && baseActual.id !== baseSeleccionada.id) {
      await unidadEquivalenciaAPI.update(
        baseActual.id,
        buildPayload(baseActual, { unidad_base: false })
      );
    }

    await unidadEquivalenciaAPI.update(
      baseSeleccionada.id,
      buildPayload(baseSeleccionada, {
        unidad_base: true,
        factor_a_unidad: 1,
      })
    );

    const unidadRelacionada = unidades.find(
      (unidad) => unidad.id === Number(formEquivalencia.unidadRelacionId)
    );

    if (unidadRelacionada) {
      await unidadEquivalenciaAPI.update(
        unidadRelacionada.id,
        buildPayload(unidadRelacionada, {
          unidad_base: false,
          factor_a_unidad: Number(formEquivalencia.factor_a_unidad),
        })
      );
    }

    setFormEquivalencia({
      categoria: "",
      unidadBaseId: "",
      unidadRelacionId: "",
      factor_a_unidad: "",
    });
    setOpenEquivalenciaModal(false);
    loadData();
  };

  const handleDisplayCategoryChange = (value) => {
    setDisplayCategory(value);
    setDisplayUnitId("");
    window.localStorage.setItem("stock_display_categoria", value);
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

  const handleCloseUnidadModal = () => {
    setOpenUnidadModal(false);
    setEditingUnidad(null);
    setFormUnidad({ nombre: "", simbolo: "", categoria: "" });
  };

  const handleCloseEquivalenciaModal = () => {
    setOpenEquivalenciaModal(false);
    setFormEquivalencia({
      categoria: "",
      unidadBaseId: "",
      unidadRelacionId: "",
      factor_a_unidad: "",
    });
  };

  const handleEditUnidad = (unidad) => {
    setEditingUnidad(unidad);
    setFormUnidad({
      nombre: unidad.nombre,
      simbolo: unidad.simbolo ?? "",
      categoria: unidad.categoria,
    });
    setOpenUnidadModal(true);
  };

  const handleDeleteUnidad = async (unidad) => {
    if (!window.confirm(`¿Eliminar la unidad ${unidad.nombre}?`)) return;
    await unidadEquivalenciaAPI.delete(unidad.id);
    loadData();
  };

  const handleEditEquivalencia = (unidad, baseActual) => {
    setFormEquivalencia({
      categoria: unidad.categoria,
      unidadBaseId: String(baseActual?.id ?? ""),
      unidadRelacionId: String(unidad.id),
      factor_a_unidad: String(unidad.factor_a_unidad ?? ""),
    });
    setOpenEquivalenciaModal(true);
  };

  const handleDeleteEquivalencia = async (unidad) => {
    if (!window.confirm(`¿Eliminar la equivalencia de ${unidad.nombre}?`)) return;
    await unidadEquivalenciaAPI.delete(unidad.id);
    loadData();
  };

  const unidadesPorCategoria = useMemo(() => {
    return unidades.filter(
      (unidad) => unidad.categoria === displayCategory && unidad.activo
    );
  }, [unidades, displayCategory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">
            Unidades y equivalencias
          </h1>
          <p className="text-sm text-gray-500">
            Registra primero las unidades con su dimensión y luego define las
            equivalencias entre unidades de la misma categoría.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border px-4 py-2 text-sm"
            onClick={() => setOpenUnidadModal(true)}
          >
            Registrar unidad
          </button>
          <button
            className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm text-white"
            onClick={() => setOpenEquivalenciaModal(true)}
          >
            Crear equivalencia
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
              value={displayCategory}
              onChange={(e) => handleDisplayCategoryChange(e.target.value)}
            >
              <option value="">Selecciona dimensión</option>
              {CATEGORIAS.map((categoria) => (
                <option key={categoria.value} value={categoria.value}>
                  {categoria.label}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={displayUnitId}
              onChange={(e) => handleDisplayUnitChange(e.target.value)}
              disabled={!displayCategory}
            >
              <option value="">Unidad de visualización</option>
              {unidadesPorCategoria.map((unidad) => (
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
        <UnidadesTable
          unidades={unidades}
          categorias={CATEGORIAS}
          onEdit={handleEditUnidad}
          onDelete={handleDeleteUnidad}
        />
        <EquivalenciasTable
          unidades={unidades}
          categorias={CATEGORIAS}
          onEdit={handleEditEquivalencia}
          onDelete={handleDeleteEquivalencia}
        />
      </div>

      <UnidadModal
        open={openUnidadModal}
        form={formUnidad}
        categorias={CATEGORIAS}
        title={editingUnidad ? "Editar unidad" : "Registrar unidad"}
        description={
          editingUnidad
            ? "Actualiza la unidad manteniendo su dimensión."
            : "Registra la unidad con símbolo y dimensión. La relación de equivalencia se define después."
        }
        primaryLabel={editingUnidad ? "Guardar cambios" : "Guardar unidad"}
        onClose={handleCloseUnidadModal}
        onChange={setFormUnidad}
        onSave={handleCreateUnidad}
      />

      <EquivalenciaModal
        open={openEquivalenciaModal}
        form={formEquivalencia}
        categorias={CATEGORIAS}
        unidades={unidades}
        baseActual={basesPorCategoria[formEquivalencia.categoria]}
        onClose={handleCloseEquivalenciaModal}
        onChange={setFormEquivalencia}
        onSave={handleCreateEquivalencia}
      />
    </div>
  );
}