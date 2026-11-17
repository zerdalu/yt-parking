import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { MasterFormula } from "@/components/math-formula";
import {
  CarSectionVariants,
  computeAckermannAngles,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  type Point2D,
} from "@/simulation/car-simulator";
import { usePresentationStore } from "@/store/presentation-store";
import type { ReactElement } from "react";

const CAR_SCALE = 1.32;
const CAR_CENTER_X = 574;
const CAR_CENTER_Y = 340;

const HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5 * CAR_SCALE; // 110.88
const TRACK_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth * CAR_SCALE; // 40.92
const WHEEL_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5 * CAR_SCALE; // 68.64

// Shared Figure 2 / Figure 3 vertical kerb proof line at x = 614.92
const PROOF_LINE_X = CAR_CENTER_X + TRACK_HALF_W; // 614.92
const FRONT_BUMPER_Y = CAR_CENTER_Y - HALF_L; // 229.12
const FRONT_AXLE_Y = CAR_CENTER_Y - WHEEL_HALF_L; // 271.36
const REAR_AXLE_Y = CAR_CENTER_Y + WHEEL_HALF_L; // 408.64

const POINT_A: Point2D = { x: PROOF_LINE_X, y: FRONT_BUMPER_Y };
const POINT_E: Point2D = { x: PROOF_LINE_X, y: FRONT_AXLE_Y };
const POINT_F: Point2D = { x: PROOF_LINE_X, y: REAR_AXLE_Y };
const POINT_X: Point2D = { x: 365, y: REAR_AXLE_Y };

const LENGTH_FX = POINT_F.x - POINT_X.x; // 249.92
const LENGTH_EF = POINT_F.y - POINT_E.y; // 137.28
const LENGTH_AF = POINT_F.y - POINT_A.y; // 179.52
const RADIUS_AX = Math.hypot(LENGTH_FX, LENGTH_AF); // 307.712

// Front parked car (width w = 91.2px aligned to kerb proof line x = 614.92)
const FRONT_CAR_SCALE = 1.2;
const FRONT_CAR_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.width * 0.5 * FRONT_CAR_SCALE; // 45.6
const FRONT_CAR_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5 * FRONT_CAR_SCALE; // 100.8
const FRONT_CAR_CENTER_X = PROOF_LINE_X - FRONT_CAR_HALF_W; // 569.32
const WIDTH_W = FRONT_CAR_HALF_W * 2; // 91.2

const POINT_G_X = PROOF_LINE_X - WIDTH_W; // 523.72
const POINT_G_Y = POINT_X.y - Math.sqrt(RADIUS_AX * RADIUS_AX - (POINT_G_X - POINT_X.x) ** 2); // 145.023
const POINT_G: Point2D = { x: POINT_G_X, y: POINT_G_Y };
const POINT_H: Point2D = { x: PROOF_LINE_X, y: POINT_G_Y };
const POINT_K: Point2D = { x: POINT_G_X, y: REAR_AXLE_Y };
const FRONT_CAR_CENTER_Y = POINT_G.y - FRONT_CAR_HALF_L; // 44.223

const LENGTH_GK = POINT_K.y - POINT_G.y; // 263.617
const LENGTH_KX = POINT_K.x - POINT_X.x; // 158.72
const LENGTH_GX = Math.hypot(LENGTH_KX, LENGTH_GK); // 307.712
const LENGTH_AH = POINT_A.y - POINT_H.y; // 84.097

const TRIANGLE_GKX_PATH = `M ${POINT_G.x} ${POINT_G.y} L ${POINT_K.x} ${POINT_K.y} L ${POINT_X.x} ${POINT_X.y} Z`;
const TRIANGLE_GKX_PERIMETER = LENGTH_GK + LENGTH_KX + LENGTH_GX;

const VIRTUAL_STEER_DEG = -((Math.atan2(LENGTH_EF, CAR_CENTER_X - POINT_X.x) * 180) / Math.PI);
const ACKERMANN = computeAckermannAngles(VIRTUAL_STEER_DEG, DEFAULT_VEHICLE_DIMENSIONS);

const ANGLE_A_DEG = (Math.atan2(POINT_A.y - POINT_X.y, POINT_A.x - POINT_X.x) * 180) / Math.PI;
const ANGLE_G_DEG = (Math.atan2(POINT_G.y - POINT_X.y, POINT_G.x - POINT_X.x) * 180) / Math.PI;

const CALIPER_X = 658;
const TOTAL_HF_X = 736;

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

function pulseEnvelope(seconds: number, start: number, peakStart: number, peakEnd: number, end: number): number {
  if (seconds <= start || seconds >= end) {
    return 0;
  }
  if (seconds < peakStart) {
    return easeOutCubic(progressBetween(seconds, start, peakStart));
  }
  if (seconds <= peakEnd) {
    return 1;
  }
  return 1 - easeInOutCubic(progressBetween(seconds, peakEnd, end));
}

