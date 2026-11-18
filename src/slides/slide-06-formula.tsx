import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { MasterFormula, RootR2MinusL2 } from "@/components/math-formula";
import { RoadStage } from "@/components/road-stage";
import {
  CarSectionVariants,
  computeAckermannAngles,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  type Point2D,
} from "@/simulation/car-simulator";
import { usePresentationStore } from "@/store/presentation-store";
import type { ReactElement } from "react";

// Frozen critical-instant geometry matching Slide 07 (Scale 1.0 aligned to RoadStage bay at x = 627)
const PARALLEL_CENTER_X = 627;
const PARALLEL_CENTER_Y = 324;
const REAR_AXLE_Y = PARALLEL_CENTER_Y + DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5; // 376
const TURNING_CENTER: Point2D = { x: 475, y: REAR_AXLE_Y };
const REAR_TO_CENTER_DX = PARALLEL_CENTER_X - TURNING_CENTER.x; // 152

const VIRTUAL_STEER_DEG = -((Math.atan2(DEFAULT_VEHICLE_DIMENSIONS.wheelbase, REAR_TO_CENTER_DX) * 180) / Math.PI); // -34.38 deg
const ACKERMANN = computeAckermannAngles(VIRTUAL_STEER_DEG, DEFAULT_VEHICLE_DIMENSIONS);

const HALF_W = DEFAULT_VEHICLE_DIMENSIONS.width * 0.5; // 38
const HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5; // 84
const TRACK_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth; // 31
const WHEEL_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5; // 52

// Exact radii around turning center X(475, 376)
const RADIUS_AX = Math.hypot(
  PARALLEL_CENTER_X + HALF_W - TURNING_CENTER.x,
  PARALLEL_CENTER_Y - HALF_L - TURNING_CENTER.y,
); // 233.658
const RADIUS_EX = Math.hypot(
  PARALLEL_CENTER_X + TRACK_HALF_W - TURNING_CENTER.x,
  PARALLEL_CENTER_Y - WHEEL_HALF_L - TURNING_CENTER.y,
); // 210.487
const RADIUS_FX = PARALLEL_CENTER_X + TRACK_HALF_W - TURNING_CENTER.x; // 183

// Front parked car rear-left corner G positioned on the exact outer circle of radius RADIUS_AX
const POINT_G_X = PARALLEL_CENTER_X - HALF_W; // 589
const POINT_G_Y = TURNING_CENTER.y - Math.sqrt(RADIUS_AX * RADIUS_AX - (POINT_G_X - TURNING_CENTER.x) ** 2); // 172.039
const FRONT_PARKED_CENTER_Y = POINT_G_Y - HALF_L; // 88.039
const REAR_PARKED_CENTER_Y = 520;

const POINT_A_PARALLEL: Point2D = { x: PARALLEL_CENTER_X + HALF_W, y: PARALLEL_CENTER_Y - HALF_L }; // (665, 240)
const POINT_G: Point2D = { x: POINT_G_X, y: POINT_G_Y };
const POINT_H: Point2D = { x: PARALLEL_CENTER_X + HALF_W, y: POINT_G_Y };

const ANGLE_A_PARALLEL_DEG =
  (Math.atan2(POINT_A_PARALLEL.y - TURNING_CENTER.y, POINT_A_PARALLEL.x - TURNING_CENTER.x) * 180) / Math.PI;
