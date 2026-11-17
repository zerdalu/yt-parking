import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { CarSectionVariants, KerbSides } from "@/simulation/car-simulator";
import { usePresentationStore } from "@/store/presentation-store";
import type { ReactElement } from "react";

const KERB_EXPANSION_JOINTS_Y = [92, 168, 244, 320, 396, 472, 548] as const;
const PAVING_JOINTS_Y = [110, 198, 286, 374, 462, 550] as const;

/**
 * Side-elevation silhouette facing left (ground at y = 382, length = 319.2px from x = 86.4 to 405.6).
 * Extreme front and rear bumper noses pass precisely through the wheel-hub height y = 355.4.
 */
const SIDE_CAR_SILHOUETTE_PATH = [
  "M 92 365",
  "C 88 362, 86.4 358, 86.4 355.4",
  "C 86.4 345, 90 335, 96 330",
  "C 118 322, 140 318, 160 316",
  "L 214 273",
  "C 226 269, 272 269, 294 272",
  "L 365 312",
  "L 400 321",
  "C 404 333, 405.6 346, 405.6 355.4",
  "C 405.6 359, 403 363, 399 365",
  "L 377 365",
  "C 377 338, 363 324, 344.8 324",
  "C 326.6 324, 312.6 338, 312.6 365",
  "L 179.4 365",
  "C 179.4 338, 165.4 324, 147.2 324",
  "C 129 324, 115 338, 115 365",
  "Z",
].join(" ");

const SIDE_GLASS_PATH = "M 176 314 L 218 279 L 290 279 L 348 311 L 320 315 Z";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function progressBetween(seconds: number, start: number, end: number): number {
  if (end <= start) {
    return seconds >= end ? 1 : 0;
  }
  return clamp01((seconds - start) / (end - start));
}

function pulseFactor(seconds: number, centerTime: number, halfWidth: number = 0.55): number {
  const dist = Math.abs(seconds - centerTime);
  if (dist >= halfWidth) {
    return 0;
  }
  return Math.cos((dist / halfWidth) * (Math.PI * 0.5));
}

interface SideElevationCarProps {
  readonly isHubHighlighted: boolean;
}

function SideElevationCar({ isHubHighlighted }: SideElevationCarProps): ReactElement {
  return (
    <g>
      <path
        d={SIDE_CAR_SILHOUETTE_PATH}
        fill="url(#slide03-side-car-grad)"
        stroke="oklch(0.9 0 0 / 0.85)"
        strokeWidth={1.5}
      />
      <path d={SIDE_GLASS_PATH} fill="url(#slide03-side-glass-grad)" stroke="oklch(0.75 0 0 / 0.35)" strokeWidth={1} />
      <line x1={256} y1={279} x2={253} y2={315} stroke="oklch(0.32 0 0)" strokeWidth={4} />

      {/* Front & Rear Side Wheels (Centers at y = 355.4, radius = 26.6) */}
      {[147.2, 344.8].map((wheelX) => (
        <g key={wheelX} transform={`translate(${wheelX}, 355.4)`}>
          <circle cx={0} cy={0} r={26.6} fill="oklch(0.16 0 0)" stroke="oklch(0.86 0 0 / 0.9)" strokeWidth={1.6} />
          <circle cx={0} cy={0} r={16.8} fill="oklch(0.24 0 0)" stroke="oklch(0.62 0 0 / 0.65)" strokeWidth={1.1} />
          <circle cx={0} cy={0} r={6} fill="none" stroke="oklch(0.7 0 0 / 0.55)" strokeWidth={1} />
          <circle
            cx={0}
            cy={0}
            r={isHubHighlighted ? 4.2 : 2.8}
            fill="oklch(0.98 0 0)"
            filter={isHubHighlighted ? "url(#slide03-luminous-glow)" : undefined}
          />
        </g>
      ))}
    </g>
  );
}

interface VertexNodeProps {
  readonly cx: number;
  readonly cy: number;
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly textAnchor: "start" | "middle" | "end";
  readonly opacity: number;
  readonly pulse: number;
}

