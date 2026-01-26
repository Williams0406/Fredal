"use client";

import { useEffect, useState } from "react";
import { userAPI } from "@/lib/api";

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const load = async () => {
    const [uRes, rRes] = await Promise.all([
      userAPI.list(),
      userAPI.roles(),
    ]);
    setUsers(uRes.data);
    setRoles(rRes.data.map(r => r.name));
  };

  const updateRole = async (userId, role) => {
    await userAPI.setRoles(userId, [role]);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">👤 Usuarios del sistema</h1>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Usuario</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.username}</td>
                <td className="p-3">{u.email || "—"}</td>

                <td className="p-3">
                  <select
                    value={u.roles[0] || ""}
                    onChange={(e) =>
                      updateRole(u.id, e.target.value)
                    }
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="">Sin rol</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="p-3">
                  {u.is_active ? (
                    <span className="text-green-600">Activo</span>
                  ) : (
                    <span className="text-red-600">Inactivo</span>
                  )}
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  No hay usuarios registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
