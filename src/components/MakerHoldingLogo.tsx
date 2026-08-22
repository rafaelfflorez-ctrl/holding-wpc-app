import React from "react";

interface MakerHoldingLogoProps {
  className?: string;
  variant?: "full" | "icon" | "horizontal" | "badge";
  size?: "sm" | "md" | "lg" | "xl";
  lightText?: boolean;
}

export default function MakerHoldingLogo({
  className = "",
  variant = "full",
  size = "md",
  lightText = false,
}: MakerHoldingLogoProps) {
  // Dimension map for icon sizing
  const dimensions = {
    sm: "w-7 h-7",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const selectedSize = dimensions[size] || "w-10 h-10";

  // SVG representation matching the Matriz Maker Holding logo (Charcoal/Lime Circle with sweeping M wave)
  const CircleEmblem = (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${selectedSize} shrink-0 drop-shadow-sm`}
    >
      {/* Top Charcoal Hemisphere */}
      <path
        d="M 100 10 A 90 90 0 0 1 190 100 C 170 120, 140 130, 115 105 C 85 75, 45 110, 10 100 A 90 90 0 0 1 100 10 Z"
        fill="#323843"
      />

      {/* Bottom Lime Green Hemisphere */}
      <path
        d="M 100 190 A 90 90 0 0 1 10 100 C 35 115, 75 90, 110 120 C 135 140, 175 110, 190 100 A 90 90 0 0 1 100 190 Z"
        fill="#C2E115"
      />

      {/* Sweeping Dynamic White 'M' Wave Stroke */}
      <path
        d="M 5 108 C 25 125, 60 115, 85 85 C 105 60, 125 110, 150 95 C 170 82, 185 65, 198 70 C 185 92, 160 110, 140 105 C 115 100, 98 68, 80 88 C 60 110, 25 120, 5 108 Z"
        fill="#FFFFFF"
      />
    </svg>
  );

  if (variant === "icon") {
    return <div className={`inline-flex items-center ${className}`}>{CircleEmblem}</div>;
  }

  if (variant === "horizontal") {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        {CircleEmblem}
        <div className="flex flex-col justify-center leading-none">
          <span
            className={`font-black tracking-[0.18em] text-sm uppercase ${
              lightText ? "text-white" : "text-slate-900"
            }`}
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            MATRIZ MAKER
          </span>
          <span
            className={`font-extrabold tracking-[0.35em] text-[9px] uppercase mt-0.5 ${
              lightText ? "text-lime-400" : "text-slate-600"
            }`}
          >
            HOLDING PLATFORM
          </span>
        </div>
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <div className={`inline-flex items-center gap-2.5 bg-slate-900/90 text-white px-3.5 py-2 rounded-xl border border-slate-800 shadow-sm ${className}`}>
        {CircleEmblem}
        <div className="leading-none text-left">
          <div className="text-[11px] font-black tracking-widest text-white uppercase">MATRIZ MAKER</div>
          <div className="text-[8px] font-extrabold tracking-widest text-lime-400 uppercase mt-0.5">HOLDING</div>
        </div>
      </div>
    );
  }

  // Full layout (Vertical like uploaded graphic)
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {CircleEmblem}
      <div className="mt-2.5 flex flex-col items-center">
        <div
          className={`font-black tracking-[0.25em] text-sm uppercase ${
            lightText ? "text-white" : "text-slate-900"
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          MAKER
        </div>
        <div
          className={`font-bold tracking-[0.45em] text-[10px] uppercase mt-0.5 ${
            lightText ? "text-lime-400" : "text-slate-500"
          }`}
        >
          HOLDING
        </div>
      </div>
    </div>
  );
}
