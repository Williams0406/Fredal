"use client";

import { useEffect, useState } from "react";
import { itemGrupoAPI } from "@/lib/api";

export default function ItemGroupSelector({ onApply }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  useEffect(() => {
    itemGrupoAPI.list().then((res) => setGroups(res.data));
  }, []);

  const selectedGroup = groups.find((group) => String(group.id) === String(selectedGroupId));

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="min-w-72 flex-1">
          <label className="block text-xs font-semibold text-blue-900 mb-1">Cargar grupo predefinido</label>
          <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm">
            <option value="">Selecciona un grupo</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.nombre}</option>
            ))}
          </select>
        </div>

        <button type="button" onClick={() => selectedGroup && onApply?.(selectedGroup)} disabled={!selectedGroup} className="px-4 py-2 text-sm rounded-lg bg-[#1e3a8a] text-white disabled:opacity-40">Cargar items</button>
      </div>
      {!groups.length && <p className="text-xs text-blue-700 mt-2">No hay grupos disponibles.</p>}
    </div>
  );
}