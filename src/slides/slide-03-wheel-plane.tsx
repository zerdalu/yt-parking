import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { CarSectionVariants, KerbSides } from "@/simulation/car-simulator";
import { usePresentationStore } from "@/store/presentation-store";
import type { ReactElement } from "react";

const KERB_EXPANSION_JOINTS_Y = [92, 168, 244, 320, 396, 472, 548] as const;
const PAVING_JOINTS_Y = [110, 198, 286, 374, 462, 550] as const;
const WHEEL_SPOKE_ANGLES = [0, 72, 144, 216, 288] as const;
const SIDE_CAR_SCALE = 1.88;
const SIDE_CAR_ORIGIN_X = 240;
const SIDE_CAR_GROUND_Y = 382;
const SIDE_WHEEL_HUB_Y = SIDE_CAR_GROUND_Y - 14 * SIDE_CAR_SCALE;

/**
 * Sports-coupe side elevation in the exact same 168-unit longitudinal coordinate space as
 * CutPlaneCar (x = -84 rear tail to +84 front nose, y = 0 ground, wheel centers at (±52, -14)).
 * Extreme front & rear bumper noses pass cleanly through the wheel-center slice line y = -14.
 */
const SIDE_CAR_SILHOUETTE_PATH = [
  "M 84 -14",
  "C 83.5 -20, 81 -23, 74 -25",
  "C 64 -28, 57 -31.8, 50 -32",
  "C 40 -32.2, 32 -32.2, 24 -32.5",
  "C 14 -40.5, 5 -48.5, -3 -51.5",
  "C -12 -52.5, -23 -52.5, -33 -50",
  "C -48 -46, -63 -38, -75 -33",
  "L -82.5 -34",
  "C -83.5 -28, -84 -21, -84 -14",
  "C -84 -9.5, -82 -6.5, -76 -5.5",
  "L -64.96 -5.5",
  "A 15.5 15.5 0 1 1 -39.04 -5.5",
  "L 39.04 -5.5",
  "A 15.5 15.5 0 1 1 64.96 -5.5",
  "L 79 -6.2",
  "C 82.5 -7, 84 -10, 84 -14",
  "Z",
].join(" ");

