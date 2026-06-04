"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ItemTable from "@/components/items/ItemTable";
import ItemGroupManager from "@/components/items/ItemGroupManager";
import OrdenCompraFormModal from "@/components/ordenes/OrdenCompraFormModal";
import OrdenCompraTable from "@/components/ordenes/OrdenCompraTable";
import OrdenRequerimientoTable from "@/components/ordenes/OrdenRequerimientoTable";
import {
  ordenCompraAPI,
  ordenRequerimientoAPI,
  trabajadorAPI,
  userAPI,
} from "@/lib/api";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

const SECTIONS = [
  { key: "inventario", label: "Inventario" },
  { key: "ordenes-compra", label: "Órdenes de compra" },
  { key: "requerimientos", label: "Órdenes de requerimiento" },
  { key: "grupos", label: "Grupos de items" },
];

const INVENTORY_VIEWS = [
  { key: "general", label: "General" },
  { key: "almacen", label: "Almacén" },
  { key: "tecnicos", label: "Técnicos" },
  { key: "maquinaria", label: "Maquinaria" },
];

const normalizeRole = (role) =>
  String(role?.name || role?.nombre || role || "").toLowerCase().trim();

export default function AlmacenPage() {
  const [section, setSection] = useState("inventario");
  const [inventoryView, setInventoryView] = useState("general");
  const [favoriteFilter, setFavoriteFilter] = useState("TODOS");
  const [refresh, setRefresh] = useState(false);
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [ordenesRequerimiento, setOrdenesRequerimiento] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingOrders(true);
    try {
      const [ordenesCompraRes, ordenesReqRes, trabajadoresRes, usersRes] = await Promise.all([
        ordenCompraAPI.list(),
        ordenRequerimientoAPI.list(),
        trabajadorAPI.list(),
        userAPI.list(),
      ]);

      setOrdenesCompra(ordenesCompraRes.data || []);
      setOrdenesRequerimiento(ordenesReqRes.data || []);
      setTrabajadores(trabajadoresRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error("Error cargando datos de almacen:", error);
    } finally {
      if (!silent) setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refresh]);

  useAutoRefresh(
    () => loadData({ silent: true }),
    5000,
    section === "ordenes-compra" || section === "requerimientos"
  );

  const tecnicos = useMemo(() => {
    const rolesPorTrabajador = (users || []).reduce((acc, user) => {
      const trabajadorId = user.trabajador_id ?? user.trabajador?.id ?? user.trabajador;
      if (!trabajadorId) return acc;
      acc[trabajadorId] = (user.roles || []).map(normalizeRole);
      return acc;
    }, {});

    return (trabajadores || []).filter((trabajador) => {
      const roles = rolesPorTrabajador[trabajador.id] || [];
      return roles.includes("tecnico") || String(trabajador.puesto || "").toLowerCase().includes("tecnico");
    });
  }, [trabajadores, users]);

  const handleAdvancePurchase = async (orden, nextState) => {
    try {
      await ordenCompraAPI.cambiarEstado(orden.id, nextState);
      setRefresh((value) => !value);
    } catch (error) {
      console.error("Error actualizando orden de compra:", error);
      alert(error?.response?.data?.detail || "No se pudo actualizar la orden de compra.");
    }
  };

  const handleConfirmPurchase = async (orden) => {
    try {
      await ordenCompraAPI.confirmarRecepcion(orden.id);
      setRefresh((value) => !value);
    } catch (error) {
      console.error("Error confirmando recepción:", error);
      alert(error?.response?.data?.detail || "No se pudo confirmar la recepción.");
    }
  };

  const handleAssignTecnico = async (orden, tecnicoId) => {
    if (!tecnicoId) return;
    try {
      await ordenRequerimientoAPI.patch(orden.id, { tecnico_asignado: Number(tecnicoId) });
      setRefresh((value) => !value);
    } catch (error) {
      console.error("Error asignando técnico:", error);
      alert(error?.response?.data?.detail || "No se pudo asignar el técnico.");
    }
  };

  const handleMarkSinStockItem = async (orden, item) => {
    try {
      await ordenRequerimientoAPI.cambiarEstado(orden.id, "SIN_STOCK", item.id);
      setRefresh((value) => !value);
    } catch (error) {
      console.error("Error marcando sin stock:", error);
      alert(error?.response?.data?.detail || "No se pudo cambiar el estado.");
    }
  };

  const handleDeliver = async (orden) => {
    try {
      await ordenRequerimientoAPI.cambiarEstado(orden.id, "ENTREGADO");
      setRefresh((value) => !value);
    } catch (error) {
      console.error("Error entregando requerimiento:", error);
      alert(error?.response?.data?.detail || "No se pudo entregar la orden.");
    }
  };

  const currentViewLabel =
    INVENTORY_VIEWS.find((view) => view.key === inventoryView)?.label || "General";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-end">
        <div className="hidden">
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">Almacén</h1>
          <p className="text-sm text-gray-500 mt-1">
            Inventario, órdenes de compra y requerimientos operativos.
          </p>
        </div>

        {(section === "inventario" || section === "ordenes-compra") && (
          <OrdenCompraFormModal onCreated={() => setRefresh((value) => !value)} />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSection(item.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              section === item.key
                ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === "inventario" && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Vistas de inventario</p>
                <p className="mt-1 text-xs text-gray-500">
                  Cambia entre el stock general y las cantidades según su ubicación actual.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {INVENTORY_VIEWS.map((view) => (
                  <button
                    key={view.key}
                    type="button"
                    onClick={() => setInventoryView(view.key)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      inventoryView === view.key
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFavoriteFilter("TODOS")}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  favoriteFilter === "TODOS"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFavoriteFilter("SOLO_FAVORITOS")}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  favoriteFilter === "SOLO_FAVORITOS"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Solo favoritos
              </button>
            </div>
          </div>

          <ItemTable
            favoriteFilter={favoriteFilter}
            vista={inventoryView}
            title={`Inventario ${currentViewLabel}`}
            description={`Vista ${currentViewLabel.toLowerCase()} del almacén`}
          />
        </>
      )}

      {section === "ordenes-compra" && (
        <OrdenCompraTable
          ordenes={ordenesCompra}
          loading={loadingOrders}
          mode="almacen"
          onAdvanceState={handleAdvancePurchase}
          onConfirmReceipt={handleConfirmPurchase}
        />
      )}

      {section === "requerimientos" && (
        <OrdenRequerimientoTable
          ordenes={ordenesRequerimiento}
          loading={loadingOrders}
          tecnicos={tecnicos}
          onAssignTecnico={handleAssignTecnico}
          onMarkSinStockItem={handleMarkSinStockItem}
          onDeliver={handleDeliver}
        />
      )}

      {section === "grupos" && <ItemGroupManager />}
    </div>
  );
}
