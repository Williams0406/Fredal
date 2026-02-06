"use client";

const categoriaLabel = (value, categorias) =>
  categorias.find((item) => item.value === value)?.label ?? value;

export default function EquivalenciasTable({
  unidades,
  categorias,
  onEdit,
  onDelete,
}) {
  const agrupadas = unidades.reduce((acc, unidad) => {
    if (!acc[unidad.categoria]) {
      acc[unidad.categoria] = [];
    }
    acc[unidad.categoria].push(unidad);
    return acc;
  }, {});

  return (
    <div className="rounded-lg border bg-white p-4">
      <div>
        <h2 className="font-semibold">Equivalencias por dimensión</h2>
        <p className="text-xs text-gray-500">
          Relaciona únicamente unidades de la misma dimensión para compras y
          consumos consistentes.
        </p>
      </div>

      {Object.keys(agrupadas).length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Crea unidades para visualizar equivalencias.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {Object.entries(agrupadas).map(([categoria, unidadesCategoria]) => {
            const base = unidadesCategoria.find((u) => u.unidad_base);
            return (
              <div key={categoria} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1e3a8a]">
                    {categoriaLabel(categoria, categorias)}
                  </h3>
                  {base ? (
                    <span className="text-xs text-gray-500">
                      Base: {base.nombre}
                      {base.simbolo ? ` (${base.simbolo})` : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600">
                      Sin unidad base definida
                    </span>
                  )}
                </div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th>Unidad</th>
                        <th>Equivalencia</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unidadesCategoria.map((unidad) => (
                        <tr key={unidad.id} className="border-t">
                          <td className="py-2 font-medium">
                            {unidad.nombre}
                            {unidad.simbolo ? ` (${unidad.simbolo})` : ""}
                          </td>
                          <td className="py-2">
                            {base ? (
                              <span>
                                1 {unidad.nombre} = {unidad.factor_a_unidad}{" "}
                                {base.nombre}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">
                                Define una base para esta dimensión
                              </span>
                            )}
                          </td>
                          <td className="py-2">
                            {unidad.activo ? "Activo" : "Inactivo"}
                          </td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="text-xs font-semibold text-[#1e3a8a]"
                                onClick={() => onEdit(unidad, base)}
                              >
                                Editar
                              </button>
                              {!unidad.unidad_base ? (
                                <button
                                  className="text-xs font-semibold text-rose-600"
                                  onClick={() => onDelete(unidad)}
                                >
                                  Eliminar
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}