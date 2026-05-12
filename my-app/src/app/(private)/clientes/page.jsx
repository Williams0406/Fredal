"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, FileBadge2, MapPin, Plus } from "lucide-react";
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
    const [cRes, uRes] = await Promise.all([
      clienteAPI.list(),
      ubicacionClienteAPI.list(),
    ]);
    setClientes(cRes.data);
    setUbicaciones(uRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const clientesConRuc = useMemo(
    () => clientes.filter((cliente) => String(cliente.ruc || "").trim()).length,
    [clientes]
  );

  const clientesConUbicaciones = useMemo(() => {
    return new Set(
      ubicaciones
        .map((ubicacion) =>
          String(
            ubicacion.cliente ??
              ubicacion.cliente_id ??
              ubicacion.clienteId ??
              ""
          )
        )
        .filter(Boolean)
    ).size;
  }, [ubicaciones]);

  const clientesSinUbicaciones = Math.max(
    clientes.length - clientesConUbicaciones,
    0
  );

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
    if (!window.confirm(`Eliminar al cliente ${cliente.nombre}?`)) return;
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
    if (!window.confirm(`Eliminar la ubicacion ${ubicacion.nombre}?`)) return;
    await ubicacionClienteAPI.delete(ubicacion.id);
    loadData();
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF1FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#173569]">
            <Building2 className="h-4 w-4" strokeWidth={2.2} />
            Base comercial
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#12233D]">
            Organiza clientes y ubicaciones con una lectura mas clara.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5F6C80]">
            Consolida las cuentas activas y sus puntos de atencion en una sola
            vista, con acciones directas para mantener la informacion comercial
            siempre lista para operaciones y mantenimiento.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricCard
              icon={Building2}
              label="Clientes"
              value={clientes.length}
              helper="cuentas registradas"
            />
            <MetricCard
              icon={MapPin}
              label="Ubicaciones"
              value={ubicaciones.length}
              helper="frentes operativos"
            />
            <MetricCard
              icon={FileBadge2}
              label="Con RUC"
              value={clientesConRuc}
              helper={`${clientesSinUbicaciones} sin ubicacion`}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#173569_0%,#0f2346_100%)] p-5 text-white shadow-[0_22px_44px_rgba(15,35,70,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
            Acciones rapidas
          </p>
          <p className="mt-3 text-lg font-semibold leading-7">
            Crea primero la cuenta del cliente y luego su ubicacion operativa.
          </p>
          <p className="mt-2 text-sm leading-6 text-white/68">
            Mantienes el registro mas limpio cuando separas los datos
            comerciales de los puntos de servicio.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#173569] transition hover:bg-[#EAF1FF]"
              onClick={openCreateCliente}
            >
              <Plus className="h-4 w-4" strokeWidth={2.3} />
              Nuevo cliente
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
              onClick={openCreateUbicacion}
            >
              <MapPin className="h-4 w-4" strokeWidth={2.3} />
              Nueva ubicacion
            </button>
          </div>
        </div>
      </section>

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
        title={editingUbicacion ? "Editar ubicacion" : "Registrar ubicacion"}
        primaryLabel={editingUbicacion ? "Actualizar" : "Guardar"}
        clientes={clientes}
        formUbicacion={formUbicacion}
        onChange={setFormUbicacion}
        onSave={saveUbicacion}
      />
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, helper }) {
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
