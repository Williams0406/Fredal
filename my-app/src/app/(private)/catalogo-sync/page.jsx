"use client";

import { useEffect, useRef, useState } from "react";
import { catalogoSyncAPI } from "@/lib/api";

const FORMAT_OPTIONS = [
  {
    value: "csv",
    label: "CSV",
    description: "Ligero y facil de abrir en Excel o Google Sheets.",
  },
  {
    value: "xlsx",
    label: "Excel (.xlsx)",
    description: "Ideal para trabajar directamente en Microsoft Excel.",
  },
  {
    value: "json",
    label: "JSON",
    description: "Util para respaldos tecnicos o reimportaciones exactas.",
  },
];

function extractFilename(contentDisposition) {
  if (!contentDisposition) return "tabla-exportada";

  const matches = contentDisposition.match(/filename="?(?<name>[^"]+)"?/i);
  return matches?.groups?.name || "tabla-exportada";
}

async function buildErrorState(error) {
  let responseData = error?.response?.data;

  if (typeof Blob !== "undefined" && responseData instanceof Blob) {
    const blobText = await responseData.text();
    try {
      responseData = JSON.parse(blobText);
    } catch {
      responseData = blobText;
    }
  }

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
    message: responseData.detail || "El servidor rechazo la operacion.",
    details: JSON.stringify(responseData, null, 2),
  };
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function FieldPill({ children }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CatalogoSyncPage() {
  const fileInputRef = useRef(null);
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [exportTable, setExportTable] = useState("");
  const [importTable, setImportTable] = useState("");
  const [exportFormat, setExportFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMetadata() {
      try {
        setLoadingTables(true);
        const response = await catalogoSyncAPI.metadata();
        const nextTables = response.data?.tables || [];

        if (!isMounted) return;

        setTables(nextTables);

        if (nextTables.length > 0) {
          setExportTable((current) => current || nextTables[0].key);
          setImportTable((current) => current || nextTables[0].key);
        }
      } catch (error) {
        if (!isMounted) return;
        setFeedback(await buildErrorState(error));
      } finally {
        if (isMounted) {
          setLoadingTables(false);
        }
      }
    }

    loadMetadata();

    return () => {
      isMounted = false;
    };
  }, []);

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const selectedExportTable = tables.find((table) => table.key === exportTable);
  const selectedImportTable = tables.find((table) => table.key === importTable);

  const handleExport = async () => {
    if (!exportTable) return;

    try {
      setExporting(true);
      const response = await catalogoSyncAPI.exportTable(exportTable, exportFormat);
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data]);

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
        message: `Se descargo la tabla ${
          selectedExportTable?.label || exportTable
        } en formato ${exportFormat.toUpperCase()}.`,
      });
    } catch (error) {
      setFeedback(await buildErrorState(error));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !importTable) return;

    const confirmed = window.confirm(
      `Esta importacion aplicara altas y actualizaciones por ID sobre la tabla ${
        selectedImportTable?.label || importTable
      }. Deseas continuar?`
    );
    if (!confirmed) return;

    try {
      setImporting(true);
      const response = await catalogoSyncAPI.importTable(importTable, selectedFile);
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
      setFeedback(await buildErrorState(error));
    } finally {
      setImporting(false);
    }
  };

  const tableOptions = tables.map((table) => ({
    value: table.key,
    label: table.label,
  }));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-950 to-teal-900 text-white shadow-2xl">
        <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.35fr_0.95fr] md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-200">
              Data Sync
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200">
              Ahora puedes elegir exactamente que tabla deseas descargar y tambien
              decidir a que tabla destino quieres importar un archivo en CSV,
              Excel o JSON. La
              importacion funciona por ID: crea registros nuevos y actualiza los
              existentes cuando cambian.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm font-semibold text-teal-100">
              Tablas compatibles
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {loadingTables
                ? "Consultando tablas disponibles..."
                : `${tables.length} tablas listas para importar o exportar.`}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {tables.slice(0, 8).map((table) => (
                <div
                  key={table.key}
                  className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-slate-100"
                >
                  <div className="font-medium">{table.label}</div>
                  <div className="mt-1 text-xs text-slate-300">
                    {table.record_count} registros
                  </div>
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
                Descargar una tabla puntual
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Elige la tabla y el formato del archivo que deseas generar.
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

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <SelectField
              label="Tabla a exportar"
              value={exportTable}
              onChange={setExportTable}
              options={tableOptions}
              disabled={loadingTables || tableOptions.length === 0}
            />
            <SelectField
              label="Formato"
              value={exportFormat}
              onChange={setExportFormat}
              options={FORMAT_OPTIONS}
              disabled={loadingTables}
            />
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedExportTable?.label || "Selecciona una tabla"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedExportTable
                    ? `${selectedExportTable.record_count} registros disponibles`
                    : "La informacion de la tabla aparecera aqui."}
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {FORMAT_OPTIONS.find((option) => option.value === exportFormat)?.label}
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              {FORMAT_OPTIONS.find((option) => option.value === exportFormat)
                ?.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(selectedExportTable?.fields || []).map((field) => (
                <FieldPill key={field}>{field}</FieldPill>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={!exportTable || exporting || loadingTables}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? "Generando archivo..." : "Exportar tabla"}
          </button>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                Importar
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                Cargar archivo hacia una tabla destino
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Sube un archivo CSV, Excel o JSON y define explicitamente la tabla
                donde debe aplicarse.
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

          <div className="mt-8">
            <SelectField
              label="Tabla destino"
              value={importTable}
              onChange={setImportTable}
              options={tableOptions}
              disabled={loadingTables || tableOptions.length === 0}
            />
          </div>

          <label className="mt-6 flex cursor-pointer flex-col rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 transition hover:border-slate-400 hover:bg-slate-100">
            <span className="text-sm font-medium text-slate-700">
              Selecciona un archivo
            </span>
            <span className="mt-2 text-sm leading-6 text-slate-500">
              Formatos aceptados: CSV, Excel (.xlsx) y JSON.
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.json,application/json,text/csv"
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
                ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                : "Aun no se ha seleccionado ningun archivo."}
            </p>
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">
              Estructura esperada en {selectedImportTable?.label || "la tabla destino"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(selectedImportTable?.fields || []).map((field) => (
                <FieldPill key={field}>{field}</FieldPill>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={!selectedFile || !importTable || importing || loadingTables}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? "Importando..." : "Importar a tabla"}
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
          Reglas de importacion
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Mismo ID</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Si el archivo contiene un ID que ya existe, la plataforma actualiza
              ese registro solo cuando detecta cambios.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Nuevo ID</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Si el ID aun no existe, el sistema crea el registro respetando la
              clave primaria incluida en el archivo.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Sin borrados</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              La importacion no elimina registros ausentes. Solo inserta o
              actualiza informacion.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Catalogo de tablas
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">
              Tablas disponibles para este modulo
            </h2>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
            {tables.length} tablas
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {tables.map((table) => (
            <article
              key={table.key}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {table.label}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{table.key}</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {table.record_count} filas
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {table.fields.map((field) => (
                  <FieldPill key={`${table.key}-${field}`}>{field}</FieldPill>
                ))}
              </div>
            </article>
          ))}
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
              Resumen de procesamiento
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
