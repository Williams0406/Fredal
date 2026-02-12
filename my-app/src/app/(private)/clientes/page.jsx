"use client";

import { useEffect, useState } from "react";
import { clienteAPI, ubicacionClienteAPI } from "@/lib/api";
import ClienteModal from "@/components/clientes/ClienteModal";
import UbicacionModal from "@/components/clientes/UbicacionModal";
import ClientesAccordion from "@/components/clientes/ClientesAccordion";

const emptyClienteForm = { nombre: "", ruc: "" };
const emptyUbicacionForm = { cliente: "", nombre: "", direccion: "" };

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [formCliente, setFormCliente] = useState(emptyClienteForm);
  const [formUbicacion, setFormUbicacion] = useState(emptyUbicacionForm);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [editingUbicacion, setEditingUbicacion] = useState(null);

  const loadData = async () => {
    const [cRes, uRes] = await Promise.all([clienteAPI.list(), ubicacionClienteAPI.list()]);
    setClientes(cRes.data);
    setUbicaciones(uRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateCliente = () => {
    setEditingCliente(null);
    setFormCliente(emptyClienteForm);
    setShowClienteModal(true);
  };

  const openCreateUbicacion = () => {
    setEditingUbicacion(null);
    setFormUbicacion(emptyUbicacionForm);
    setShowUbicacionModal(true);
  };

  const saveCliente = async () => {
    if (!formCliente.nombre || !formCliente.ruc) return;

    if (editingCliente?.id) {
      await clienteAPI.update(editingCliente.id, formCliente);
    } else {
      await clienteAPI.create(formCliente);
    }

    setFormCliente(emptyClienteForm);
    setEditingCliente(null);
    setShowClienteModal(false);
    loadData();
  };

  const saveUbicacion = async () => {
    if (!formUbicacion.cliente || !formUbicacion.nombre) return;

    const payload = {
      ...formUbicacion,
      cliente: Number(formUbicacion.cliente),
    };

    if (editingUbicacion?.id) {
      await ubicacionClienteAPI.update(editingUbicacion.id, payload);
    } else {
      await ubicacionClienteAPI.create(payload);
    }

    setFormUbicacion(emptyUbicacionForm);
    setEditingUbicacion(null);
    setShowUbicacionModal(false);
    loadData();
  };

  const handleEditCliente = (cliente) => {
    setEditingCliente(cliente);
    setFormCliente({
      nombre: cliente.nombre || "",
      ruc: cliente.ruc || "",
    });
    setShowClienteModal(true);
  };

  const handleDeleteCliente = async (cliente) => {
    if (!window.confirm(`¿Eliminar al cliente ${cliente.nombre}?`)) return;
    await clienteAPI.delete(cliente.id);
    loadData();
  };

  const handleEditUbicacion = (ubicacion) => {
    setEditingUbicacion(ubicacion);
    setFormUbicacion({
      cliente: String(ubicacion.cliente || ""),
      nombre: ubicacion.nombre || "",
      direccion: ubicacion.direccion || "",
    });
    setShowUbicacionModal(true);
  };

  const handleDeleteUbicacion = async (ubicacion) => {
    if (!window.confirm(`¿Eliminar la ubicación ${ubicacion.nombre}?`)) return;
    await ubicacionClienteAPI.delete(ubicacion.id);
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
            onClick={openCreateCliente}
          >
            Nuevo cliente
          </button>
          <button
            className="rounded border border-[#1e3a8a] px-4 py-2 text-sm text-[#1e3a8a]"
            onClick={openCreateUbicacion}
          >
            Nueva ubicación
          </button>
        </div>
      </div>

      <ClientesAccordion
        clientes={clientes}
        ubicaciones={ubicaciones}
        onEditCliente={handleEditCliente}
        onDeleteCliente={handleDeleteCliente}
        onEditUbicacion={handleEditUbicacion}
        onDeleteUbicacion={handleDeleteUbicacion}
      />

      <ClienteModal
        open={showClienteModal}
        onClose={() => {
          setShowClienteModal(false);
          setEditingCliente(null);
          setFormCliente(emptyClienteForm);
        }}
        title={editingCliente ? "Editar cliente" : "Registrar cliente"}
        primaryLabel={editingCliente ? "Actualizar" : "Guardar"}
        formCliente={formCliente}
        onChange={setFormCliente}
        onSave={saveCliente}
      />

      <UbicacionModal
        open={showUbicacionModal}
        onClose={() => {
          setShowUbicacionModal(false);
          setEditingUbicacion(null);
          setFormUbicacion(emptyUbicacionForm);
        }}
        title={editingUbicacion ? "Editar ubicación" : "Registrar ubicación"}
        primaryLabel={editingUbicacion ? "Actualizar" : "Guardar"}
        clientes={clientes}
        formUbicacion={formUbicacion}
        onChange={setFormUbicacion}
        onSave={saveUbicacion}
      />
    </div>
  );
}
