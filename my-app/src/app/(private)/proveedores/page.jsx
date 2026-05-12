"use client";

import { useEffect, useState } from "react";
import { proveedorAPI } from "@/lib/api";
import ProveedorForm from "@/components/proveedores/ProveedorForm";
import ProveedorTable from "@/components/proveedores/ProveedorTable";

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await proveedorAPI.list();
      setProveedores(res.data);
    } catch (error) {
      console.error("Error al cargar proveedores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-end">
        <div className="hidden">
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">
            Proveedores
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestión de proveedores y contactos comerciales
          </p>
        </div>

        <button
          onClick={() => setOpenForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1e3a8a] text-white font-medium rounded-lg hover:bg-[#1e40af] transition-colors duration-150 shadow-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nuevo Proveedor
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#1e3a8a] rounded-full animate-spin"></div>
            <p className="text-sm text-gray-600 mt-3">Cargando proveedores...</p>
          </div>
        ) : (
          <ProveedorTable proveedores={proveedores} onUpdate={loadData} />
        )}
      </div>

      {/* MODAL FORMULARIO */}
      <ProveedorForm
        open={openForm}
        onClose={() => setOpenForm(false)}
        onCreated={() => {
          loadData();
          setOpenForm(false);
        }}
      />
    </div>
  );
}
