"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Filter as FilterIcon } from "lucide-react";

export const filterControlClassName =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100";

export function FilterPanel({
  title = "Filtros",
  description = "",
  icon: Icon = FilterIcon,
  collapsible = false,
  defaultExpanded = false,
  hasActiveFilters = false,
  onClear = null,
  actions = null,
  bodyClassName = "",
  children,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded || hasActiveFilters);

  useEffect(() => {
    if (hasActiveFilters) {
      setExpanded(true);
    }
  }, [hasActiveFilters]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#1e3a8a]">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {description ? <p className="mt-0.5 text-xs text-gray-500">{description}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {onClear && hasActiveFilters ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:text-gray-900"
            >
              Limpiar filtros
            </button>
          ) : null}
          {collapsible ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50"
            >
              {expanded ? "Ocultar" : "Mostrar"}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </div>

      {(!collapsible || expanded) && (
        <div className={`border-t border-gray-200 bg-slate-50/80 px-4 py-4 ${bodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export function FilterField({ label, className = "", children }) {
  return (
    <div className={className}>
      {label ? <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label> : null}
      {children}
    </div>
  );
}

export function FilterInput({ label, className = "", icon: Icon = null, inputClassName = "", ...props }) {
  return (
    <FilterField label={label} className={className}>
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /> : null}
        <input
          {...props}
          className={`${filterControlClassName} ${Icon ? "pl-9" : ""} ${inputClassName}`.trim()}
        />
      </div>
    </FilterField>
  );
}

export function FilterSelect({ label, className = "", children, inputClassName = "", ...props }) {
  return (
    <FilterField label={label} className={className}>
      <select {...props} className={`${filterControlClassName} ${inputClassName}`.trim()}>
        {children}
      </select>
    </FilterField>
  );
}
