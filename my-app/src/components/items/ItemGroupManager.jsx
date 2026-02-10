"use client";

import { useEffect, useState } from "react";
import ItemGroupModal from "./ItemGroupModal";
import ItemGroupsAccordion from "./ItemGroupsAccordion";
import { itemGrupoAPI } from "@/lib/api";

export default function ItemGroupManager() {
  const [groups, setGroups] = useState([]);
  const [openModal, setOpenModal] = useState(false);

  const refreshGroups = async () => {
    const res = await itemGrupoAPI.list();
    setGroups(res.data);
  };

  useEffect(() => {
    itemGrupoAPI.list().then((res) => setGroups(res.data));
  }, []);

  const handleDelete = async (groupId) => {
    await itemGrupoAPI.delete(groupId);
    refreshGroups();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a8a]">Grupos de items</h2>
          <p className="text-sm text-gray-500">Crea kits mixtos (consumibles + repuestos) para compras y movimientos.</p>
        </div>
        <button type="button" onClick={() => setOpenModal(true)} className="px-4 py-2 rounded-lg bg-[#1e3a8a] text-white text-sm font-medium">+ Nuevo grupo</button>
      </div>

      <ItemGroupsAccordion groups={groups} onDelete={handleDelete} />

      {openModal && <ItemGroupModal onClose={() => setOpenModal(false)} onCreated={refreshGroups} />}
    </div>
  );
}