const SIDE_GLASS_PATH = [
  "M 20 -32.5",
  "C 12 -40, 4 -46.5, -3 -49",
  "C -12 -50, -23 -50, -33 -47.5",
  "C -43 -44.5, -51 -39.5, -57 -35",
  "L -22 -33",
  "L 20 -32.5",
  "Z",
].join(" ");

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
    <g transform={`translate(${SIDE_CAR_ORIGIN_X}, ${SIDE_CAR_GROUND_Y}) scale(${SIDE_CAR_SCALE})`}>
      {/* Sculpted Sports Coupe Side Body */}
      <path
        d={SIDE_CAR_SILHOUETTE_PATH}
        fill="url(#slide03-side-car-grad)"
        stroke="oklch(0.9 0 0 / 0.85)"
        strokeWidth={0.85}
      />

      {/* Side Coupe Glasshouse & B-Pillar */}
      <path
        d={SIDE_GLASS_PATH}
        fill="url(#slide03-side-glass-grad)"
        stroke="oklch(0.75 0 0 / 0.38)"
        strokeWidth={0.55}
      />
      <line x1={-14} y1={-49.5} x2={-16} y2={-32.5} stroke="oklch(0.28 0 0)" strokeWidth={1.8} />

      {/* Subtle Shoulder Crease, Fender Vent & Wing Mirror */}
      <path
        d="M 33 -25 C 12 -26, -12 -26, -34 -24"
        fill="none"
        stroke="oklch(0.72 0 0 / 0.22)"
        strokeWidth={0.55}
        strokeLinecap="round"
      />
      <line x1={31} y1={-25} x2={25} y2={-17} stroke="oklch(0.65 0 0 / 0.42)" strokeWidth={0.8} strokeLinecap="round" />
      <rect
        x={14}
        y={-36}
        width={5.5}
        height={3.2}
        rx={1.5}
        fill="oklch(0.32 0 0)"
        stroke="oklch(0.84 0 0 / 0.72)"
        strokeWidth={0.5}
      />

      {/* Swept LED Headlight & Rear Taillight Accents */}
      <path
        d="M 82 -19.5 C 78 -22, 72 -23.5, 67 -24"
        fill="none"
        stroke="oklch(0.96 0 0 / 0.9)"
        strokeWidth={1.1}
        strokeLinecap="round"
      />
      <line
        x1={-83}
        y1={-26.5}
        x2={-76}
        y2={-26.5}
        stroke="oklch(0.78 0.08 25 / 0.68)"
        strokeWidth={1}
        strokeLinecap="round"
      />

      {/* Front & Rear 5-Spoke Sports Alloy Wheels (Centers at (±52, -14), radius = 14) */}
      {[-52, 52].map((wheelX) => (
        <g key={wheelX} transform={`translate(${wheelX}, -14)`}>
          <circle cx={0} cy={0} r={14} fill="oklch(0.15 0 0)" stroke="oklch(0.88 0 0 / 0.9)" strokeWidth={0.9} />
          <circle cx={0} cy={0} r={9.8} fill="oklch(0.22 0 0)" stroke="oklch(0.66 0 0 / 0.7)" strokeWidth={0.65} />
          <circle cx={0} cy={0} r={6.8} fill="oklch(0.18 0 0)" stroke="oklch(0.45 0 0 / 0.5)" strokeWidth={0.5} />
          {WHEEL_SPOKE_ANGLES.map((angle) => (
            <line
              key={angle}
              x1={0}
              y1={0}
              x2={0}
              y2={-9.5}
              transform={`rotate(${angle})`}
              stroke="oklch(0.74 0 0 / 0.75)"
              strokeWidth={1.05}
              strokeLinecap="round"
            />
          ))}
          <circle
            cx={0}
            cy={0}
            r={isHubHighlighted ? 2.4 : 1.7}
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

  // Beat 1 (0s - 11.4s): Horizontal slice through the four wheel centers -> top-down sports car
  const sideFadeIn = 0.55 + 0.45 * easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.7));
  const sideFadeOut = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 9.2, 10.5));
  const sideOpacity = sideFadeIn * sideFadeOut;

  const sliceSweep = easeInOutCubic(progressBetween(elapsedSeconds, 3.6, 6.8));
  const sliceY = 266 + (SIDE_WHEEL_HUB_Y - 266) * sliceSweep;
  const sliceLocked = sliceSweep >= 0.92;
  const slicePlaneOpacity = easeOutCubic(progressBetween(elapsedSeconds, 3.2, 3.9)) * sideFadeOut;

  const projectionBridgeOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 6.6, 7.4)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 9.0, 10.1)));

  const topDownScanProgress = progressBetween(elapsedSeconds, 6.8, 9.5);
  const showTopDownScan = topDownScanProgress > 0 && topDownScanProgress < 1;
  const topDownRevealOpacity = easeOutCubic(progressBetween(elapsedSeconds, 6.5, 7.6));

  // Smooth glide of top-down car from right side (x = 650, scale = 1.88) to stage center (x = 480, scale = 2.08)
  const centerTransition = easeInOutCubic(progressBetween(elapsedSeconds, 9.5, 11.4));
  const carCenterX = 650 - 170 * centerTransition;
  const carCenterY = 315;
  const carScale = 1.88 + 0.2 * centerTransition;

  // Scaled outer rectangle ABCD & kerb-side wheel hubs E, F (right-hand traffic -> kerb on RIGHT)
  const halfW = 38 * carScale;
  const halfL = 84 * carScale;
  const wheelOffsetX = 31 * carScale;
  const wheelOffsetY = 52 * carScale;

  const leftX = carCenterX - halfW;
  const rightX = carCenterX + halfW;
  const topY = carCenterY - halfL;
  const bottomY = carCenterY + halfL;
  const wheelRightX = carCenterX + wheelOffsetX;
  const wheelLeftX = carCenterX - wheelOffsetX;
  const frontAxleY = carCenterY - wheelOffsetY;
  const rearAxleY = carCenterY + wheelOffsetY;

  // Beat 2 (11.0s - 16.4s): Outer body rectangle A -> B -> C -> D
  const rectPerimeter = 2 * (halfW * 2 + halfL * 2);
  const rectPathD = `M ${rightX} ${topY} L ${leftX} ${topY} L ${leftX} ${bottomY} L ${rightX} ${bottomY} Z`;
  const rectDraw = easeInOutCubic(progressBetween(elapsedSeconds, 11.0, 13.8));
  const rectVisible = elapsedSeconds >= 11.0;

  // Vertices pulse right on spoken letters A, B, C, D
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

  // Beat 3 (16.9s - 28.9s): Right-hand kerb along A, E, F, D & safe clearance offset
  const kerbVisibility = easeOutCubic(progressBetween(elapsedSeconds, 16.9, 17.8));
  const kerbLineDraw = easeInOutCubic(progressBetween(elapsedSeconds, 17.8, 19.4));
  const alloyHighlight = Math.max(pulseFactor(elapsedSeconds, 24.1, 0.85), pulseFactor(elapsedSeconds, 30.2, 0.9));
  const kerbShift = easeInOutCubic(progressBetween(elapsedSeconds, 25.6, 28.2));
  const kerbEdgeX = rightX + 24 * kerbShift;

  // Beat 4 (28.9s - 36.64s): Kerb-side wheels E and F align closely with right edge A-D
  const wheelFocus = easeInOutCubic(progressBetween(elapsedSeconds, 29.4, 31.2));
  const carShellOpacity = topDownRevealOpacity * (1 - 0.36 * wheelFocus);

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
  const edgeAdGlow = easeOutCubic(progressBetween(elapsedSeconds, 34.6, 35.4));

  const scanEased = easeInOutCubic(topDownScanProgress);
  const scanLineY = topY + (bottomY - topY) * scanEased;
  const topDownClipHeight = elapsedSeconds >= 9.5 ? 620 : Math.max(0, scanLineY - (topY - 24));
  const aboveSliceClipHeight = Math.max(0, sliceY - 250);
  const belowSliceClipHeight = Math.max(0, 398 - sliceY);

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
        <title>Horizontal wheel-center slice plane, sports-coupe rectangle ABCD, and right-side kerb line AEFD</title>
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
            <stop offset="0%" stopColor="oklch(0.38 0 0)" />
            <stop offset="52%" stopColor="oklch(0.28 0 0)" />
            <stop offset="100%" stopColor="oklch(0.2 0 0)" />
          </linearGradient>

          <linearGradient id="slide03-side-glass-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.12 0 0 / 0.92)" />
            <stop offset="100%" stopColor="oklch(0.17 0 0 / 0.88)" />
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

          <linearGradient id="slide03-sidewalk-right-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.88)" />
            <stop offset="55%" stopColor="oklch(0.19 0 0 / 0.42)" />
            <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
          </linearGradient>

          <clipPath id="slide03-above-slice-clip">
            <rect x={60} y={250} width={365} height={aboveSliceClipHeight} />
          </clipPath>

          <clipPath id="slide03-below-slice-clip">
            <rect x={60} y={sliceY} width={365} height={belowSliceClipHeight} />
          </clipPath>

          <clipPath id="slide03-topdown-reveal-clip">
            <rect x={leftX - 40} y={topY - 24} width={rightX - leftX + 80} height={topDownClipHeight} />
          </clipPath>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={315} r={315} fill="url(#slide03-ambient-glow)" />

        {/* ================================================================
            BEAT 1: Side-Elevation Sports Coupe Slice & Top-Down Projection
           ================================================================ */}
        {sideOpacity > 0.01 ? (
          <g opacity={sideOpacity}>
            {/* Road Ground Line */}
            <line
              x1={60}
              y1={SIDE_CAR_GROUND_Y}
              x2={424}
              y2={SIDE_CAR_GROUND_Y}
              stroke="oklch(0.54 0 0 / 0.5)"
              strokeWidth={1.4}
            />

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
                x1={82}
                y1={SIDE_WHEEL_HUB_Y}
                x2={398}
                y2={SIDE_WHEEL_HUB_Y}
                stroke="oklch(0.97 0 0 / 0.85)"
                strokeWidth={1.6}
                strokeDasharray="4 4"
              />
            ) : null}

            {/* Descending 3D-Perspective Horizontal Slice Plane */}
            {slicePlaneOpacity > 0.01 ? (
              <g opacity={slicePlaneOpacity}>
                <polygon
                  points={`64,${sliceY + 9} 96,${sliceY - 9} 422,${sliceY - 9} 390,${sliceY + 9}`}
                  fill="url(#slide03-slice-plane-grad)"
                  stroke="oklch(0.96 0 0 / 0.88)"
                  strokeWidth={1.3}
                />
                <line
                  x1={74}
                  y1={sliceY}
                  x2={410}
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
              x1={420}
              y1={SIDE_WHEEL_HUB_Y}
              x2={536}
              y2={SIDE_WHEEL_HUB_Y}
              stroke="oklch(0.84 0 0 / 0.55)"
              strokeWidth={1.2}
              strokeDasharray="4 5"
            />
            <path
              d={`M 536 ${SIDE_WHEEL_HUB_Y} C 550 ${SIDE_WHEEL_HUB_Y}, 550 315, 566 315`}
              fill="none"
              stroke="oklch(0.9 0 0 / 0.72)"
              strokeWidth={1.3}
            />
            <polyline
              points="559,310 566,315 559,320"
              fill="none"
              stroke="oklch(0.9 0 0 / 0.72)"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ) : null}

        {/* ================================================================
            BEATS 3 & 4: Right-Side Concrete Kerb & Safe Clearance Offset Line
           ================================================================ */}
        {kerbVisibility > 0.01 ? (
          <g opacity={kerbVisibility} mask="url(#slide03-kerb-fade-mask)">
            {/* Sidewalk Slab Fading Rightward */}
            <rect x={kerbEdgeX + 9} y={48} width={145} height={524} fill="url(#slide03-sidewalk-right-grad)" />
            <g stroke="oklch(0.32 0 0 / 0.36)" strokeWidth={1}>
              {PAVING_JOINTS_Y.map((y) => (
                <line key={`pave-${y}`} x1={kerbEdgeX + 9} y1={y} x2={kerbEdgeX + 135} y2={y} />
              ))}
            </g>

            {/* Physical Raised Concrete Kerb Edge */}
            <rect x={kerbEdgeX} y={48} width={9} height={524} fill="oklch(0.31 0 0)" />
            <line x1={kerbEdgeX} y1={48} x2={kerbEdgeX} y2={572} stroke="oklch(0.76 0 0 / 0.74)" strokeWidth={1.6} />
            <line
              x1={kerbEdgeX + 9}
              y1={48}
              x2={kerbEdgeX + 9}
              y2={572}
              stroke="oklch(0.42 0 0 / 0.55)"
              strokeWidth={1}
            />
            <g stroke="oklch(0.45 0 0 / 0.65)" strokeWidth={1}>
              {KERB_EXPANSION_JOINTS_Y.map((y) => (
                <line key={`kerb-${y}`} x1={kerbEdgeX} y1={y} x2={kerbEdgeX + 9} y2={y} />
              ))}
            </g>

            {/* Clearance Corridor Between Imaginary Line AD & Concrete Kerb */}
            {kerbShift > 0.03 ? (
              <g opacity={kerbShift}>
                <rect x={rightX} y={56} width={kerbEdgeX - rightX} height={508} fill="oklch(0.95 0 0 / 0.035)" />

                {/* Caliper Clearance Ticks Aligned with Curbside Wheels E & F */}
                {[frontAxleY, rearAxleY].map((ty) => (
                  <g key={`gap-tick-${ty}`} stroke="oklch(0.84 0 0 / 0.68)" strokeWidth={1.1}>
                    <line x1={rightX + 2} y1={ty} x2={kerbEdgeX - 2} y2={ty} />
                    <line x1={rightX + 2} y1={ty - 3.5} x2={rightX + 2} y2={ty + 3.5} />
                    <line x1={kerbEdgeX - 2} y1={ty - 3.5} x2={kerbEdgeX - 2} y2={ty + 3.5} />
                  </g>
                ))}
              </g>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            MAIN STAGE: Enlarged 2D Cut-Plane Sports Coupe (Kerb on Right Edge AD)
           ================================================================ */}
        {carShellOpacity > 0.01 ? (
          <g clipPath="url(#slide03-topdown-reveal-clip)">
            <g transform={`translate(${carCenterX}, ${carCenterY}) scale(${carScale})`} opacity={carShellOpacity}>
              <CutPlaneCar
                variant={CarSectionVariants.Hero}
                kerbSide={KerbSides.Right}
                showBoundingBox={false}
                showVertexLabels={false}
                showAxlePlaneLines={true}
              />
            </g>
          </g>
        ) : null}

        {/* Protective Rim Glow Around Right-Side Curbside Wheels E & F */}
        {alloyHighlight > 0.03 ? (
          <g
            fill="none"
            stroke="oklch(0.96 0 0)"
            strokeWidth={1.6}
            opacity={alloyHighlight * 0.8}
            filter="url(#slide03-luminous-glow)"
          >
            <rect x={wheelRightX - 14} y={frontAxleY - 30} width={28} height={60} rx={8} />
            <rect x={wheelRightX - 14} y={rearAxleY - 30} width={28} height={60} rx={8} />
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
            BEAT 2: Outer Body Rectangle ABCD (Traced in Order A -> B -> C -> D)
           ================================================================ */}
        {rectVisible ? (
          <g>
            <path
              d={rectPathD}
              fill="none"
              stroke="oklch(0.95 0 0 / 0.85)"
              strokeWidth={1.6}
              strokeLinejoin="round"
              strokeDasharray={rectPerimeter}
              strokeDashoffset={rectPerimeter * (1 - rectDraw)}
            />

            {/* Right-Angle Corner Caliper Brackets */}
            {rectDraw > 0.05 ? (
              <g fill="none" stroke="oklch(0.98 0 0)" strokeWidth={1.8}>
                <path d={`M ${rightX - 12} ${topY} L ${rightX} ${topY} L ${rightX} ${topY + 12}`} />
                {rectDraw > 0.25 ? (
                  <path d={`M ${leftX} ${topY + 12} L ${leftX} ${topY} L ${leftX + 12} ${topY}`} />
                ) : null}
                {rectDraw > 0.65 ? (
                  <path d={`M ${leftX + 12} ${bottomY} L ${leftX} ${bottomY} L ${leftX} ${bottomY - 12}`} />
                ) : null}
                {rectDraw > 0.85 ? (
                  <path d={`M ${rightX} ${bottomY - 12} L ${rightX} ${bottomY} L ${rightX - 12} ${bottomY}`} />
                ) : null}
              </g>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            BEAT 3: Luminous Kerb / Imaginary Line Through A and D (Right Edge)
           ================================================================ */}
        {kerbLineDraw > 0.01 ? (
          <line
            x1={rightX}
            y1={64}
            x2={rightX}
            y2={560}
            stroke="oklch(0.98 0 0)"
            strokeWidth={kerbShift > 0.5 ? 1.7 : 2.1}
            strokeDasharray={kerbShift > 0.2 ? "7 5" : 496}
            strokeDashoffset={kerbShift > 0.2 ? 0 : 496 * (1 - kerbLineDraw)}
            filter={kerbShift < 0.2 ? "url(#slide03-luminous-glow)" : undefined}
          />
        ) : null}

        {/* Luminous Right Edge AD Highlight During Beat 4 Comparison */}
        {edgeAdGlow > 0.01 ? (
          <line
            x1={rightX}
            y1={topY}
            x2={rightX}
            y2={bottomY}
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.5}
            opacity={edgeAdGlow}
            filter="url(#slide03-luminous-glow)"
          />
        ) : null}

        {/* ================================================================
            BEAT 4: Wheel-Center Line E-F & Alignment with Right Edge A-D
           ================================================================ */}
        {efAxisDraw > 0.01 ? (
          <g>
            <line
              x1={wheelRightX}
              y1={topY}
              x2={wheelRightX}
              y2={bottomY}
              stroke="oklch(0.96 0 0 / 0.82)"
              strokeWidth={1.5}
              strokeDasharray={efAxisLength}
              strokeDashoffset={efAxisLength * (1 - efAxisDraw)}
            />

            {/* Radial Alignment Connectors Linking Curbside Hubs E & F to Edge AD */}
            {edgeAlignConnectors > 0.01 ? (
              <g
                stroke="oklch(0.94 0 0 / 0.82)"
                strokeWidth={1.4}
                strokeDasharray="2.5 2.5"
                opacity={edgeAlignConnectors}
              >
                <line x1={wheelRightX} y1={frontAxleY} x2={rightX} y2={frontAxleY} />
                <line x1={wheelRightX} y1={rearAxleY} x2={rightX} y2={rearAxleY} />
              </g>
            ) : null}

            {/* Wheel-Center Section Rings Around All Four Hubs */}
            <g fill="none" stroke="oklch(0.94 0 0 / 0.55)" strokeWidth={1.2} opacity={wheelFocus}>
              <circle cx={wheelRightX} cy={frontAxleY} r={14} />
              <circle cx={wheelRightX} cy={rearAxleY} r={14} />
              <circle cx={wheelLeftX} cy={frontAxleY} r={11} opacity={0.45} />
              <circle cx={wheelLeftX} cy={rearAxleY} r={11} opacity={0.45} />
            </g>
          </g>
        ) : null}

        {/* ================================================================
            SEQUENTIAL GEOMETRIC VERTEX NODES: A, B, C, D and Hubs E, F
           ================================================================ */}
        <VertexNode
          cx={rightX}
          cy={topY}
          label="A"
          labelX={rightX - 10}
          labelY={topY - 12}
          textAnchor="end"
          opacity={alphaA}
          pulse={pulseA}
        />
        <VertexNode
          cx={leftX}
          cy={topY}
          label="B"
          labelX={leftX + 10}
          labelY={topY - 12}
          textAnchor="start"
          opacity={alphaB}
          pulse={pulseB}
        />
        <VertexNode
          cx={leftX}
          cy={bottomY}
          label="C"
          labelX={leftX + 10}
          labelY={bottomY + 22}
          textAnchor="start"
          opacity={alphaC}
          pulse={pulseC}
        />
        <VertexNode
          cx={rightX}
          cy={bottomY}
          label="D"
          labelX={rightX - 10}
          labelY={bottomY + 22}
          textAnchor="end"
          opacity={alphaD}
          pulse={pulseD}
        />
        <VertexNode
          cx={wheelRightX}
          cy={frontAxleY}
          label="E"
          labelX={wheelRightX - 18}
          labelY={frontAxleY + 4}
          textAnchor="end"
          opacity={alphaE}
          pulse={pulseE}
        />
        <VertexNode
          cx={wheelRightX}
          cy={rearAxleY}
          label="F"
          labelX={wheelRightX - 18}
          labelY={rearAxleY + 4}
          textAnchor="end"
          opacity={alphaF}
          pulse={pulseF}
        />
      </svg>
    </div>
  );
}
