"use client";

import { useCallback, useEffect, useState } from "react";
import { compraAPI, ordenCompraAPI } from "@/lib/api";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import CompraTable from "@/components/compras/CompraTable";
import CompraForm from "@/components/compras/CompraForm";
import TipoCambioModal from "@/components/compras/TipoCambioModal";
import OrdenCompraTable from "@/components/ordenes/OrdenCompraTable";

export default function ComprasPage() {
  const [view, setView] = useState("registros");
  const [refresh, setRefresh] = useState(false);
  const [compras, setCompras] = useState([]);
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingCompraId, setDeletingCompraId] = useState(null);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [comprasRes, ordenesRes] = await Promise.all([
        compraAPI.list(),
        ordenCompraAPI.list(),
      ]);

      setCompras(comprasRes.data || []);
      setOrdenesCompra(ordenesRes.data || []);
    } catch (error) {
      console.error("Error cargando compras:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refresh]);

  useAutoRefresh(
    () => loadData({ silent: true }),
    5000,
    true
  );

  const handleDeleteRegistro = async (compraId) => {
    setDeletingCompraId(compraId);
    try {
      await compraAPI.deleteRegistro(compraId);
      setRefresh((value) => !value);
    } catch (error) {
      console.error("Error eliminando registro de compra:", error);
      alert(error?.response?.data?.detail || "No se pudo eliminar el registro de compra.");
    } finally {
      setDeletingCompraId(null);
    }
  };

  const handleAdvanceOrder = async (orden, nextState) => {
    try {
      await ordenCompraAPI.cambiarEstado(orden.id, nextState);
      setRefresh((value) => !value);
    } catch (error) {
      console.error("Error cambiando estado de orden:", error);
      alert(error?.response?.data?.detail || "No se pudo actualizar la orden.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-end">
        <div className="hidden">
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">Compras</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona registros de compra y órdenes emitidas desde almacén.
          </p>
        </div>

        {view === "registros" && (
          <div className="flex items-center gap-2">
            <TipoCambioModal onCreated={() => setRefresh((value) => !value)} />
            <CompraForm onCreated={() => setRefresh((value) => !value)} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView("registros")}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            view === "registros"
              ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Registros de compra
        </button>
        <button
          type="button"
          onClick={() => setView("ordenes")}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            view === "ordenes"
              ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Órdenes de compra recibidas
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Cargando información de compras...</p>
          </div>
        </div>
      ) : view === "registros" ? (
        <CompraTable
          compras={compras}
          onDeleteRegistro={handleDeleteRegistro}
          deletingCompraId={deletingCompraId}
        />
      ) : (
        <OrdenCompraTable
          ordenes={ordenesCompra}
          mode="compras"
          onAdvanceState={handleAdvanceOrder}
          emptyMessage="Aún no hay órdenes de compra emitidas por almacén."
        />
      )}
    </div>
  );
}