function pulseFactor(seconds: number, centerTime: number, halfWidth: number = 0.58): number {
  const dist = Math.abs(seconds - centerTime);
  if (dist >= halfWidth) {
    return 0;
  }
  return Math.cos((dist / halfWidth) * (Math.PI * 0.5));
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function buildArcSweep(center: Point2D, radius: number, startDeg: number, endDeg: number): string {
  const sRad = degToRad(startDeg);
  const eRad = degToRad(endDeg);
  const sx = center.x + radius * Math.cos(sRad);
  const sy = center.y + radius * Math.sin(sRad);
  const ex = center.x + radius * Math.cos(eRad);
  const ey = center.y + radius * Math.sin(eRad);
  const delta = endDeg - startDeg;
  const sweepFlag = delta >= 0 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

function buildVerticalCongruenceTicks(x: number, yCenter: number): string {
  return [
    `M ${(x - 6).toFixed(1)} ${(yCenter - 3).toFixed(1)} L ${(x + 6).toFixed(1)} ${(yCenter - 3).toFixed(1)}`,
    `M ${(x - 6).toFixed(1)} ${(yCenter + 3).toFixed(1)} L ${(x + 6).toFixed(1)} ${(yCenter + 3).toFixed(1)}`,
  ].join(" ");
}

const OUTER_CIRCLE_ARC = buildArcSweep(POINT_X, RADIUS_AX, ANGLE_A_DEG + 12, ANGLE_G_DEG - 12);
const TICKS_GK = buildVerticalCongruenceTicks(POINT_G.x, (POINT_G.y + POINT_K.y) * 0.5);
const TICKS_HF = buildVerticalCongruenceTicks(POINT_H.x, (POINT_H.y + POINT_F.y) * 0.5);

interface VertexNodeProps {
  readonly point: Point2D;
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly textAnchor: "start" | "middle" | "end";
  readonly opacity: number;
  readonly pulse: number;
}

function VertexNode({
  point,
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

  return (
    <g opacity={opacity}>
      {pulse > 0.04 ? (
        <circle
          cx={point.x}
          cy={point.y}
          r={7 + 7 * pulse}
          fill="none"
          stroke="oklch(0.98 0 0)"
          strokeWidth={1.3}
          opacity={pulse * 0.85}
        />
      ) : null}
      <circle
        cx={point.x}
        cy={point.y}
        r={3.5 + 1.8 * pulse}
        fill="oklch(0.98 0 0)"
        filter={pulse > 0.1 ? "url(#slide11-luminous-glow)" : undefined}
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

export function Slide11SolvingGkx(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  // Beat 1 (0.00s - 7.16s): Carry over Figure 3 stage & illuminate right-angled triangle GKX in order G -> K -> X
  const stageFadeIn = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.9));
  const gkxDraw = easeInOutCubic(progressBetween(elapsedSeconds, 2.2, 5.8));
  const step7Transition = easeInOutCubic(progressBetween(elapsedSeconds, 19.6, 21.8));
  const triangleDim = 1 - 0.48 * step7Transition;

  const carWakeForStep7 = easeOutCubic(progressBetween(elapsedSeconds, 26.8, 28.2));
  const heroCarOpacity = stageFadeIn * (0.34 - 0.08 * gkxDraw + 0.16 * carWakeForStep7);

  // Beat 2 (7.66s - 13.52s): Hypotenuse GX (Step 3) & base KX (Step 5)
  const gxFocus = Math.max(
    pulseEnvelope(elapsedSeconds, 7.7, 8.3, 9.9, 10.7),
    pulseEnvelope(elapsedSeconds, 14.0, 14.4, 15.6, 16.3),
  );
  const kxFocus = Math.max(
    pulseEnvelope(elapsedSeconds, 10.9, 11.4, 12.9, 13.7),
    pulseEnvelope(elapsedSeconds, 14.0, 14.4, 15.6, 16.3),
  );

  // Beat 3 (14.06s - 18.88s): Solve triangle GKX for vertical height |GK|
  const gkFocus = Math.max(
    pulseEnvelope(elapsedSeconds, 16.8, 17.4, 18.9, 19.8),
    pulseEnvelope(elapsedSeconds, 21.6, 22.2, 23.4, 24.4),
  );
  const gkLabelOpacity = easeOutCubic(progressBetween(elapsedSeconds, 16.9, 18.0));

  // Compact Step 6 equation card (13.8s - 19.3s)
  const compactCardOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 13.8, 14.5)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 18.8, 19.3)));
  const compactSquaresGlow = pulseEnvelope(elapsedSeconds, 14.0, 14.4, 15.4, 16.0);
  const compactRadicalDraw = easeInOutCubic(progressBetween(elapsedSeconds, 15.3, 16.6));
  const compactGkGlow = pulseEnvelope(elapsedSeconds, 16.8, 17.5, 18.6, 19.2);

  // Beat 4 (19.44s - 26.84s): Step 7 — GK slides rightward onto kerb segment HF
  const railOpacity = easeOutCubic(progressBetween(elapsedSeconds, 21.4, 22.8));
  const transferCorridorGlow = pulseEnvelope(elapsedSeconds, 22.0, 23.0, 25.8, 27.2);
  const slideProgress = easeInOutCubic(progressBetween(elapsedSeconds, 22.8, 25.4));
  const slidingBarX = POINT_G.x + (POINT_H.x - POINT_G.x) * slideProgress;
  const slidingBarOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 22.2, 22.8)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 25.5, 26.3)));

  const hfLanded = easeOutCubic(progressBetween(elapsedSeconds, 24.8, 25.7));
  const hfHighlight = pulseEnvelope(elapsedSeconds, 24.8, 25.3, 26.7, 27.6);
  const congruenceTicksOpacity = pulseEnvelope(elapsedSeconds, 24.9, 25.4, 26.8, 27.7);

  // Outer total |HF| caliper bracket (appears at 658, glides smoothly out to 736 at 26.8s)
  const hfBracketEnter = easeOutCubic(progressBetween(elapsedSeconds, 25.0, 25.9));
  const hfBracketShift = easeInOutCubic(progressBetween(elapsedSeconds, 26.8, 27.8));
  const hfBracketX = CALIPER_X + (TOTAL_HF_X - CALIPER_X) * hfBracketShift;
  const hfBracketFinalDim = easeInOutCubic(progressBetween(elapsedSeconds, 31.6, 32.8));
  const hfBracketOpacity = hfBracketEnter * (1 - 0.55 * hfBracketFinalDim);

  // Beat 5 (26.84s - 31.30s): Subtract wheelbase l (FE) and front overhang k (AE)
  const breakdownOpacity = easeOutCubic(progressBetween(elapsedSeconds, 27.1, 27.8));
  const lActive = pulseEnvelope(elapsedSeconds, 27.2, 27.8, 28.8, 29.5);
  const lSubtracted = easeInOutCubic(progressBetween(elapsedSeconds, 28.5, 29.3));
  const kActive = pulseEnvelope(elapsedSeconds, 29.1, 29.6, 30.5, 31.3);
  const kSubtracted = easeInOutCubic(progressBetween(elapsedSeconds, 30.3, 31.1));

  // Beat 6 (30.90s - 37.00s): What remains is A to H — exact extra space |AH|
  const ahReveal = easeOutCubic(progressBetween(elapsedSeconds, 30.9, 32.1));
  const ahPulse = pulseEnvelope(elapsedSeconds, 31.4, 32.1, 34.4, 35.8);

  // Expanded / Master Formula card (19.1s - 37.0s)
  const expandedCardOpacity = easeOutCubic(progressBetween(elapsedSeconds, 19.1, 19.8));
  const substPulse = pulseEnvelope(elapsedSeconds, 19.5, 20.1, 21.0, 21.8);

  // LHS transitions inside expanded card: |GK| -> |HF| -> |HF| - l - k -> |AH|
  const lhsGkOpacity = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 24.6, 25.2));
  const lhsHfOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 24.9, 25.4)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 31.3, 31.8)));
  const shiftHfLeft = easeInOutCubic(progressBetween(elapsedSeconds, 27.2, 27.9));
  const lhsMinusLReveal =
    easeOutCubic(progressBetween(elapsedSeconds, 27.8, 28.5)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 31.3, 31.8)));
  const lhsMinusKReveal =
    easeOutCubic(progressBetween(elapsedSeconds, 29.4, 30.1)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 31.3, 31.8)));
  const lhsAhOpacity = easeOutCubic(progressBetween(elapsedSeconds, 31.8, 32.4));

  // RHS tail: - l - k
  const rhsMinusLReveal = easeOutCubic(progressBetween(elapsedSeconds, 27.8, 28.5));
  const rhsMinusKReveal = easeOutCubic(progressBetween(elapsedSeconds, 29.4, 30.1));

  // Smoothly interpolated pill dimensions around the formula
  const lhsExpand =
    easeInOutCubic(progressBetween(elapsedSeconds, 27.2, 28.0)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 31.8, 32.4)));
  const rhsExpand = easeInOutCubic(progressBetween(elapsedSeconds, 27.6, 28.5));
  const pillLeft = -332 - 74 * lhsExpand;
  const pillRight = 234 + 78 * rhsExpand;
  const pillWidth = pillRight - pillLeft;

  // Vertex opacities & spoken-letter pulses
  const alphaH = 0.55 * stageFadeIn + 0.45 * easeOutCubic(progressBetween(elapsedSeconds, 24.4, 25.4));
  const alphaF = 0.55 * stageFadeIn + 0.45 * easeOutCubic(progressBetween(elapsedSeconds, 24.4, 25.4));
  const alphaE = 0.42 * stageFadeIn + 0.58 * easeOutCubic(progressBetween(elapsedSeconds, 27.4, 28.4));
  const alphaA = 0.45 * stageFadeIn + 0.55 * easeOutCubic(progressBetween(elapsedSeconds, 29.4, 30.4));

  const pulseG = Math.max(
    pulseFactor(elapsedSeconds, 5.75, 0.55),
    pulseFactor(elapsedSeconds, 8.85, 0.55),
    pulseFactor(elapsedSeconds, 18.2, 0.55),
    pulseFactor(elapsedSeconds, 22.4, 0.55),
  );
  const pulseK = Math.max(
    pulseFactor(elapsedSeconds, 6.25, 0.55),
    pulseFactor(elapsedSeconds, 12.0, 0.55),
    pulseFactor(elapsedSeconds, 18.55, 0.55),
    pulseFactor(elapsedSeconds, 23.0, 0.55),
  );
  const pulseX = Math.max(
    pulseFactor(elapsedSeconds, 6.75, 0.55),
    pulseFactor(elapsedSeconds, 9.25, 0.55),
    pulseFactor(elapsedSeconds, 12.35, 0.55),
  );
  const pulseH = Math.max(pulseFactor(elapsedSeconds, 25.1, 0.55), pulseFactor(elapsedSeconds, 32.55, 0.6));
  const pulseF = Math.max(pulseFactor(elapsedSeconds, 25.65, 0.55), pulseFactor(elapsedSeconds, 28.5, 0.5));
  const pulseE = Math.max(pulseFactor(elapsedSeconds, 28.5, 0.5), pulseFactor(elapsedSeconds, 30.1, 0.5));
  const pulseA = Math.max(pulseFactor(elapsedSeconds, 30.1, 0.5), pulseFactor(elapsedSeconds, 32.05, 0.6));

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">11</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Proof Steps 6 &amp; 7: Solving Triangle GKX for AH
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>
          Right-angled triangle GKX solving vertical height |GK|, transferring to kerb segment HF, and subtracting l + k
          to isolate extra parking space |AH|
        </title>
        <defs>
          <radialGradient id="slide11-ambient-glow" cx="50%" cy="50%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide11-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="slide11-top-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="14%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="white" stopOpacity={1} />
          </linearGradient>

          <mask id="slide11-top-fade-mask">
            <rect x={0} y={0} width={960} height={620} fill="url(#slide11-top-fade-grad)" />
          </mask>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={310} r={315} fill="url(#slide11-ambient-glow)" />

        {/* Vertical Kerb Proof Line Through H, A, E, F */}
        <line
          x1={PROOF_LINE_X}
          y1={76}
          x2={PROOF_LINE_X}
          y2={468}
          stroke="oklch(0.75 0 0 / 0.28)"
          strokeWidth={1.15}
          strokeDasharray="4 6"
          opacity={stageFadeIn}
        />

        {/* Front Parked Car Rear Silhouette */}
        <g mask="url(#slide11-top-fade-mask)" opacity={stageFadeIn * 0.68}>
          <g transform={`translate(${FRONT_CAR_CENTER_X}, ${FRONT_CAR_CENTER_Y}) scale(${FRONT_CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
        </g>

        {/* Hero Sports Coupe Context */}
        <g transform={`translate(${CAR_CENTER_X}, ${CAR_CENTER_Y}) scale(${CAR_SCALE})`} opacity={heroCarOpacity}>
          <CutPlaneCar
            variant={CarSectionVariants.Hero}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={true}
            frontLeftSteerDeg={ACKERMANN.frontLeftSteerDeg}
            frontRightSteerDeg={ACKERMANN.frontRightSteerDeg}
          />
        </g>

        {/* Outer Circle Reference */}
        <path
          d={OUTER_CIRCLE_ARC}
          fill="none"
          stroke="oklch(0.84 0 0 / 0.35)"
          strokeWidth={1.25}
          strokeDasharray="5 5"
          opacity={stageFadeIn * triangleDim}
        />

        {/* ================================================================
            STEP 6: RIGHT-ANGLED TRIANGLE GKX
           ================================================================ */}
        <g opacity={stageFadeIn}>
          {/* Subtle Interior Triangle Fill */}
          <path d={TRIANGLE_GKX_PATH} fill={`oklch(0.96 0 0 / ${(0.045 * gkxDraw * triangleDim).toFixed(3)})`} />

          {/* Baseline Triangle Segments Carried from Slide 10 */}
          <path
            d={TRIANGLE_GKX_PATH}
            fill="none"
            stroke={`oklch(0.9 0 0 / ${(0.58 * triangleDim).toFixed(2)})`}
            strokeWidth={1.55}
            strokeLinejoin="round"
          />

          {/* Animated Luminous Perimeter Trace on "triangle GKX" */}
          {gkxDraw > 0.01 ? (
            <path
              d={TRIANGLE_GKX_PATH}
              fill="none"
              stroke={`oklch(0.97 0 0 / ${(0.88 * triangleDim).toFixed(2)})`}
              strokeWidth={1.85}
              strokeLinejoin="round"
              strokeDasharray={TRIANGLE_GKX_PERIMETER}
              strokeDashoffset={TRIANGLE_GKX_PERIMETER * (1 - gkxDraw)}
            />
          ) : null}

          {/* Right-Angle Corner Marker at K */}
          <path
            d={`M ${POINT_K.x - 14} ${POINT_K.y} L ${POINT_K.x - 14} ${POINT_K.y - 14} L ${POINT_K.x} ${POINT_K.y - 14}`}
            fill="none"
            stroke={`oklch(0.98 0 0 / ${(0.65 + 0.35 * gkxDraw) * triangleDim})`}
            strokeWidth={1.5}
          />

          {/* Active Segment Spotlights */}
          {gxFocus > 0.02 ? (
            <line
              x1={POINT_X.x}
              y1={POINT_X.y}
              x2={POINT_G.x}
              y2={POINT_G.y}
              stroke="oklch(0.99 0 0)"
              strokeWidth={2.8}
              opacity={gxFocus}
              filter="url(#slide11-luminous-glow)"
            />
          ) : null}

          {kxFocus > 0.02 ? (
            <line
              x1={POINT_X.x}
              y1={POINT_X.y}
              x2={POINT_K.x}
              y2={POINT_K.y}
              stroke="oklch(0.99 0 0)"
              strokeWidth={2.8}
              opacity={kxFocus}
              filter="url(#slide11-luminous-glow)"
            />
          ) : null}

          {gkFocus > 0.02 ? (
            <line
              x1={POINT_G.x}
              y1={POINT_G.y}
              x2={POINT_K.x}
              y2={POINT_K.y}
              stroke="oklch(0.99 0 0)"
              strokeWidth={2.9}
              opacity={gkFocus}
              filter="url(#slide11-luminous-glow)"
            />
          ) : null}

          {/* Segment Labels: |GX|, |KX|, and |GK| */}
          <text
            x={427}
            y={267}
            textAnchor="end"
            opacity={(0.46 + 0.54 * gxFocus) * triangleDim}
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4.5}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-math text-sm font-semibold"
          >
            |GX|
          </text>

          <g opacity={(0.48 + 0.52 * kxFocus) * triangleDim}>
            <path
              d={`M ${POINT_X.x} ${POINT_X.y + 10} L ${POINT_X.x} ${POINT_X.y + 17} L ${POINT_K.x} ${POINT_K.y + 17} L ${POINT_K.x} ${POINT_K.y + 10}`}
              fill="none"
              stroke="oklch(0.94 0 0 / 0.85)"
              strokeWidth={1.45}
            />
            <text
              x={(POINT_X.x + POINT_K.x) * 0.5}
              y={POINT_X.y + 32}
              textAnchor="middle"
              className="fill-text-primary font-math text-sm font-semibold"
            >
              |KX|
            </text>
          </g>

          {gkLabelOpacity > 0.01 ? (
            <text
              x={507}
              y={282}
              textAnchor="end"
              opacity={gkLabelOpacity * (0.58 + 0.42 * gkFocus)}
              stroke="oklch(0.15 0 0 / 0.94)"
              strokeWidth={4.5}
              strokeLinejoin="round"
              className="svg-label-halo fill-text-primary font-math text-sm font-semibold"
            >
              |GK|
            </text>
          ) : null}
        </g>

        {/* ================================================================
            STEP 7: TRANSFERRING GK -> HF & SUBTRACTING l + k -> |AH|
           ================================================================ */}
        {/* Rectangular Transfer Corridor GHFK & Parallel Rails GH / KF */}
        {railOpacity > 0.01 ? (
          <g>
            {transferCorridorGlow > 0.02 ? (
              <rect
                x={POINT_G.x}
                y={POINT_G.y}
                width={WIDTH_W}
                height={LENGTH_GK}
                fill="oklch(0.96 0 0 / 0.045)"
                opacity={transferCorridorGlow}
              />
            ) : null}

            <g
              stroke={`oklch(0.92 0 0 / ${(0.45 + 0.45 * transferCorridorGlow).toFixed(2)})`}
              strokeWidth={1.35}
              strokeDasharray="4 4"
              opacity={railOpacity}
            >
              <line x1={POINT_G.x} y1={POINT_G.y} x2={POINT_H.x} y2={POINT_H.y} />
              <line x1={POINT_K.x} y1={POINT_K.y} x2={POINT_F.x} y2={POINT_F.y} />
            </g>
          </g>
        ) : null}

        {/* Sliding Copy of GK Translating Across Rectangle GHFK onto HF */}
        {slidingBarOpacity > 0.01 ? (
          <g opacity={slidingBarOpacity}>
            <line
              x1={slidingBarX}
              y1={POINT_G.y}
              x2={slidingBarX}
              y2={POINT_K.y}
              stroke="oklch(0.99 0 0)"
              strokeWidth={2.6}
              filter="url(#slide11-luminous-glow)"
            />
            <circle cx={slidingBarX} cy={POINT_G.y} r={3} fill="oklch(0.99 0 0)" />
            <circle cx={slidingBarX} cy={POINT_K.y} r={3} fill="oklch(0.99 0 0)" />
          </g>
        ) : null}

        {/* Kerb Segment HF Highlight & Congruence Double-Ticks */}
        {hfLanded > 0.01 ? (
          <g opacity={hfLanded}>
            <line
              x1={POINT_H.x}
              y1={POINT_H.y}
              x2={POINT_F.x}
              y2={POINT_F.y}
              stroke={`oklch(0.98 0 0 / ${(0.35 + 0.65 * hfHighlight).toFixed(2)})`}
              strokeWidth={2.1 + 0.7 * hfHighlight}
              filter={hfHighlight > 0.2 ? "url(#slide11-luminous-glow)" : undefined}
            />
          </g>
        ) : null}

        {congruenceTicksOpacity > 0.01 ? (
          <g opacity={congruenceTicksOpacity} stroke="oklch(0.99 0 0)" strokeWidth={1.7} strokeLinecap="round">
            <path d={TICKS_GK} fill="none" />
            <path d={TICKS_HF} fill="none" />
          </g>
        ) : null}

        {/* Outer Reference Bracket |HF| (Appears at 658, glides out to 736) */}
        {hfBracketOpacity > 0.01 ? (
          <g opacity={hfBracketOpacity}>
            <g stroke="oklch(0.84 0 0 / 0.5)" strokeWidth={1.1} strokeDasharray="3 3">
              <line x1={POINT_H.x} y1={POINT_H.y} x2={hfBracketX + 6} y2={POINT_H.y} />
              <line x1={POINT_F.x} y1={POINT_F.y} x2={hfBracketX + 6} y2={POINT_F.y} />
            </g>
            <line
              x1={hfBracketX}
              y1={POINT_H.y}
              x2={hfBracketX}
              y2={POINT_F.y}
              stroke="oklch(0.96 0 0)"
              strokeWidth={1.7}
            />
            <g stroke="oklch(0.95 0 0)" strokeWidth={1.35}>
              <line x1={hfBracketX - 4} y1={POINT_H.y} x2={hfBracketX + 4} y2={POINT_H.y} />
              <line x1={hfBracketX - 4} y1={POINT_F.y} x2={hfBracketX + 4} y2={POINT_F.y} />
            </g>
            <text
              x={hfBracketX + 13}
              y={(POINT_H.y + POINT_F.y) * 0.5 + 4}
              textAnchor="start"
              stroke="oklch(0.15 0 0 / 0.94)"
              strokeWidth={4}
              strokeLinejoin="round"
              className="svg-label-halo fill-text-primary font-math text-sm font-semibold"
            >
              {hfBracketShift < 0.4 ? (
                <>
                  <tspan>|HF|</tspan>
                  <tspan className="fill-text-secondary font-normal"> = </tspan>
                  <tspan>|GK|</tspan>
                </>
              ) : (
                "|HF|"
              )}
            </text>
          </g>
        ) : null}

        {/* Segmented Subtraction Bar along Kerb (H -> A -> E -> F) */}
        {breakdownOpacity > 0.01 ? (
          <g opacity={breakdownOpacity}>
            {/* Horizontal Extension Guides at A and E */}
            <g stroke="oklch(0.84 0 0 / 0.52)" strokeWidth={1.1} strokeDasharray="3 3">
              <line x1={POINT_A.x} y1={POINT_A.y} x2={CALIPER_X + 6} y2={POINT_A.y} />
              <line x1={POINT_E.x} y1={POINT_E.y} x2={CALIPER_X + 6} y2={POINT_E.y} />
            </g>

            {/* Bottom Segment F..E = Wheelbase l (Subtracts away) */}
            <g>
              {lActive > 0.02 ? (
                <line
                  x1={POINT_E.x}
                  y1={POINT_E.y}
                  x2={POINT_F.x}
                  y2={POINT_F.y}
                  stroke="oklch(0.98 0 0)"
                  strokeWidth={2.5}
                  opacity={lActive}
                  filter="url(#slide11-luminous-glow)"
                />
              ) : null}
              <line
                x1={CALIPER_X}
                y1={POINT_E.y}
                x2={CALIPER_X}
                y2={POINT_F.y}
                stroke={`oklch(0.92 0 0 / ${(0.95 - 0.62 * lSubtracted).toFixed(2)})`}
                strokeWidth={1.9 - 0.4 * lSubtracted}
                strokeDasharray={lSubtracted > 0.35 ? "3 4" : undefined}
                filter={lActive > 0.25 ? "url(#slide11-luminous-glow)" : undefined}
              />
              <g stroke={`oklch(0.9 0 0 / ${(0.85 - 0.45 * lSubtracted).toFixed(2)})`} strokeWidth={1.3}>
                <line x1={CALIPER_X - 4} y1={POINT_F.y} x2={CALIPER_X + 4} y2={POINT_F.y} />
                <line x1={CALIPER_X - 4} y1={POINT_E.y} x2={CALIPER_X + 4} y2={POINT_E.y} />
              </g>
              <text
                x={CALIPER_X + 14}
                y={(POINT_E.y + POINT_F.y) * 0.5 + 5}
                textAnchor="start"
                opacity={0.58 + 0.42 * lActive}
                className="fill-text-secondary font-math text-base font-semibold italic"
              >
                l
              </text>
            </g>

            {/* Middle Segment E..A = Front Overhang k (Subtracts away) */}
            <g>
              {kActive > 0.02 ? (
                <line
                  x1={POINT_A.x}
                  y1={POINT_A.y}
                  x2={POINT_E.x}
                  y2={POINT_E.y}
                  stroke="oklch(0.98 0 0)"
                  strokeWidth={2.5}
                  opacity={kActive}
                  filter="url(#slide11-luminous-glow)"
                />
              ) : null}
              <line
                x1={CALIPER_X}
                y1={POINT_A.y}
                x2={CALIPER_X}
                y2={POINT_E.y}
                stroke={`oklch(0.92 0 0 / ${(0.95 - 0.62 * kSubtracted).toFixed(2)})`}
                strokeWidth={1.9 - 0.4 * kSubtracted}
                strokeDasharray={kSubtracted > 0.35 ? "3 4" : undefined}
                filter={kActive > 0.25 ? "url(#slide11-luminous-glow)" : undefined}
              />
              <line
                x1={CALIPER_X - 4}
                y1={POINT_A.y}
                x2={CALIPER_X + 4}
                y2={POINT_A.y}
                stroke={`oklch(0.92 0 0 / ${(0.88 - 0.45 * kSubtracted).toFixed(2)})`}
                strokeWidth={1.35}
              />
              <text
                x={CALIPER_X + 14}
                y={(POINT_A.y + POINT_E.y) * 0.5 + 5}
                textAnchor="start"
                opacity={0.58 + 0.42 * kActive}
                className="fill-text-secondary font-math text-base font-semibold italic"
              >
                k
              </text>
            </g>

            {/* Remaining Top Gap H..A = Exact Extra Space |AH| */}
            <g>
              {/* Luminous Shaded Clearance Zone Ahead of Front Bumper */}
              {ahReveal > 0.01 ? (
                <rect
                  x={POINT_G.x}
                  y={POINT_H.y}
                  width={WIDTH_W}
                  height={LENGTH_AH}
                  rx={3}
                  fill={`oklch(0.98 0 0 / ${(0.08 + 0.05 * ahPulse).toFixed(3)})`}
                  stroke={`oklch(0.96 0 0 / ${(0.55 + 0.35 * ahPulse).toFixed(2)})`}
                  strokeWidth={1.2}
                  strokeDasharray="3 3"
                  opacity={ahReveal}
                />
              ) : null}

              {/* Remaining Kerb Segment A..H */}
              <line
                x1={POINT_H.x}
                y1={POINT_H.y}
                x2={POINT_A.x}
                y2={POINT_A.y}
                stroke="oklch(0.99 0 0)"
                strokeWidth={2 + 0.9 * ahReveal}
                opacity={0.45 + 0.55 * ahReveal}
                filter={ahReveal > 0.2 ? "url(#slide11-luminous-glow)" : undefined}
              />

              {/* Remaining Luminous Caliper Bar A..H */}
              <line
                x1={CALIPER_X}
                y1={POINT_H.y}
                x2={CALIPER_X}
                y2={POINT_A.y}
                stroke="oklch(0.99 0 0)"
                strokeWidth={2.2 + 0.8 * ahReveal}
                filter={ahReveal > 0.15 ? "url(#slide11-luminous-glow)" : undefined}
              />
              <g stroke="oklch(0.99 0 0)" strokeWidth={1.6}>
                <line x1={CALIPER_X - 4} y1={POINT_H.y} x2={CALIPER_X + 4} y2={POINT_H.y} />
                <line x1={CALIPER_X - 4} y1={POINT_A.y} x2={CALIPER_X + 4} y2={POINT_A.y} />
              </g>

              {/* Framed |AH| Badge Right of Remaining Space */}
              {ahReveal > 0.01 ? (
                <g opacity={ahReveal} filter={ahPulse > 0.25 ? "url(#slide11-luminous-glow)" : undefined}>
                  <rect
                    x={CALIPER_X + 14}
                    y={(POINT_H.y + POINT_A.y) * 0.5 - 15}
                    width={52}
                    height={30}
                    rx={6}
                    fill="oklch(0.22 0 0 / 0.94)"
                    stroke="oklch(0.98 0 0 / 0.92)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={CALIPER_X + 40}
                    y={(POINT_H.y + POINT_A.y) * 0.5 + 5}
                    textAnchor="middle"
                    className="fill-text-primary font-math text-sm font-semibold"
                  >
                    |AH|
                  </text>
                </g>
              ) : null}
            </g>
          </g>
        ) : null}

        {/* ================================================================
            BOTTOM EQUATION CARD: STEP 6 COMPACT -> MASTER FORMULA
           ================================================================ */}
        {/* Compact Step 6 Card: |GK| = √(|GX|² − |KX|²) */}
        {compactCardOpacity > 0.01 ? (
          <g transform="translate(480, 520)" opacity={compactCardOpacity}>
            <rect
              x={-166}
              y={-26}
              width={332}
              height={48}
              rx={8}
              fill="oklch(0.21 0 0 / 0.92)"
              stroke="oklch(0.95 0 0 / 0.85)"
              strokeWidth={1.4}
            />

            <text
              x={-110}
              y={5}
              textAnchor="middle"
              filter={compactGkGlow > 0.25 ? "url(#slide11-luminous-glow)" : undefined}
              className="fill-text-primary font-math text-lg font-semibold"
            >
              |GK|
            </text>
            <text x={-76} y={5} textAnchor="middle" className="fill-text-secondary font-math text-lg">
              =
            </text>

            {/* Vector Radical Drawing Over |GX|^2 - |KX|^2 */}
            {compactRadicalDraw > 0.01 ? (
              <path
                d="M -58 0 L -54 0 L -49 9 L -39 -18 L 128 -18 L 128 -13"
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={216}
                strokeDashoffset={216 * (1 - compactRadicalDraw)}
                filter="url(#slide11-luminous-glow)"
              />
            ) : null}

            <g filter={compactSquaresGlow > 0.25 ? "url(#slide11-luminous-glow)" : undefined}>
              <text x={-6} y={5} textAnchor="middle" className="fill-text-primary font-math text-lg font-semibold">
                <tspan>|GX|</tspan>
                <tspan dy={-8} className="text-xs font-semibold">
                  2
                </tspan>
              </text>
              <text x={38} y={5} textAnchor="middle" className="fill-text-secondary font-math text-lg">
                −
              </text>
              <text x={86} y={5} textAnchor="middle" className="fill-text-primary font-math text-lg font-semibold">
                <tspan>|KX|</tspan>
                <tspan dy={-8} className="text-xs font-semibold">
                  2
                </tspan>
              </text>
            </g>
          </g>
        ) : null}

        {/* Expanded Substituted & Final Master Formula Card */}
        {expandedCardOpacity > 0.01 ? (
          <g transform="translate(480, 522) scale(0.86)" opacity={expandedCardOpacity}>
            <rect
              x={pillLeft}
              y={-55}
              width={pillWidth}
              height={84}
              rx={10}
              fill="oklch(0.21 0 0 / 0.94)"
              stroke="oklch(0.95 0 0 / 0.86)"
              strokeWidth={1.55}
            />

            <MasterFormula
              glowFilterId="slide11-luminous-glow"
              lhs={{
                kind: "step7-morph",
                gkOpacity: lhsGkOpacity,
                hfOpacity: lhsHfOpacity,
                shiftHfLeft,
                minusLOpacity: lhsMinusLReveal,
                minusKOpacity: lhsMinusKReveal,
                ahOpacity: lhsAhOpacity,
                ahGlow: ahPulse,
              }}
              substGlow={substPulse}
              minusLOpacity={rhsMinusLReveal}
              minusLOffsetY={(1 - rhsMinusLReveal) * 8}
              minusKOpacity={rhsMinusKReveal}
              minusKOffsetY={(1 - rhsMinusKReveal) * 8}
              lGlow={lActive}
              kGlow={kActive}
            />
          </g>
        ) : null}

        {/* ================================================================
            TURNING CENTER X & GEOMETRIC VERTICES G, H, K, A, E, F
           ================================================================ */}
        <g transform={`translate(${POINT_X.x}, ${POINT_X.y})`} opacity={stageFadeIn}>
          {pulseX > 0.04 ? (
            <circle
              cx={0}
              cy={0}
              r={19 + 10 * pulseX}
              fill="none"
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.4}
              opacity={pulseX * 0.85}
            />
          ) : null}
          <polygon
            points="0,-16 13.86,-8 13.86,8 0,16 -13.86,8 -13.86,-8"
            fill="oklch(0.24 0 0 / 0.94)"
            stroke="oklch(0.94 0 0 / 0.9)"
            strokeWidth={1.4}
          />
          <circle cx={0} cy={0} r={4.5 + 1.4 * pulseX} fill="oklch(0.98 0 0)" filter="url(#slide11-luminous-glow)" />
          <text
            x={-22}
            y={5}
            textAnchor="end"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold tracking-mono"
          >
            X
          </text>
        </g>

        <VertexNode
          point={POINT_G}
          label="G"
          labelX={POINT_G.x - 14}
          labelY={POINT_G.y - 8}
          textAnchor="end"
          opacity={stageFadeIn}
          pulse={pulseG}
        />
        <VertexNode
          point={POINT_K}
          label="K"
          labelX={POINT_K.x + 12}
          labelY={POINT_K.y - 12}
          textAnchor="start"
          opacity={stageFadeIn}
          pulse={pulseK}
        />
        <VertexNode
          point={POINT_H}
          label="H"
          labelX={629}
          labelY={POINT_H.y - 8}
          textAnchor="start"
          opacity={alphaH}
          pulse={pulseH}
        />
        <VertexNode
          point={POINT_A}
          label="A"
          labelX={629}
          labelY={POINT_A.y - 7}
          textAnchor="start"
          opacity={alphaA}
          pulse={pulseA}
        />
        <VertexNode
          point={POINT_E}
          label="E"
          labelX={629}
          labelY={POINT_E.y - 7}
          textAnchor="start"
          opacity={alphaE}
          pulse={pulseE}
        />
        <VertexNode
          point={POINT_F}
          label="F"
          labelX={629}
          labelY={POINT_F.y + 18}
          textAnchor="start"
          opacity={alphaF}
          pulse={pulseF}
        />
      </svg>
    </div>
  );
}
