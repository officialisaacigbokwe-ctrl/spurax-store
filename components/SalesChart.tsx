"use client";

import { formatCurrency } from "@/lib/currency";

export type ChartPoint = {
  label: string;
  value: number;
  orders: number;
  tooltip: string;
  showLabel: boolean;
};

export default function SalesChart({ points }: { points: ChartPoint[] }) {
  const max = Math.max(0, ...points.map((point) => point.value));
  const total = points.reduce((sum, point) => sum + point.value, 0);

  if (max === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl bg-gray-50 text-sm text-gray-500">
        No sales in this period yet.
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Sales chart. Total ${formatCurrency(total, "NGN")} in this period.`}
    >
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Highest: {formatCurrency(max, "NGN")}</span>
        <span>Total: {formatCurrency(total, "NGN")}</span>
      </div>

      <div className="mt-3 flex h-48 items-end gap-1 border-b border-gray-200 sm:gap-1.5">
        {points.map((point, index) => {
          const percent = point.value > 0 ? Math.max(4, (point.value / max) * 100) : 0;

          return (
            <div
              key={index}
              className="group relative flex h-full flex-1 items-end"
            >
              <div
                className={`w-full rounded-t-md transition ${
                  point.value > 0
                    ? "bg-black group-hover:bg-gray-600"
                    : "bg-gray-100"
                }`}
                style={{ height: point.value > 0 ? `${percent}%` : "3px" }}
              />

              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                {point.tooltip}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1 sm:gap-1.5">
        {points.map((point, index) => (
          <div
            key={index}
            className="flex-1 text-center text-[10px] text-gray-400"
          >
            {point.showLabel ? point.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}