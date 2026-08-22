import React from "react";

interface WpcLogoProps {
  className?: string;
  variant?: "full" | "icon" | "horizontal" | "badge";
  size?: "sm" | "md" | "lg" | "xl";
  lightText?: boolean;
}

export default function WpcLogo({
  className = "",
  variant = "full",
  size = "md",
  lightText = false,
}: WpcLogoProps) {
  // Sizing map for icon height/width
  const iconDimensions = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const selectedSize = iconDimensions[size] || "w-10 h-10";

  // SVG Icon representing the 3 geometric polygons forming the "W"
  const GeometricIcon = (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${selectedSize} shrink-0 drop-shadow-sm`}
    >
      {/* Left Purple Diamond Wing */}
      <path
        d="M 80 25 L 120 100 L 80 175 L 40 100 Z"
        fill="url(#wpc-purple-gradient)"
      />
      
      {/* Center Charcoal Triangle Wedge */}
      <path
        d="M 80 175 L 120 100 L 160 175 Z"
        fill="#262D3D"
      />
      
      {/* Right Silver Gray Diamond Wing */}
      <path
        d="M 160 25 L 200 100 L 160 175 L 120 100 Z"
        fill="url(#wpc-gray-gradient)"
      />

      <defs>
        <linearGradient
          id="wpc-purple-gradient"
          x1="40"
          y1="25"
          x2="120"
          y2="175"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>

        <linearGradient
          id="wpc-gray-gradient"
          x1="120"
          y1="25"
          x2="200"
          y2="175"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#94A3B8" />
          <stop offset="1" stopColor="#64748B" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (variant === "icon") {
    return <div className={`inline-flex items-center ${className}`}>{GeometricIcon}</div>;
  }

  if (variant === "horizontal") {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        {GeometricIcon}
        <div className="flex flex-col justify-center">
          <span
            className={`font-black tracking-[0.25em] text-xs uppercase ${
              lightText ? "text-white" : "text-slate-900"
            }`}
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            WORLD PARTS
          </span>
          <span
            className={`font-bold tracking-[0.35em] text-[10px] uppercase ${
              lightText ? "text-slate-300" : "text-slate-600"
            }`}
          >
            COMPANY S.A.S
          </span>
        </div>
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <div className={`inline-flex items-center gap-2 bg-slate-900/90 text-white px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-sm ${className}`}>
        {GeometricIcon}
        <div className="leading-none text-left">
          <div className="text-[11px] font-black tracking-widest text-white uppercase">WORLD PARTS</div>
          <div className="text-[8px] font-bold tracking-widest text-indigo-300 uppercase">COMPANY S.A.S</div>
        </div>
      </div>
    );
  }

  // Default "full" vertical layout like in the uploaded image
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {GeometricIcon}
      <div className="mt-2 flex flex-col items-center">
        <div
          className={`font-extrabold tracking-[0.32em] text-xs uppercase ${
            lightText ? "text-white" : "text-slate-900"
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          WORLD PARTS
        </div>
        <div
          className={`font-semibold tracking-[0.4em] text-[9px] uppercase mt-0.5 ${
            lightText ? "text-slate-300" : "text-slate-500"
          }`}
        >
          COMPANY S.A.S
        </div>
      </div>
    </div>
  );
}
