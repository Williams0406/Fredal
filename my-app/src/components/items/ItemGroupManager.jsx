"use client";

import { useEffect, useState } from "react";
import ItemGroupModal from "./ItemGroupModal";
import ItemGroupsAccordion from "./ItemGroupsAccordion";
import { itemGrupoAPI } from "@/lib/api";

export default function ItemGroupManager() {
  const [groups, setGroups] = useState([]);
  const [modalState, setModalState] = useState({ open: false, mode: "create", group: null });

  const refreshGroups = async () => {
    const res = await itemGrupoAPI.list();
    setGroups(res.data);
  };

  useEffect(() => {
    let isMounted = true;
    itemGrupoAPI.list().then((res) => {
      if (isMounted) setGroups(res.data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDelete = async (groupId) => {
    await itemGrupoAPI.delete(groupId);
    refreshGroups();
  };

  const openCreate = () => setModalState({ open: true, mode: "create", group: null });
  const openEdit = (group) => setModalState({ open: true, mode: "edit", group });
  const closeModal = () => setModalState({ open: false, mode: "create", group: null });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a8a]">Grupos de items</h2>
          <p className="text-sm text-gray-500">Crea y ajusta kits mixtos para compras y movimientos, con edición rápida por grupo.</p>
        </div>
        <button type="button" onClick={openCreate} className="px-4 py-2 rounded-lg bg-[#1e3a8a] text-white text-sm font-medium">+ Nuevo grupo</button>
      </div>

      <ItemGroupsAccordion groups={groups} onDelete={handleDelete} onEdit={openEdit} />

      {modalState.open && (
        <ItemGroupModal
          mode={modalState.mode}
          group={modalState.group}
          onClose={closeModal}
          onSaved={refreshGroups}
        />
      )}
    </div>
  );
}