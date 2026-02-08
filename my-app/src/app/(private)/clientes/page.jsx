"use client";

import { useEffect, useState } from "react";
import { clienteAPI, ubicacionClienteAPI } from "@/lib/api";
import ClienteModal from "@/components/clientes/ClienteModal";
import UbicacionModal from "@/components/clientes/UbicacionModal";
import ClientesAccordion from "@/components/clientes/ClientesAccordion";

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [formCliente, setFormCliente] = useState({ nombre: "", ruc: "" });
  const [formUbicacion, setFormUbicacion] = useState({ cliente: "", nombre: "", direccion: "" });
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);

  const loadData = async () => {
    const [cRes, uRes] = await Promise.all([clienteAPI.list(), ubicacionClienteAPI.list()]);
    setClientes(cRes.data);
    setUbicaciones(uRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveCliente = async () => {
    if (!formCliente.nombre || !formCliente.ruc) return;
    await clienteAPI.create(formCliente);
    setFormCliente({ nombre: "", ruc: "" });
    setShowClienteModal(false);
    loadData();
  };

  const saveUbicacion = async () => {
    if (!formUbicacion.cliente || !formUbicacion.nombre) return;
    await ubicacionClienteAPI.create({
      ...formUbicacion,
      cliente: Number(formUbicacion.cliente),
    });
    setFormUbicacion({ cliente: "", nombre: "", direccion: "" });
    setShowUbicacionModal(false);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">Clientes y Ubicaciones</h1>
          <p className="text-sm text-gray-500">
            Gestiona clientes y visualiza sus ubicaciones registradas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded bg-[#1e3a8a] px-4 py-2 text-sm text-white"
            onClick={() => setShowClienteModal(true)}
          >
            Nuevo cliente
          </button>
          <button
            className="rounded border border-[#1e3a8a] px-4 py-2 text-sm text-[#1e3a8a]"
            onClick={() => setShowUbicacionModal(true)}
          >
            Nueva ubicación
          </button>
        </div>
      </div>

      <ClientesAccordion clientes={clientes} ubicaciones={ubicaciones} />

      <ClienteModal
        open={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        formCliente={formCliente}
        onChange={setFormCliente}
        onSave={saveCliente}
      />

      <UbicacionModal
        open={showUbicacionModal}
        onClose={() => setShowUbicacionModal(false)}
        clientes={clientes}
        formUbicacion={formUbicacion}
        onChange={setFormUbicacion}
        onSave={saveUbicacion}
      />
    </div>
  );
}