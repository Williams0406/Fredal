"use client";

import { useRef, useState } from "react";
import { catalogoSyncAPI } from "@/lib/api";

const SYNC_TABLES = [
  "Maquinaria",
  "Cliente",
  "Ubicacion Cliente",
  "Dimension",
  "UnidadMedida",
  "Item",
  "Proveedor",
];

function extractFilename(contentDisposition) {
  if (!contentDisposition) return "catalogos-sync.json";

  const matches = contentDisposition.match(/filename="?(?<name>[^"]+)"?/i);
  return matches?.groups?.name || "catalogos-sync.json";
}

function buildErrorState(error) {
  const responseData = error?.response?.data;

  if (!responseData) {
    return {
      type: "error",
      title: "Operacion fallida",
      message: "No se pudo completar la solicitud con el servidor.",
    };
  }

  if (typeof responseData === "string") {
    return {
      type: "error",
      title: "Operacion fallida",
      message: responseData,
    };
  }

  return {
    type: "error",
    title: "Operacion fallida",
    message: responseData.detail || "El servidor rechazo la importacion.",
    details: JSON.stringify(responseData, null, 2),
  };
}

function SummaryCard({ label, value, tone = "default" }) {
  const toneClasses = {
    default: "border-slate-200 bg-white text-slate-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default function CatalogoSyncPage() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [summary, setSummary] = useState(null);

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await catalogoSyncAPI.exportData();
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: "application/json" });

      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = extractFilename(response.headers["content-disposition"]);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setFeedback({
        type: "success",
        title: "Archivo generado",
        message:
          "Se descargo el JSON con las claves primarias y las tablas configuradas.",
      });
    } catch (error) {
      setFeedback(buildErrorState(error));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    const confirmed = window.confirm(
      "Esta importacion actualizara registros existentes cuando encuentre el mismo ID. Deseas continuar?"
    );
    if (!confirmed) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await catalogoSyncAPI.importData(formData);
      setSummary(response.data.summary || null);
      setFeedback({
        type: "success",
        title: "Importacion completada",
        message:
          response.data.message ||
          "El archivo se importo correctamente y se aplico el upsert por ID.",
      });
      clearSelectedFile();
    } catch (error) {
      setFeedback(buildErrorState(error));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-900 text-white shadow-2xl">
        <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.4fr_0.9fr] md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
              Catalog Sync
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight md:text-4xl">
              Importa y exporta catalogos maestros con sus claves primarias.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200">
              Esta vista genera un respaldo JSON de las tablas maestras y permite
              reimportarlo con logica de actualizacion por ID. Si el registro ya
              existe y algun campo cambia, se actualiza. Si no existe, se crea.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm font-semibold text-cyan-100">
              Tablas incluidas
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {SYNC_TABLES.map((tableName) => (
                <div
                  key={tableName}
                  className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-slate-100"
                >
                  {tableName}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-700">
                Exportar
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                Descargar respaldo JSON
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                El archivo conserva los IDs actuales y el orden de tablas para
                facilitar una posterior reimportacion.
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 16V4m0 12l-4-4m4 4l4-4M5 20h14"
                />
              </svg>
            </div>
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-700">
              El contenido exportado usa el formato oficial de esta vista.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Incluye las claves primarias de cada tabla y los IDs de relaciones
              necesarias para volver a importar.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? "Generando archivo..." : "Descargar catalogos"}
          </button>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                Importar
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                Aplicar cambios por ID
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Sube un JSON exportado desde esta misma pantalla. La importacion
                no elimina registros ausentes; solo crea o actualiza.
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v12m0 0l4-4m-4 4l-4-4M5 20h14"
                />
              </svg>
            </div>
          </div>

          <label className="mt-8 flex cursor-pointer flex-col rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 transition hover:border-slate-400 hover:bg-slate-100">
            <span className="text-sm font-medium text-slate-700">
              Selecciona un archivo JSON
            </span>
            <span className="mt-2 text-sm leading-6 text-slate-500">
              Se recomienda usar el archivo generado por la opcion de exportar.
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
            <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
              Elegir archivo
            </div>
          </label>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">Archivo actual</p>
            <p className="mt-1 text-sm text-slate-500">
              {selectedFile
                ? `${selectedFile.name} (${Math.max(
                    1,
                    Math.round(selectedFile.size / 1024)
                  )} KB)`
                : "Aun no se ha seleccionado ningun archivo."}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? "Importando..." : "Importar catalogos"}
            </button>

            <button
              type="button"
              onClick={clearSelectedFile}
              disabled={!selectedFile || importing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Limpiar seleccion
            </button>
          </div>
        </article>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
          Reglas de sincronizacion
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Mismo ID</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Si un registro importado ya existe con la misma clave primaria, se
              actualiza unicamente cuando detecta cambios.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Nuevo ID</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Si el ID no existe todavia, el registro se crea manteniendo la
              clave primaria incluida en el archivo.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Sin borrados</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Los registros que no aparecen en el archivo no se eliminan. La
              vista funciona como sincronizacion aditiva y de actualizacion.
            </p>
          </div>
        </div>
      </section>

      {feedback && (
        <section
          className={`rounded-[1.75rem] border p-6 shadow-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50"
              : "border-rose-200 bg-rose-50"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-[0.25em] ${
              feedback.type === "success" ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {feedback.title}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">{feedback.message}</p>
          {feedback.details && (
            <pre className="mt-4 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {feedback.details}
            </pre>
          )}
        </section>
      )}

      {summary && (
        <section className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Ultima importacion
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">
              Resumen de sincronizacion
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard label="Procesados" value={summary.processed || 0} tone="default" />
            <SummaryCard label="Creados" value={summary.created || 0} tone="success" />
            <SummaryCard label="Actualizados" value={summary.updated || 0} tone="info" />
            <SummaryCard label="Sin cambios" value={summary.unchanged || 0} tone="warning" />
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tabla</th>
                    <th className="px-4 py-3 font-medium">Procesados</th>
                    <th className="px-4 py-3 font-medium">Creados</th>
                    <th className="px-4 py-3 font-medium">Actualizados</th>
                    <th className="px-4 py-3 font-medium">Sin cambios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {(summary.tables || []).map((row) => (
                    <tr key={row.key}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {row.label}
                      </td>
                      <td className="px-4 py-3">{row.processed}</td>
                      <td className="px-4 py-3">{row.created}</td>
                      <td className="px-4 py-3">{row.updated}</td>
                      <td className="px-4 py-3">{row.unchanged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
