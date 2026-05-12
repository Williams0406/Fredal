"use client";

import { useMemo } from "react";

const CHART_WIDTH = 920;
const CHART_HEIGHT = 340;
const MARGIN = {
  top: 24,
  right: 20,
  bottom: 92,
  left: 64,
};

function normalizeRows(rows = [], getValue) {
  return rows.map((row) => ({
    ...row,
    metricValue: getValue(row),
  }));
}

export default function ManagementMachineBarChart({
  title,
  subtitle,
  rows = [],
  yLabel,
  getValue,
  formatValue,
  noDataTitle,
  noDataDescription,
  color = "#1e3a8a",
}) {
  const chartRows = useMemo(() => normalizeRows(rows, getValue), [rows, getValue]);

  const chartWidth = Math.max(CHART_WIDTH, chartRows.length * 110);
  const plotWidth = chartWidth - MARGIN.left - MARGIN.right;
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const maxValue = Math.max(
    ...chartRows.map((row) => Number(row.metricValue || 0)),
    1
  );
  const slotWidth = chartRows.length > 0 ? plotWidth / chartRows.length : plotWidth;
  const barWidth = Math.max(28, slotWidth * 0.48);

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = maxValue * (1 - ratio);
    const y = MARGIN.top + plotHeight * ratio;
    return {
      value,
      y,
    };
  });

  const rowsWithData = chartRows.filter((row) => row.metricValue !== null && row.metricValue !== undefined);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#1e3a8a]">{title}</h2>
        <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      </div>

      {rowsWithData.length === 0 ? (
        <div className="py-10 text-center">
          <h3 className="text-base font-semibold text-gray-900">{noDataTitle}</h3>
          <p className="mt-2 text-sm text-gray-500">{noDataDescription}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg
            width={chartWidth}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
            className="min-w-full"
            role="img"
            aria-label={title}
          >
            {yTicks.map((tick) => (
              <g key={`tick-${tick.y}`}>
                <line
                  x1={MARGIN.left}
                  y1={tick.y}
                  x2={chartWidth - MARGIN.right}
                  y2={tick.y}
                  stroke="#e5e7eb"
                  strokeDasharray="4 4"
                />
                <text
                  x={MARGIN.left - 10}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="fill-gray-500 text-[11px]"
                >
                  {formatValue(tick.value)}
                </text>
              </g>
            ))}

            <line
              x1={MARGIN.left}
              y1={MARGIN.top}
              x2={MARGIN.left}
              y2={MARGIN.top + plotHeight}
              stroke="#94a3b8"
            />
            <line
              x1={MARGIN.left}
              y1={MARGIN.top + plotHeight}
              x2={chartWidth - MARGIN.right}
              y2={MARGIN.top + plotHeight}
              stroke="#94a3b8"
            />

            {chartRows.map((row, index) => {
              const value = row.metricValue;
              const numericValue = Number(value || 0);
              const x = MARGIN.left + index * slotWidth + (slotWidth - barWidth) / 2;
              const barHeight =
                value === null || value === undefined
                  ? 0
                  : (numericValue / maxValue) * plotHeight;
              const y = MARGIN.top + plotHeight - barHeight;
              const centerX = x + barWidth / 2;

              return (
                <g key={row.maquinariaId}>
                  <title>
                    {`${row.codigo} - ${row.nombre}: ${formatValue(value)}`}
                  </title>

                  {value !== null && value !== undefined ? (
                    <>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(barHeight, 2)}
                        rx="6"
                        fill={color}
                        opacity="0.9"
                      />
                      <text
                        x={centerX}
                        y={y - 8}
                        textAnchor="middle"
                        className="fill-slate-700 text-[11px] font-semibold"
                      >
                        {formatValue(value)}
                      </text>
                    </>
                  ) : (
                    <text
                      x={centerX}
                      y={MARGIN.top + plotHeight - 8}
                      textAnchor="middle"
                      className="fill-gray-400 text-[11px] font-semibold"
                    >
                      —
                    </text>
                  )}

                  <text
                    x={centerX}
                    y={MARGIN.top + plotHeight + 18}
                    transform={`rotate(-42 ${centerX} ${MARGIN.top + plotHeight + 18})`}
                    textAnchor="end"
                    className="fill-gray-600 text-[11px]"
                  >
                    {row.codigo}
                  </text>
                </g>
              );
            })}

            <text
              x={MARGIN.left}
              y={12}
              className="fill-slate-600 text-[11px] font-semibold"
            >
              {yLabel}
            </text>
          </svg>
        </div>
      )}
    </section>
  );
}
