import type { ReactElement } from "react";

export interface RoadStageProps {
  readonly asphaltLeftX?: number;
  readonly laneDividerX?: number;
  readonly parkingLaneLineX?: number;
  readonly kerbLineX?: number;
  readonly kerbStoneX?: number;
  readonly showTangentGuide?: boolean;
}

const PAVEMENT_JOINT_Y = [76, 152, 228, 304, 380, 456, 532] as const;
const KERB_JOINT_Y = [60, 140, 220, 300, 380, 460, 540] as const;

/**
 * Architectural two-lane right-hand-traffic road stage with curbside parking bay,
 * concrete kerbs, subtle lane flow chevrons, and soft edge fades into the obsidian canvas.
 */
export function RoadStage({
  asphaltLeftX = 316,
  laneDividerX = 452,
  parkingLaneLineX = 588,
  kerbLineX = 665,
  kerbStoneX = 670,
  showTangentGuide = false,
}: RoadStageProps): ReactElement {
  const asphaltWidth = kerbStoneX - asphaltLeftX;
  const leftLaneCenterX = (asphaltLeftX + laneDividerX) * 0.5;
  const rightLaneCenterX = (laneDividerX + parkingLaneLineX) * 0.5;

  return (
    <g className="select-none">
      <defs>
        <linearGradient id="road-vertical-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="black" stopOpacity={0} />
          <stop offset="9%" stopColor="white" stopOpacity={1} />
          <stop offset="91%" stopColor="white" stopOpacity={1} />
          <stop offset="100%" stopColor="black" stopOpacity={0} />
        </linearGradient>

        <mask id="road-vertical-fade-mask">
          <rect x={0} y={0} width={960} height={620} fill="url(#road-vertical-fade-grad)" />
        </mask>

        <linearGradient id="road-asphalt-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.145 0 0)" />
          <stop offset="18%" stopColor="oklch(0.165 0 0)" />
          <stop offset="50%" stopColor="oklch(0.175 0 0)" />
          <stop offset="82%" stopColor="oklch(0.165 0 0)" />
          <stop offset="100%" stopColor="oklch(0.145 0 0)" />
        </linearGradient>

        <linearGradient id="road-sidewalk-right-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.9)" />
          <stop offset="55%" stopColor="oklch(0.19 0 0 / 0.45)" />
          <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
        </linearGradient>

        <linearGradient id="road-sidewalk-left-grad" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.21 0 0 / 0.85)" />
          <stop offset="55%" stopColor="oklch(0.18 0 0 / 0.4)" />
          <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
        </linearGradient>
      </defs>

      <g mask="url(#road-vertical-fade-mask)">
        {/* Left Sidewalk / Shoulder */}
        <rect x={asphaltLeftX - 110} y={0} width={104} height={620} fill="url(#road-sidewalk-left-grad)" />
        <rect x={asphaltLeftX - 6} y={0} width={6} height={620} fill="oklch(0.27 0 0)" />
        <line x1={asphaltLeftX} y1={0} x2={asphaltLeftX} y2={620} stroke="oklch(0.54 0 0 / 0.45)" strokeWidth={1.25} />

        {/* Right Sidewalk */}
        <rect x={kerbStoneX + 8} y={0} width={150} height={620} fill="url(#road-sidewalk-right-grad)" />
        <g stroke="oklch(0.32 0 0 / 0.35)" strokeWidth={1}>
          {PAVEMENT_JOINT_Y.map((y) => (
            <line key={`pave-r-${y}`} x1={kerbStoneX + 8} y1={y} x2={kerbStoneX + 130} y2={y} />
          ))}
        </g>

        {/* Main Asphalt Surface */}
        <rect x={asphaltLeftX} y={0} width={asphaltWidth} height={620} fill="url(#road-asphalt-grad)" />

        {/* Subtle Gutter Shading Along Both Kerbs */}
        <rect x={asphaltLeftX} y={0} width={8} height={620} fill="oklch(0.12 0 0 / 0.55)" />
        <rect x={kerbStoneX - 8} y={0} width={8} height={620} fill="oklch(0.12 0 0 / 0.55)" />

        {/* Right Raised Concrete Kerb */}
        <rect x={kerbStoneX} y={0} width={8} height={620} fill="oklch(0.29 0 0)" />
        <line x1={kerbStoneX} y1={0} x2={kerbStoneX} y2={620} stroke="oklch(0.72 0 0 / 0.65)" strokeWidth={1.5} />
        <line x1={kerbStoneX + 8} y1={0} x2={kerbStoneX + 8} y2={620} stroke="oklch(0.4 0 0 / 0.5)" strokeWidth={1} />
        <g stroke="oklch(0.44 0 0 / 0.65)" strokeWidth={1}>
          {KERB_JOINT_Y.map((y) => (
            <line key={`kerb-r-${y}`} x1={kerbStoneX} y1={y} x2={kerbStoneX + 8} y2={y} />
          ))}
        </g>

        {/* Optional Geometric Parking Tangent Line (Enabled in proof slides) */}
        {showTangentGuide ? (
          <line
            x1={kerbLineX}
            y1={16}
            x2={kerbLineX}
            y2={604}
            stroke="oklch(0.7 0 0 / 0.25)"
            strokeWidth={1}
            strokeDasharray="3 5"
          />
        ) : null}

        {/* Parking Lane Boundary Line & Bay Corner Ticks */}
        <line
          x1={parkingLaneLineX}
          y1={0}
          x2={parkingLaneLineX}
          y2={620}
          stroke="oklch(0.62 0 0 / 0.34)"
          strokeWidth={1.25}
          strokeDasharray="8 10"
        />
        <g stroke="oklch(0.66 0 0 / 0.45)" strokeWidth={1.4}>
          <line x1={parkingLaneLineX} y1={179} x2={parkingLaneLineX + 12} y2={179} />
          <line x1={parkingLaneLineX} y1={432} x2={parkingLaneLineX + 12} y2={432} />
        </g>

        {/* Center Road Lane Divider (Separating Southbound Left Lane & Northbound Right Lane) */}
        <line
          x1={laneDividerX}
          y1={10}
          x2={laneDividerX}
          y2={610}
          stroke="oklch(0.75 0 0 / 0.44)"
          strokeWidth={1.8}
          strokeDasharray="24 20"
        />

        {/* Right-Hand Traffic Directional Lane Arrows */}
        {/* Northbound (UP) arrow in right driving lane */}
        <g
          transform={`translate(${rightLaneCenterX}, 540)`}
          fill="none"
          stroke="oklch(0.76 0 0 / 0.28)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1={0} y1={18} x2={0} y2={-16} />
          <polyline points="-9,-6 0,-17 9,-6" />
        </g>

        {/* Southbound (DOWN) oncoming arrow in left lane */}
        <g
          transform={`translate(${leftLaneCenterX}, 95)`}
          fill="none"
          stroke="oklch(0.68 0 0 / 0.2)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1={0} y1={-18} x2={0} y2={16} />
          <polyline points="-9,6 0,17 9,6" />
        </g>
      </g>
    </g>
  );
}
