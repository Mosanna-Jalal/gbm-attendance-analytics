"use client";

import { useEffect, useState, ReactNode } from "react";

// Splits a label on whitespace and renders each chunk on its own line.
// Use as: <XAxis tick={<StackedTick />} />
export function StackedTick(props: {
  x?: number;
  y?: number;
  payload?: { value: string | number };
  fill?: string;
  fontSize?: number;
}) {
  const { x = 0, y = 0, payload, fontSize = 10 } = props;
  const parts = String(payload?.value ?? "").split(/\s+/).filter(Boolean);
  return (
    <g transform={`translate(${x},${y})`}>
      {parts.map((p, i) => (
        <text
          key={i}
          x={0}
          y={8 + i * (fontSize + 2)}
          textAnchor="middle"
          fill="currentColor"
          fontSize={fontSize}
        >
          {p}
        </text>
      ))}
    </g>
  );
}

type Size = "sm" | "md" | "lg" | "hidden";

const HEIGHTS: Record<Exclude<Size, "hidden">, number> = {
  sm: 200,
  md: 320,
  lg: 520,
};

export default function ResizableChart({
  title,
  defaultSize = "sm",
  headerExtra,
  children,
}: {
  title: string;
  defaultSize?: Size;
  headerExtra?: ReactNode;
  children: (height: number) => ReactNode;
}) {
  const [size, setSize] = useState<Size>(defaultSize);

  // On desktop, promote the compact default to medium so first paint after
  // hydration shows a readable chart. Mobile keeps whatever `defaultSize` sets.
  useEffect(() => {
    if (defaultSize !== "sm") return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSize("md");
    }
  }, [defaultSize]);

  return (
    <div className="card-chart rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          {headerExtra}
          <div className="inline-flex rounded-full border border-foreground/15 p-0.5 text-xs">
            {(["sm", "md", "lg"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                title={s === "sm" ? "Compact" : s === "md" ? "Default" : "Tall"}
                className={`px-2.5 py-1 rounded-full transition uppercase font-semibold ${
                  size === s ? "brand-gradient text-white" : "hover:bg-foreground/5"
                }`}
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => setSize(size === "hidden" ? "md" : "hidden")}
              title={size === "hidden" ? "Show" : "Collapse"}
              className={`px-2.5 py-1 rounded-full transition ${
                size === "hidden" ? "brand-gradient text-white" : "hover:bg-foreground/5"
              }`}
            >
              {size === "hidden" ? "▾" : "▴"}
            </button>
          </div>
        </div>
      </div>
      {size !== "hidden" && (
        <div className="w-full" style={{ height: HEIGHTS[size] }}>
          {children(HEIGHTS[size])}
        </div>
      )}
    </div>
  );
}