function VertexNode({
  cx,
  cy,
  label,
  labelX,
  labelY,
  textAnchor,
  opacity,
  pulse,
}: VertexNodeProps): ReactElement | null {
  if (opacity <= 0.01) {
    return null;
  }

  const dotRadius = 3.8 + 2.4 * pulse;
  const ringRadius = 8 + 7 * pulse;

  return (
    <g opacity={opacity}>
      {pulse > 0.04 ? (
        <circle
          cx={cx}
          cy={cy}
          r={ringRadius}
          fill="none"
          stroke="oklch(0.98 0 0)"
          strokeWidth={1.3}
          opacity={pulse * 0.85}
        />
      ) : null}
      <circle
        cx={cx}
        cy={cy}
        r={dotRadius}
        fill="oklch(0.98 0 0)"
        filter={pulse > 0.1 ? "url(#slide03-luminous-glow)" : undefined}
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor={textAnchor}
        stroke="oklch(0.15 0 0 / 0.94)"
        strokeWidth={4.5}
        strokeLinejoin="round"
        className="svg-label-halo fill-text-primary font-mono text-sm font-semibold tracking-mono"
      >
        {label}
      </text>
    </g>
  );
}

export function Slide03WheelPlane(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  // Beat 1 (0s - 11.4s): "imagine slicing the vehicle horizontally right through the centers of its four wheels, looking straight down from above." (3.54s - 10.06s)
  const sideFadeIn = 0.55 + 0.45 * easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.7));
  const sideFadeOut = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 9.2, 10.5));
  const sideOpacity = sideFadeIn * sideFadeOut;

  const sliceSweep = easeInOutCubic(progressBetween(elapsedSeconds, 3.6, 6.8));
  const sliceY = 248 + (355.4 - 248) * sliceSweep;
  const sliceLocked = sliceSweep >= 0.92;
  const slicePlaneOpacity = easeOutCubic(progressBetween(elapsedSeconds, 3.2, 3.9)) * sideFadeOut;

  const projectionBridgeOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 6.8, 7.6)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 9.0, 10.1)));

  const topDownScanProgress = progressBetween(elapsedSeconds, 7.6, 10.2);
  const showTopDownScan = topDownScanProgress > 0 && topDownScanProgress < 1;

  // Smooth glide of top-down car from right side (x = 660, scale = 1.88) to stage center (x = 480, scale = 2.08)
  const centerTransition = easeInOutCubic(progressBetween(elapsedSeconds, 9.5, 11.4));
  const carCenterX = 660 - 180 * centerTransition;
  const carCenterY = 315;
  const carScale = 1.88 + 0.2 * centerTransition;

  // Scaled outer rectangle ABCD & wheel hubs E, F
  const halfW = 38 * carScale;
  const halfL = 84 * carScale;
  const wheelOffsetX = 31 * carScale;
  const wheelOffsetY = 52 * carScale;

  const leftX = carCenterX - halfW;
  const rightX = carCenterX + halfW;
  const topY = carCenterY - halfL;
  const bottomY = carCenterY + halfL;
  const wheelLeftX = carCenterX - wheelOffsetX;
  const frontAxleY = carCenterY - wheelOffsetY;
  const rearAxleY = carCenterY + wheelOffsetY;

  // Beat 2 (11.0s - 16.4s): "The extreme outer body forms a simple rectangle, labeled A, B, C, D." (10.78s - 16.34s)
  const rectPerimeter = 2 * (halfW * 2 + halfL * 2);
  const rectDraw = easeInOutCubic(progressBetween(elapsedSeconds, 11.0, 13.8));
  const rectVisible = elapsedSeconds >= 11.0;

  // Vertices appear & pulse strictly on spoken letters A(14.36-14.80), B(15.08-15.32), C(15.62-15.88), D(16.10-16.34)
  const alphaA = easeOutCubic(progressBetween(elapsedSeconds, 14.1, 14.45));
  const alphaB = easeOutCubic(progressBetween(elapsedSeconds, 14.9, 15.2));
  const alphaC = easeOutCubic(progressBetween(elapsedSeconds, 15.45, 15.75));
  const alphaD = easeOutCubic(progressBetween(elapsedSeconds, 15.95, 16.25));

  const pulseA = Math.max(
    pulseFactor(elapsedSeconds, 14.55, 0.55),
    pulseFactor(elapsedSeconds, 19.43, 0.48),
    pulseFactor(elapsedSeconds, 35.47, 0.55),
  );
  const pulseB = pulseFactor(elapsedSeconds, 15.2, 0.52);
  const pulseC = pulseFactor(elapsedSeconds, 15.75, 0.52);
  const pulseD = Math.max(
    pulseFactor(elapsedSeconds, 16.22, 0.55),
    pulseFactor(elapsedSeconds, 21.05, 0.5),
    pulseFactor(elapsedSeconds, 35.97, 0.55),
  );

  // Beat 3 (16.9s - 28.9s): "The curb runs along the straight line through A, E, F, and D. Or... an imaginary line a few centimeters to the right of the curb."
  const kerbVisibility = easeOutCubic(progressBetween(elapsedSeconds, 16.9, 17.8));
  const kerbLineDraw = easeInOutCubic(progressBetween(elapsedSeconds, 17.8, 19.4));
  const alloyHighlight = Math.max(pulseFactor(elapsedSeconds, 24.1, 0.85), pulseFactor(elapsedSeconds, 30.2, 0.9));
  const kerbShift = easeInOutCubic(progressBetween(elapsedSeconds, 25.6, 28.2));
  const kerbEdgeX = leftX - 24 * kerbShift;

  // Beat 4 (28.9s - 36.64s): "Notice that our curbside wheels, centered at points E and F, line up closely with the left edge A to D of the car."
  const wheelFocus = easeInOutCubic(progressBetween(elapsedSeconds, 29.4, 31.2));
  const carShellOpacity = 1 - 0.36 * wheelFocus;

  // Hubs E & F appear on "through A, E, F, and D" (19.86s, 20.32s) and reach full emphasis on "points E and F" (32.18s, 32.78s)
  const alphaE = Math.max(
    easeOutCubic(progressBetween(elapsedSeconds, 19.7, 20.05)) * 0.9,
    easeOutCubic(progressBetween(elapsedSeconds, 31.5, 32.1)),
  );
  const alphaF = Math.max(
    easeOutCubic(progressBetween(elapsedSeconds, 20.15, 20.5)) * 0.9,
    easeOutCubic(progressBetween(elapsedSeconds, 31.8, 32.4)),
  );

  const pulseE = Math.max(
    pulseFactor(elapsedSeconds, 20.0, 0.45),
    pulseFactor(elapsedSeconds, 24.1, 0.75),
    pulseFactor(elapsedSeconds, 32.36, 0.55),
  );
  const pulseF = Math.max(
    pulseFactor(elapsedSeconds, 20.44, 0.45),
    pulseFactor(elapsedSeconds, 24.1, 0.75),
    pulseFactor(elapsedSeconds, 32.95, 0.55),
  );

  const efAxisDraw = easeInOutCubic(progressBetween(elapsedSeconds, 31.4, 33.2));
  const efAxisLength = bottomY - topY;
  const edgeAlignConnectors = easeOutCubic(progressBetween(elapsedSeconds, 33.6, 34.8));

  const scanLineY = topY + (bottomY - topY) * easeInOutCubic(topDownScanProgress);
  const aboveSliceClipHeight = Math.max(0, sliceY - 200);
  const belowSliceClipHeight = Math.max(0, 412 - sliceY);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">03</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Slicing the Car: The Wheel-Center Plane
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>Horizontal wheel-center slice plane, chassis rectangle ABCD, and kerb line AEFD</title>
        <defs>
          <radialGradient id="slide03-ambient-glow" cx="50%" cy="50%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide03-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="slide03-side-car-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.36 0 0)" />
            <stop offset="52%" stopColor="oklch(0.27 0 0)" />
            <stop offset="100%" stopColor="oklch(0.2 0 0)" />
          </linearGradient>

          <linearGradient id="slide03-side-glass-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.13 0 0 / 0.9)" />
            <stop offset="100%" stopColor="oklch(0.18 0 0 / 0.85)" />
          </linearGradient>

          <linearGradient id="slide03-slice-plane-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.95 0 0 / 0.22)" />
            <stop offset="50%" stopColor="oklch(0.98 0 0 / 0.1)" />
            <stop offset="100%" stopColor="oklch(0.95 0 0 / 0.24)" />
          </linearGradient>

          <linearGradient id="slide03-kerb-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="12%" stopColor="white" stopOpacity={1} />
            <stop offset="88%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="black" stopOpacity={0} />
          </linearGradient>

          <mask id="slide03-kerb-fade-mask">
            <rect x={0} y={40} width={960} height={540} fill="url(#slide03-kerb-fade-grad)" />
          </mask>

          <linearGradient id="slide03-sidewalk-left-grad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.88)" />
            <stop offset="55%" stopColor="oklch(0.19 0 0 / 0.42)" />
            <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
          </linearGradient>

          <clipPath id="slide03-above-slice-clip">
            <rect x={50} y={200} width={410} height={aboveSliceClipHeight} />
          </clipPath>

          <clipPath id="slide03-below-slice-clip">
            <rect x={50} y={sliceY} width={410} height={belowSliceClipHeight} />
          </clipPath>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={315} r={315} fill="url(#slide03-ambient-glow)" />

        {/* ================================================================
            BEAT 1: Side-Elevation Horizontal Slice & Top-Down Projection
           ================================================================ */}
        {sideOpacity > 0.01 ? (
          <g opacity={sideOpacity}>
            {/* Road Ground Line */}
            <line x1={60} y1={382} x2={436} y2={382} stroke="oklch(0.54 0 0 / 0.5)" strokeWidth={1.4} />

            {/* Ghosted Upper Section Above the Descending Slice Plane */}
            <g clipPath="url(#slide03-above-slice-clip)" opacity={0.22}>
              <SideElevationCar isHubHighlighted={false} />
            </g>

            {/* Intact Lower Cross-Section At & Below the Slice Plane */}
            <g clipPath="url(#slide03-below-slice-clip)">
              <SideElevationCar isHubHighlighted={sliceLocked} />
            </g>

            {/* Wheel-Center Axis Line Highlight Once Slice Locks onto Hubs */}
            {sliceLocked ? (
              <line
                x1={86.4}
                y1={355.4}
                x2={405.6}
                y2={355.4}
                stroke="oklch(0.97 0 0 / 0.85)"
                strokeWidth={1.6}
                strokeDasharray="4 4"
              />
            ) : null}

            {/* Descending 3D-Perspective Horizontal Slice Plane */}
            {slicePlaneOpacity > 0.01 ? (
              <g opacity={slicePlaneOpacity}>
                <polygon
                  points={`64,${sliceY + 9} 96,${sliceY - 9} 432,${sliceY - 9} 400,${sliceY + 9}`}
                  fill="url(#slide03-slice-plane-grad)"
                  stroke="oklch(0.96 0 0 / 0.88)"
                  strokeWidth={1.3}
                />
                <line
                  x1={76}
                  y1={sliceY}
                  x2={420}
                  y2={sliceY}
                  stroke="oklch(0.98 0 0)"
                  strokeWidth={1.5}
                  filter="url(#slide03-luminous-glow)"
                />
              </g>
            ) : null}
          </g>
        ) : null}

        {/* Geometric Projection Bridge (Side Slice -> Top-Down View) */}
        {projectionBridgeOpacity > 0.01 ? (
          <g opacity={projectionBridgeOpacity}>
            <line
              x1={432}
              y1={355.4}
              x2={552}
              y2={355.4}
              stroke="oklch(0.84 0 0 / 0.55)"
              strokeWidth={1.2}
              strokeDasharray="4 5"
            />
            <path
              d="M 552 355.4 C 566 355.4, 566 315, 580 315"
              fill="none"
              stroke="oklch(0.9 0 0 / 0.72)"
              strokeWidth={1.3}
            />
            <polyline
              points="573,310 580,315 573,320"
              fill="none"
              stroke="oklch(0.9 0 0 / 0.72)"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ) : null}

        {/* ================================================================
            BEATS 3 & 4: Concrete Kerb & Imaginary Safe Offset Line
           ================================================================ */}
        {kerbVisibility > 0.01 ? (
          <g opacity={kerbVisibility} mask="url(#slide03-kerb-fade-mask)">
            {/* Sidewalk Slab Fading Leftward */}
            <rect x={kerbEdgeX - 135} y={48} width={126} height={524} fill="url(#slide03-sidewalk-left-grad)" />
            <g stroke="oklch(0.32 0 0 / 0.36)" strokeWidth={1}>
              {PAVING_JOINTS_Y.map((y) => (
                <line key={`pave-${y}`} x1={kerbEdgeX - 120} y1={y} x2={kerbEdgeX - 9} y2={y} />
              ))}
            </g>

            {/* Physical Raised Concrete Kerb Edge */}
            <rect x={kerbEdgeX - 9} y={48} width={9} height={524} fill="oklch(0.31 0 0)" />
            <line x1={kerbEdgeX} y1={48} x2={kerbEdgeX} y2={572} stroke="oklch(0.76 0 0 / 0.74)" strokeWidth={1.6} />
            <line
              x1={kerbEdgeX - 9}
              y1={48}
              x2={kerbEdgeX - 9}
              y2={572}
              stroke="oklch(0.42 0 0 / 0.55)"
              strokeWidth={1}
            />
            <g stroke="oklch(0.45 0 0 / 0.65)" strokeWidth={1}>
              {KERB_EXPANSION_JOINTS_Y.map((y) => (
                <line key={`kerb-${y}`} x1={kerbEdgeX - 9} y1={y} x2={kerbEdgeX} y2={y} />
              ))}
            </g>

            {/* Clearance Corridor Between Concrete Kerb & Imaginary Line AD */}
            {kerbShift > 0.03 ? (
              <g opacity={kerbShift}>
                <rect x={kerbEdgeX} y={56} width={leftX - kerbEdgeX} height={508} fill="oklch(0.95 0 0 / 0.035)" />

                {/* Subtle Caliper Clearance Ticks Aligned with Front & Rear Wheels */}
                {[frontAxleY, rearAxleY].map((ty) => (
                  <g key={`gap-tick-${ty}`} stroke="oklch(0.84 0 0 / 0.68)" strokeWidth={1.1}>
                    <line x1={kerbEdgeX + 2} y1={ty} x2={leftX - 2} y2={ty} />
                    <line x1={kerbEdgeX + 2} y1={ty - 3.5} x2={kerbEdgeX + 2} y2={ty + 3.5} />
                    <line x1={leftX - 2} y1={ty - 3.5} x2={leftX - 2} y2={ty + 3.5} />
                  </g>
                ))}
              </g>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            MAIN STAGE: Enlarged 2D Cut-Plane Car (Kerb on Left Edge AD)
           ================================================================ */}
        <g transform={`translate(${carCenterX}, ${carCenterY}) scale(${carScale})`} opacity={carShellOpacity}>
          <CutPlaneCar
            variant={CarSectionVariants.Hero}
            kerbSide={KerbSides.Left}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={true}
          />
        </g>

        {/* Protective Rim Glow Around Curbside Wheels E & F ("alloy wheels on concrete" / "curbside wheels") */}
        {alloyHighlight > 0.03 ? (
          <g
            fill="none"
            stroke="oklch(0.96 0 0)"
            strokeWidth={1.6}
            opacity={alloyHighlight * 0.8}
            filter="url(#slide03-luminous-glow)"
          >
            <rect x={wheelLeftX - 14} y={frontAxleY - 30} width={28} height={60} rx={8} />
            <rect x={wheelLeftX - 14} y={rearAxleY - 30} width={28} height={60} rx={8} />
          </g>
        ) : null}

        {/* Top-Down Cross-Section Scan Beam (Beat 1) */}
        {showTopDownScan ? (
          <g>
            <line
              x1={leftX - 18}
              y1={scanLineY}
              x2={rightX + 18}
              y2={scanLineY}
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.8}
              filter="url(#slide03-luminous-glow)"
            />
            <rect
              x={leftX - 14}
              y={scanLineY - 12}
              width={rightX - leftX + 28}
              height={12}
              fill="oklch(0.95 0 0 / 0.08)"
            />
          </g>
        ) : null}

        {/* ================================================================
            BEAT 2: Outer Body Rectangle ABCD
           ================================================================ */}
        {rectVisible ? (
          <g>
            <rect
              x={leftX}
              y={topY}
              width={rightX - leftX}
              height={bottomY - topY}
              fill="none"
              stroke="oklch(0.95 0 0 / 0.85)"
              strokeWidth={1.6}
              strokeDasharray={rectPerimeter}
              strokeDashoffset={rectPerimeter * (1 - rectDraw)}
            />

            {/* Right-Angle Corner Caliper Brackets */}
            {rectDraw > 0.15 ? (
              <g fill="none" stroke="oklch(0.98 0 0)" strokeWidth={1.8}>
                <path d={`M ${leftX} ${topY + 12} L ${leftX} ${topY} L ${leftX + 12} ${topY}`} />
                {rectDraw > 0.3 ? (
                  <path d={`M ${rightX - 12} ${topY} L ${rightX} ${topY} L ${rightX} ${topY + 12}`} />
                ) : null}
                {rectDraw > 0.68 ? (
                  <path d={`M ${rightX} ${bottomY - 12} L ${rightX} ${bottomY} L ${rightX - 12} ${bottomY}`} />
                ) : null}
                {rectDraw > 0.85 ? (
                  <path d={`M ${leftX + 12} ${bottomY} L ${leftX} ${bottomY} L ${leftX} ${bottomY - 12}`} />
                ) : null}
              </g>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            BEAT 3: Luminous Kerb / Imaginary Line Through A and D
           ================================================================ */}
        {kerbLineDraw > 0.01 ? (
          <line
            x1={leftX}
            y1={64}
            x2={leftX}
            y2={560}
            stroke="oklch(0.98 0 0)"
            strokeWidth={kerbShift > 0.5 ? 1.7 : 2.1}
            strokeDasharray={kerbShift > 0.2 ? "7 5" : 496}
            strokeDashoffset={kerbShift > 0.2 ? 0 : 496 * (1 - kerbLineDraw)}
            filter={kerbShift < 0.2 ? "url(#slide03-luminous-glow)" : undefined}
          />
        ) : null}

        {/* ================================================================
            BEAT 4: Wheel-Center Line E-F & Alignment with Edge A-D
           ================================================================ */}
        {efAxisDraw > 0.01 ? (
          <g>
            <line
              x1={wheelLeftX}
              y1={topY}
              x2={wheelLeftX}
              y2={bottomY}
              stroke="oklch(0.96 0 0 / 0.82)"
              strokeWidth={1.5}
              strokeDasharray={efAxisLength}
              strokeDashoffset={efAxisLength * (1 - efAxisDraw)}
            />

            {/* Radial Alignment Connectors Linking Hubs E & F to Edge AD */}
            {edgeAlignConnectors > 0.01 ? (
              <g
                stroke="oklch(0.94 0 0 / 0.82)"
                strokeWidth={1.4}
                strokeDasharray="2.5 2.5"
                opacity={edgeAlignConnectors}
              >
                <line x1={leftX} y1={frontAxleY} x2={wheelLeftX} y2={frontAxleY} />
                <line x1={leftX} y1={rearAxleY} x2={wheelLeftX} y2={rearAxleY} />
              </g>
            ) : null}

            {/* Wheel-Center Section Rings Around All Four Hubs */}
            <g fill="none" stroke="oklch(0.94 0 0 / 0.55)" strokeWidth={1.2} opacity={wheelFocus}>
              <circle cx={wheelLeftX} cy={frontAxleY} r={14} />
              <circle cx={wheelLeftX} cy={rearAxleY} r={14} />
              <circle cx={carCenterX + wheelOffsetX} cy={frontAxleY} r={11} opacity={0.45} />
              <circle cx={carCenterX + wheelOffsetX} cy={rearAxleY} r={11} opacity={0.45} />
            </g>
          </g>
        ) : null}

        {/* ================================================================
            SEQUENTIAL GEOMETRIC VERTEX NODES: A, B, C, D and Hubs E, F
           ================================================================ */}
        <VertexNode
          cx={leftX}
          cy={topY}
          label="A"
          labelX={leftX + 10}
          labelY={topY - 12}
          textAnchor="start"
          opacity={alphaA}
          pulse={pulseA}
        />
        <VertexNode
          cx={rightX}
          cy={topY}
          label="B"
          labelX={rightX - 10}
          labelY={topY - 12}
          textAnchor="end"
          opacity={alphaB}
          pulse={pulseB}
        />
        <VertexNode
          cx={rightX}
          cy={bottomY}
          label="C"
          labelX={rightX - 10}
          labelY={bottomY + 22}
          textAnchor="end"
          opacity={alphaC}
          pulse={pulseC}
        />
        <VertexNode
          cx={leftX}
          cy={bottomY}
          label="D"
          labelX={leftX + 10}
          labelY={bottomY + 22}
          textAnchor="start"
          opacity={alphaD}
          pulse={pulseD}
        />
        <VertexNode
          cx={wheelLeftX}
          cy={frontAxleY}
          label="E"
          labelX={wheelLeftX + 19}
          labelY={frontAxleY + 4}
          textAnchor="start"
          opacity={alphaE}
          pulse={pulseE}
        />
        <VertexNode
          cx={wheelLeftX}
          cy={rearAxleY}
          label="F"
          labelX={wheelLeftX + 19}
          labelY={rearAxleY + 4}
          textAnchor="start"
          opacity={alphaF}
          pulse={pulseF}
        />
      </svg>
    </div>
  );
}
