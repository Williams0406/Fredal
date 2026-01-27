"use client";

import { useEffect, useState } from "react";
import { userAPI } from "@/lib/api";

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        userAPI.list(),
        userAPI.roles(),
      ]);
      setUsers(uRes.data);
      setRoles(rRes.data.map((r) => r.name));
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId, role) => {
    setUpdatingUserId(userId);
    try {
      await userAPI.setRoles(userId, [role]);
      await load();
    } catch (error) {
      console.error("Error al actualizar rol:", error);
      alert("No se pudo actualizar el rol del usuario");
    } finally {
      setUpdatingUserId(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Estadísticas rápidas
  const stats = {
    total: users.length,
    activos: users.filter((u) => u.is_active).length,
    inactivos: users.filter((u) => !u.is_active).length,
    conRol: users.filter((u) => u.roles && u.roles.length > 0).length,
  };

  // Obtener badge de rol
  const getRoleBadge = (userRoles) => {
    if (!userRoles || userRoles.length === 0) {
      return (
        <span className="inline-flex items-center px-3 py-1.5 text-[12px] font-medium bg-gray-100 text-gray-600 rounded-lg border border-gray-200">
          Sin rol asignado
        </span>
      );
    }

    const roleColors = {
      "Jefe de Tecnicos": "bg-blue-50 text-blue-700 border-blue-200",
      "Tecnico": "bg-indigo-50 text-indigo-700 border-indigo-200",
      "Jefe de Almaceneros": "bg-purple-50 text-purple-700 border-purple-200",
      "Almacenero": "bg-violet-50 text-violet-700 border-violet-200",
      "ManageCompras": "bg-emerald-50 text-emerald-700 border-emerald-200",
    };

    const role = userRoles[0];
    const colorClass = roleColors[role] || "bg-gray-50 text-gray-700 border-gray-200";

    return (
      <span className={`inline-flex items-center px-3 py-1.5 text-[12px] font-medium rounded-lg border ${colorClass}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">
            Usuarios del sistema
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administración de usuarios y asignación de roles
          </p>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="px-8 py-6 space-y-6">
        {/* CARDS DE ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total usuarios */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                  Total Usuarios
                </p>
                <p className="text-[32px] font-semibold text-[#1e3a5f] mt-2">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Activos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                  Activos
                </p>
                <p className="text-[32px] font-semibold text-[#84cc16] mt-2">
                  {stats.activos}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#84cc16]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Inactivos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                  Inactivos
                </p>
                <p className="text-[32px] font-semibold text-gray-400 mt-2">
                  {stats.inactivos}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </div>

          {/* Con rol */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                  Con Rol
                </p>
                <p className="text-[32px] font-semibold text-[#1e3a5f] mt-2">
                  {stats.conRol}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DE USUARIOS */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header de tabla */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-[18px] font-semibold text-[#1e3a5f]">
              Listado de usuarios
            </h2>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Usuario
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Rol asignado
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Cambiar rol
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#1e3a5f] rounded-full animate-spin"></div>
                        <p className="text-[14px] text-gray-500">Cargando usuarios...</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <p className="text-[14px] text-gray-500">No hay usuarios registrados</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center">
                          <span className="text-white text-[14px] font-semibold">
                            {u.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-gray-900">
                            {u.username}
                          </p>
                          {u.first_name && u.last_name && (
                            <p className="text-[13px] text-gray-500">
                              {u.first_name} {u.last_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-[14px] text-gray-700">
                        {u.email || (
                          <span className="text-gray-400 italic">Sin email</span>
                        )}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      {getRoleBadge(u.roles)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="relative">
                        <select
                          value={u.roles?.[0] || ""}
                          onChange={(e) => updateRole(u.id, e.target.value)}
                          disabled={updatingUserId === u.id}
                          className="w-full px-4 py-2 text-[14px] text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-10"
                        >
                          <option value="">Sin rol</option>
                          {roles.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        {updatingUserId === u.id ? (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-[#1e3a5f] rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <svg
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-green-50 text-green-700 rounded-lg border border-green-200">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-red-50 text-red-700 rounded-lg border border-red-200">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          Inactivo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* INFO CARD - Roles disponibles */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-[#1e3a5f] mb-2">
                Roles disponibles en el sistema
              </h3>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <span
                    key={role}
                    className="px-3 py-1.5 text-[12px] font-medium bg-white text-gray-700 rounded-lg border border-gray-200"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}