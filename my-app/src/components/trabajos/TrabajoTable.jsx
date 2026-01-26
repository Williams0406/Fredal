export default function TrabajoTable({ trabajos }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-sm">
            <th className="p-2 text-left">Código</th>
            <th className="p-2">Maquinaria</th>
            <th className="p-2">Prioridad</th>
            <th className="p-2">Lugar</th>
            <th className="p-2">Estado</th>
          </tr>
        </thead>

        <tbody>
          {trabajos.map((t) => (
            <tr key={t.id} className="border-t text-sm">
              <td className="p-2">{t.codigo_orden}</td>
              <td className="p-2">{t.maquinaria}</td>
              <td className="p-2">{t.prioridad}</td>
              <td className="p-2">{t.lugar}</td>
              <td className="p-2">{t.estatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