const ANGLE_G_DEG = (Math.atan2(POINT_G.y - TURNING_CENTER.y, POINT_G.x - TURNING_CENTER.x) * 180) / Math.PI;
const GRAZE_HEADING_DEG = ANGLE_G_DEG - ANGLE_A_PARALLEL_DEG; // -25.203 deg

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

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function buildArcFromAngles(center: Point2D, radius: number, startDeg: number, endDeg: number): string {
  const sRad = degToRad(startDeg);
  const eRad = degToRad(endDeg);
  const sx = center.x + radius * Math.cos(sRad);
  const sy = center.y + radius * Math.sin(sRad);
  const ex = center.x + radius * Math.cos(eRad);
  const ey = center.y + radius * Math.sin(eRad);
  const sweepFlag = endDeg >= startDeg ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

function rotateCarCenterAroundX(headingDeg: number): Point2D {
  const rad = degToRad(headingDeg);
  const dx = PARALLEL_CENTER_X - TURNING_CENTER.x;
  const dy = PARALLEL_CENTER_Y - TURNING_CENTER.y;
  return {
    x: TURNING_CENTER.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: TURNING_CENTER.y + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

const OUTER_CIRCLE_ARC = buildArcFromAngles(TURNING_CENTER, RADIUS_AX, -80, -14);
const WHEEL_E_CIRCLE_ARC = buildArcFromAngles(TURNING_CENTER, RADIUS_EX, -76, -8);
const WHEEL_F_CIRCLE_ARC = buildArcFromAngles(TURNING_CENTER, RADIUS_FX, -70, 12);
const GRAZE_CAR_CENTER = rotateCarCenterAroundX(GRAZE_HEADING_DEG);

interface RightTriangleCardProps {
  readonly pTop: Point2D;
  readonly pCorner: Point2D;
  readonly pLeft: Point2D;
  readonly topLabel: string;
  readonly cornerLabel: string;
  readonly leftLabel: string;
  readonly drawProgress: number;
  readonly emphasis: number;
  readonly children?: ReactElement;
}

function RightTriangleDiagram({
  pTop,
  pCorner,
  pLeft,
  topLabel,
  cornerLabel,
  leftLabel,
  drawProgress,
  emphasis,
  children,
}: RightTriangleCardProps): ReactElement | null {
  if (drawProgress <= 0.01) {
    return null;
  }

  const lenA = Math.hypot(pCorner.x - pTop.x, pCorner.y - pTop.y);
  const lenB = Math.hypot(pCorner.x - pLeft.x, pCorner.y - pLeft.y);
  const lenC = Math.hypot(pTop.x - pLeft.x, pTop.y - pLeft.y);
  const perimeter = lenA + lenB + lenC;

  const pathD = `M ${pLeft.x} ${pLeft.y} L ${pCorner.x} ${pCorner.y} L ${pTop.x} ${pTop.y} Z`;
  const strokeOpacity = 0.72 + 0.28 * emphasis;
  const strokeWidth = 1.6 + 0.55 * emphasis;
  const labelOpacity = easeOutCubic(progressBetween(drawProgress, 0.35, 0.95));

  return (
    <g>
      {/* Subtle interior fill */}
      <path
        d={pathD}
        fill={`oklch(0.95 0 0 / ${(0.03 + 0.055 * emphasis).toFixed(3)})`}
        opacity={easeOutCubic(progressBetween(drawProgress, 0.25, 0.95))}
      />

      {/* Right-angle marker at corner */}
      <path
        d={`M ${pCorner.x - 11} ${pCorner.y} L ${pCorner.x - 11} ${pCorner.y - 11} L ${pCorner.x} ${pCorner.y - 11}`}
        fill="none"
        stroke={`oklch(0.92 0 0 / ${(0.55 + 0.38 * emphasis).toFixed(2)})`}
        strokeWidth={1.2}
        opacity={labelOpacity}
      />

      {/* Animated perimeter */}
      <path
        d={pathD}
        fill="none"
        stroke={`oklch(0.97 0 0 / ${strokeOpacity.toFixed(2)})`}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeDasharray={perimeter}
        strokeDashoffset={perimeter * (1 - drawProgress)}
        filter={emphasis > 0.35 ? "url(#slide06-luminous-glow)" : undefined}
      />

      {/* Vertices & labels */}
      <g opacity={labelOpacity}>
        <circle cx={pTop.x} cy={pTop.y} r={3 + 0.9 * emphasis} fill="oklch(0.98 0 0)" />
        <circle cx={pCorner.x} cy={pCorner.y} r={3 + 0.9 * emphasis} fill="oklch(0.98 0 0)" />
        <circle cx={pLeft.x} cy={pLeft.y} r={3 + 0.9 * emphasis} fill="oklch(0.98 0 0)" />

        <text
          x={pTop.x + 11}
          y={pTop.y - 2}
          textAnchor="start"
          className="fill-text-primary font-math text-xs font-semibold"
        >
          {topLabel}
        </text>
        <text
          x={pCorner.x + 11}
          y={pCorner.y + 8}
          textAnchor="start"
          className="fill-text-primary font-math text-xs font-semibold"
        >
          {cornerLabel}
        </text>
        <text
          x={pLeft.x - 11}
          y={pLeft.y + 8}
          textAnchor="end"
          className="fill-text-primary font-math text-xs font-semibold"
        >
          {leftLabel}
        </text>

        {children}
      </g>
    </g>
  );
}

export function Slide06Formula(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  // Beat 1 (0.00s - 4.68s): Formula draws cleanly at stage center
  const stageFadeIn = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.8));
  const equalsOpacity = easeOutCubic(progressBetween(elapsedSeconds, 1.85, 2.35));
  const outerRadicalDraw = easeInOutCubic(progressBetween(elapsedSeconds, 2.08, 3.05));
  const term1Enter = easeOutCubic(progressBetween(elapsedSeconds, 2.35, 3.05));
  const term2Enter = easeOutCubic(progressBetween(elapsedSeconds, 2.85, 3.55));
  const term3Enter = easeOutCubic(progressBetween(elapsedSeconds, 3.3, 4.05));
  const tailEnter = easeOutCubic(progressBetween(elapsedSeconds, 3.85, 4.55));

  // Beat 2 (5.30s - 8.62s): Nested square roots glow on "nested square roots"
  const nestedRootGlow = pulseEnvelope(elapsedSeconds, 6.25, 6.9, 8.2, 8.95);

  // Beat 3 (9.02s - 16.85s): Formula glides upward; 3 Pythagorean bracket terms link to 3 right triangles
  const formulaLift = easeInOutCubic(progressBetween(elapsedSeconds, 9.05, 10.65));
  const formulaY = 305 - 116 * formulaLift;
  const formulaScale = 1.05 - 0.1 * formulaLift;

  const tri1Draw = easeInOutCubic(progressBetween(elapsedSeconds, 10.2, 12.1));
  const tri2Draw = easeInOutCubic(progressBetween(elapsedSeconds, 12.1, 13.9));
  const tri3Draw = easeInOutCubic(progressBetween(elapsedSeconds, 13.95, 15.85));

  const allTrianglesGlow = pulseEnvelope(elapsedSeconds, 15.05, 15.5, 16.5, 17.1);
  const term1Focus = Math.max(pulseEnvelope(elapsedSeconds, 9.8, 10.4, 11.7, 12.4), allTrianglesGlow);
  const term2Focus = Math.max(pulseEnvelope(elapsedSeconds, 11.8, 12.3, 13.6, 14.3), allTrianglesGlow);
  const term3Focus = Math.max(pulseEnvelope(elapsedSeconds, 13.7, 14.2, 15.5, 16.2), allTrianglesGlow);

  // Cross-dissolve at 16.95s -> 17.65s from formula + triangles into the frozen critical instant
  const algebraOut = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 16.95, 17.6));
  const frozenSceneOpacity = easeOutCubic(progressBetween(elapsedSeconds, 17.2, 17.85));

  // Beat 4 (17.20s - 24.00s): Car sweeps down arc (-36 deg -> 0 deg parallel) grazing G and freezing at Figure 2 instant
  const sweepProgress = easeOutCubic(progressBetween(elapsedSeconds, 17.35, 19.55));
  const headingDeg = -36 * (1 - sweepProgress);
  const isReversing = elapsedSeconds >= 17.35 && elapsedSeconds < 19.5;
  const isBraking = elapsedSeconds >= 19.2;
  const wheelRollDistance = -REAR_TO_CENTER_DX * degToRad(headingDeg + 36);

  const carCenter = rotateCarCenterAroundX(headingDeg);
  const freezePulse = pulseEnvelope(elapsedSeconds, 19.3, 19.65, 21.2, 22.4);
  const grazeGhostOpacity = easeOutCubic(progressBetween(elapsedSeconds, 18.2, 19.0)) * 0.38;
  const ahPreviewOpacity = easeOutCubic(progressBetween(elapsedSeconds, 19.7, 20.7));

  const tailOffset = (1 - tailEnter) * 8;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">06</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Previewing the Master Formula
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>
          Blackburn Equation (1) for extra parking distance AH, its three Pythagorean triangle terms, and the frozen
          critical parking instant
        </title>
        <defs>
          <radialGradient id="slide06-ambient-glow" cx="50%" cy="50%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide06-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={310} r={315} fill="url(#slide06-ambient-glow)" />

        {/* ================================================================
            BEATS 1–3: BLACKBURN EQUATION (1) & THREE RIGHT TRIANGLES
           ================================================================ */}
        {algebraOut > 0.01 ? (
          <g opacity={stageFadeIn * algebraOut}>
            {/* Centered Equation (1) Typographic Display */}
            <g transform={`translate(480, ${formulaY}) scale(${formulaScale})`}>
              <MasterFormula
                glowFilterId="slide06-luminous-glow"
                equalsOpacity={equalsOpacity}
                outerRadicalDraw={outerRadicalDraw}
                innerRadicalDraw={term3Enter}
                nestedRootGlow={nestedRootGlow}
                showFocusCapsules={true}
                term1Opacity={term1Enter}
                term1OffsetY={(1 - term1Enter) * 8}
                term1Focus={term1Focus}
                term2Opacity={term2Enter}
                term2OffsetY={(1 - term2Enter) * 8}
                term2Focus={term2Focus}
                term3Opacity={term3Enter}
                term3OffsetY={(1 - term3Enter) * 8}
                term3Focus={term3Focus}
                minusLOpacity={tailEnter}
                minusLOffsetY={tailOffset}
                minusKOpacity={tailEnter}
                minusKOffsetY={tailOffset}
              />
            </g>

            {/* Subtle Dashed Links Connecting Bracketed Terms to the Three Right-Angled Triangles */}
            {tri1Draw > 0.05 ? (
              <path
                d="M 338 218 C 338 270, 210 272, 210 326"
                fill="none"
                stroke={`oklch(0.88 0 0 / ${(0.25 + 0.5 * term1Focus).toFixed(2)})`}
                strokeWidth={1.25}
                strokeDasharray="4 4"
                opacity={tri1Draw}
              />
            ) : null}

            {tri2Draw > 0.05 ? (
              <path
                d="M 445 218 L 480 310"
                fill="none"
                stroke={`oklch(0.88 0 0 / ${(0.25 + 0.5 * term2Focus).toFixed(2)})`}
                strokeWidth={1.25}
                strokeDasharray="4 4"
                opacity={tri2Draw}
              />
            ) : null}

            {tri3Draw > 0.05 ? (
              <path
                d="M 592 220 C 592 270, 755 272, 755 322"
                fill="none"
                stroke={`oklch(0.88 0 0 / ${(0.25 + 0.5 * term3Focus).toFixed(2)})`}
                strokeWidth={1.25}
                strokeDasharray="4 4"
                opacity={tri3Draw}
              />
            ) : null}

            {/* Triangle 1: △EFX */}
            <RightTriangleDiagram
              pTop={{ x: 265, y: 356 }}
              pCorner={{ x: 265, y: 462 }}
              pLeft={{ x: 135, y: 462 }}
              topLabel="E"
              cornerLabel="F"
              leftLabel="X"
              drawProgress={tri1Draw}
              emphasis={term1Focus}
            >
              <g>
                <text
                  x={188}
                  y={398}
                  textAnchor="end"
                  className="fill-text-primary font-math text-base font-semibold italic"
                >
                  r
                </text>
                <text
                  x={279}
                  y={414}
                  textAnchor="start"
                  className="fill-text-primary font-math text-base font-semibold italic"
                >
                  l
                </text>
                <g className="text-text-primary">
                  <RootR2MinusL2 x={208} y={488} />
                </g>
              </g>
            </RightTriangleDiagram>

            {/* Triangle 2: △AFX */}
            <RightTriangleDiagram
              pTop={{ x: 545, y: 330 }}
              pCorner={{ x: 545, y: 462 }}
              pLeft={{ x: 415, y: 462 }}
              topLabel="A"
              cornerLabel="F"
              leftLabel="X"
              drawProgress={tri2Draw}
              emphasis={term2Focus}
            >
              <g>
                <line x1={540} y1={364} x2={550} y2={364} stroke="oklch(0.85 0 0 / 0.7)" strokeWidth={1.2} />
                <text x={468} y={385} textAnchor="end" className="fill-text-primary font-math text-sm font-semibold">
                  |AX|
                </text>
                <text
                  x={559}
                  y={402}
                  textAnchor="start"
                  className="fill-text-primary font-math text-base font-semibold"
                >
                  <tspan className="italic">l</tspan>
                  <tspan className="fill-text-secondary font-normal"> + </tspan>
                  <tspan className="italic">k</tspan>
                </text>
                <text
                  x={480}
                  y={488}
                  textAnchor="middle"
                  className="fill-text-secondary font-math text-sm font-semibold"
                >
                  |FX|
                </text>
              </g>
            </RightTriangleDiagram>

            {/* Triangle 3: △GKX */}
            <RightTriangleDiagram
              pTop={{ x: 820, y: 342 }}
              pCorner={{ x: 820, y: 462 }}
              pLeft={{ x: 690, y: 462 }}
              topLabel="G"
              cornerLabel="K"
              leftLabel="X"
              drawProgress={tri3Draw}
              emphasis={term3Focus}
            >
              <g>
                <text x={744} y={390} textAnchor="end" className="fill-text-primary font-math text-sm font-semibold">
                  |GX|
                </text>
                <text x={834} y={408} textAnchor="start" className="fill-text-primary font-math text-sm font-semibold">
                  |GK|
                </text>
                <g className="text-text-primary">
                  <RootR2MinusL2 x={744} y={488} withMinusW={true} />
                </g>
              </g>
            </RightTriangleDiagram>
          </g>
        ) : null}

        {/* ================================================================
            BEAT 4: FREEZING THE PARKING MANEUVER AT ITS CRITICAL INSTANT
           ================================================================ */}
        {frozenSceneOpacity > 0.01 ? (
          <g opacity={frozenSceneOpacity}>
            {/* Architectural Road Stage */}
            <RoadStage showTangentGuide={true} />

            {/* Parked Car in Front (Rear-left corner G sits directly on outer circle) */}
            <g transform={`translate(${PARALLEL_CENTER_X}, ${FRONT_PARKED_CENTER_Y})`}>
              <CutPlaneCar
                variant={CarSectionVariants.Parked}
                kerbSide={KerbSides.Right}
                showBoundingBox={false}
                showVertexLabels={false}
                showAxlePlaneLines={false}
              />
            </g>

            {/* Parked Car Behind */}
            <g transform={`translate(${PARALLEL_CENTER_X}, ${REAR_PARKED_CENTER_Y})`}>
              <CutPlaneCar
                variant={CarSectionVariants.Parked}
                kerbSide={KerbSides.Right}
                showBoundingBox={false}
                showVertexLabels={false}
                showAxlePlaneLines={false}
              />
            </g>

            {/* Ghost Snapshot at the Grazing Instant (Corner A passing G) */}
            {grazeGhostOpacity > 0.01 ? (
              <g
                transform={`translate(${GRAZE_CAR_CENTER.x}, ${GRAZE_CAR_CENTER.y}) rotate(${GRAZE_HEADING_DEG})`}
                opacity={grazeGhostOpacity}
              >
                <CutPlaneCar
                  variant={CarSectionVariants.Ghost}
                  kerbSide={KerbSides.Right}
                  showBoundingBox={false}
                  showVertexLabels={false}
                  showAxlePlaneLines={false}
                />
              </g>
            ) : null}

            {/* Hero Sports Coupe Reversing Past G and Freezing Parallel to Kerb */}
            <g transform={`translate(${carCenter.x}, ${carCenter.y}) rotate(${headingDeg})`}>
              <CutPlaneCar
                variant={CarSectionVariants.Hero}
                kerbSide={KerbSides.Right}
                showBoundingBox={false}
                showVertexLabels={false}
                showAxlePlaneLines={true}
                frontLeftSteerDeg={ACKERMANN.frontLeftSteerDeg}
                frontRightSteerDeg={ACKERMANN.frontRightSteerDeg}
                wheelRollDistance={wheelRollDistance}
                isReversing={isReversing}
                isBraking={isBraking}
              />
            </g>

            {/* Concentric Turning Circles Centered at X (Rendered Above Car) */}
            <g fill="none">
              <path d={WHEEL_F_CIRCLE_ARC} stroke="oklch(0.75 0 0 / 0.34)" strokeWidth={1.25} strokeDasharray="4 6" />
              <path d={WHEEL_E_CIRCLE_ARC} stroke="oklch(0.78 0 0 / 0.38)" strokeWidth={1.25} strokeDasharray="4 6" />
              <path
                d={OUTER_CIRCLE_ARC}
                stroke="oklch(0.96 0 0 / 0.8)"
                strokeWidth={1.7}
                filter="url(#slide06-luminous-glow)"
              />
            </g>

            {/* Target Extra Clearance |AH| Bracket & Equal-Radius Rays XG / XA */}
            {ahPreviewOpacity > 0.01 ? (
              <g opacity={ahPreviewOpacity}>
                <line
                  x1={TURNING_CENTER.x}
                  y1={TURNING_CENTER.y}
                  x2={POINT_A_PARALLEL.x}
                  y2={POINT_A_PARALLEL.y}
                  stroke="oklch(0.92 0 0 / 0.62)"
                  strokeWidth={1.3}
                  strokeDasharray="4 4"
                />
                <g stroke="oklch(0.84 0 0 / 0.6)" strokeWidth={1.1} strokeDasharray="3 3">
                  <line x1={POINT_H.x} y1={POINT_H.y} x2={708} y2={POINT_H.y} />
                  <line x1={POINT_A_PARALLEL.x} y1={POINT_A_PARALLEL.y} x2={708} y2={POINT_A_PARALLEL.y} />
                </g>
                <g stroke="oklch(0.98 0 0)" strokeWidth={2} filter="url(#slide06-luminous-glow)">
                  <line x1={700} y1={POINT_H.y} x2={700} y2={POINT_A_PARALLEL.y} />
                  <line x1={695} y1={POINT_H.y} x2={705} y2={POINT_H.y} strokeWidth={1.5} />
                  <line x1={695} y1={POINT_A_PARALLEL.y} x2={705} y2={POINT_A_PARALLEL.y} strokeWidth={1.5} />
                </g>
                <text
                  x={716}
                  y={(POINT_H.y + POINT_A_PARALLEL.y) * 0.5 + 4}
                  textAnchor="start"
                  className="fill-text-primary font-math text-sm font-semibold"
                >
                  |AH|
                </text>
              </g>
            ) : null}

            {/* Radius Ray from Turning Center X to Grazing Pinch Point G */}
            <line
              x1={TURNING_CENTER.x}
              y1={TURNING_CENTER.y}
              x2={POINT_G.x}
              y2={POINT_G.y}
              stroke={`oklch(0.92 0 0 / ${(0.42 + 0.45 * freezePulse).toFixed(2)})`}
              strokeWidth={1.3}
              strokeDasharray="4 4"
            />

            {/* Turning Center X Hexagonal Node */}
            <g transform={`translate(${TURNING_CENTER.x}, ${TURNING_CENTER.y})`}>
              <polygon
                points="0,-18 15.6,-9 15.6,9 0,18 -15.6,9 -15.6,-9"
                fill="oklch(0.24 0 0 / 0.94)"
                stroke="oklch(0.94 0 0 / 0.9)"
                strokeWidth={1.4}
              />
              <circle cx={0} cy={0} r={5} fill="oklch(0.98 0 0)" filter="url(#slide06-luminous-glow)" />
              <text
                x={0}
                y={34}
                textAnchor="middle"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-primary font-mono text-sm font-semibold tracking-mono"
              >
                X
              </text>
            </g>

            {/* Grazing Pinch Point G & Kerb Corner H */}
            <g transform={`translate(${POINT_G.x}, ${POINT_G.y})`}>
              {freezePulse > 0.03 ? (
                <circle
                  cx={0}
                  cy={0}
                  r={10 + 14 * freezePulse}
                  fill="none"
                  stroke="oklch(0.98 0 0)"
                  strokeWidth={1.4}
                  opacity={freezePulse * 0.8}
                />
              ) : null}
              <circle
                cx={0}
                cy={0}
                r={4.2 + 1.2 * freezePulse}
                fill="oklch(0.98 0 0)"
                filter="url(#slide06-luminous-glow)"
              />
              <text
                x={-14}
                y={-12}
                textAnchor="end"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
              >
                G
              </text>
            </g>

            {ahPreviewOpacity > 0.01 ? (
              <g opacity={ahPreviewOpacity}>
                <circle cx={POINT_H.x} cy={POINT_H.y} r={3.5} fill="oklch(0.98 0 0)" />
                <text
                  x={POINT_H.x - 10}
                  y={POINT_H.y - 8}
                  textAnchor="end"
                  stroke="oklch(0.15 0 0 / 0.94)"
                  strokeWidth={4}
                  strokeLinejoin="round"
                  className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
                >
                  H
                </text>

                <circle
                  cx={POINT_A_PARALLEL.x}
                  cy={POINT_A_PARALLEL.y}
                  r={4}
                  fill="oklch(0.98 0 0)"
                  filter="url(#slide06-luminous-glow)"
                />
                <text
                  x={POINT_A_PARALLEL.x - 10}
                  y={POINT_A_PARALLEL.y - 8}
                  textAnchor="end"
                  stroke="oklch(0.15 0 0 / 0.94)"
                  strokeWidth={4}
                  strokeLinejoin="round"
                  className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
                >
                  A
                </text>
              </g>
            ) : null}
          </g>
        ) : null}
      </svg>
    </div>
  );
}
