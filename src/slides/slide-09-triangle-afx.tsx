import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
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

const HALF_W = DEFAULT_VEHICLE_DIMENSIONS.width * 0.5 * CAR_SCALE; // 50.16
const HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5 * CAR_SCALE; // 110.88
const TRACK_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth * CAR_SCALE; // 40.92
const WHEEL_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5 * CAR_SCALE; // 68.64

// Proof line A-E-F aligned vertically at WHEEL_KERB_X = 614.92 so angle AFX is exact 90 deg
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
const LENGTH_AE = POINT_E.y - POINT_A.y; // 42.24
const LENGTH_AF = LENGTH_EF + LENGTH_AE; // 179.52
const RADIUS_AX = Math.hypot(LENGTH_FX, LENGTH_AF); // 307.712

// Front parked car (width = 91.2px aligned to kerb proof line x = 614.92, road corner G sits on exact outer circle)
const FRONT_CAR_SCALE = 1.2;
const FRONT_CAR_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.width * 0.5 * FRONT_CAR_SCALE; // 45.6
const FRONT_CAR_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5 * FRONT_CAR_SCALE; // 100.8
const FRONT_CAR_CENTER_X = PROOF_LINE_X - FRONT_CAR_HALF_W; // 569.32
const POINT_G_X = PROOF_LINE_X - FRONT_CAR_HALF_W * 2; // 523.72
const POINT_G_Y = POINT_X.y - Math.sqrt(RADIUS_AX * RADIUS_AX - (POINT_G_X - POINT_X.x) ** 2); // 145.023
const POINT_G: Point2D = { x: POINT_G_X, y: POINT_G_Y };
const FRONT_CAR_CENTER_Y = POINT_G.y - FRONT_CAR_HALF_L; // 44.223

const VIRTUAL_STEER_DEG = -((Math.atan2(LENGTH_EF, CAR_CENTER_X - POINT_X.x) * 180) / Math.PI);
const ACKERMANN = computeAckermannAngles(VIRTUAL_STEER_DEG, DEFAULT_VEHICLE_DIMENSIONS);

const TRIANGLE_AFX_PATH = `M ${POINT_X.x} ${POINT_X.y} L ${POINT_F.x} ${POINT_F.y} L ${POINT_A.x} ${POINT_A.y} Z`;
const TRIANGLE_AFX_PERIMETER = LENGTH_FX + LENGTH_AF + RADIUS_AX;

const CALIPER_X = 668;
const TOTAL_CALIPER_X = 716;

const ANGLE_A_DEG = (Math.atan2(POINT_A.y - POINT_X.y, POINT_A.x - POINT_X.x) * 180) / Math.PI; // -35.69 deg
const ANGLE_G_DEG = (Math.atan2(POINT_G.y - POINT_X.y, POINT_G.x - POINT_X.x) * 180) / Math.PI; // -58.95 deg

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

function buildArcSweep(
  center: Point2D,
  radius: number,
  startDeg: number,
  endDeg: number,
): {
  readonly path: string;
  readonly length: number;
} {
  const sRad = degToRad(startDeg);
  const eRad = degToRad(endDeg);
  const sx = center.x + radius * Math.cos(sRad);
  const sy = center.y + radius * Math.sin(sRad);
  const ex = center.x + radius * Math.cos(eRad);
  const ey = center.y + radius * Math.sin(eRad);
  const delta = endDeg - startDeg;
  const sweepFlag = delta >= 0 ? 1 : 0;
  const largeArcFlag = Math.abs(delta) > 180 ? 1 : 0;
  return {
    path: `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArcFlag} ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}`,
    length: radius * Math.abs(eRad - sRad),
  };
}

function buildCongruenceTicks(p1: Point2D, p2: Point2D): string {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) {
    return "";
  }
  const tx = dx / len;
  const ty = dy / len;
  const nx = -ty;
  const ny = tx;
  const mx = (p1.x + p2.x) * 0.5;
  const my = (p1.y + p2.y) * 0.5;

  const t1x = mx - tx * 3;
  const t1y = my - ty * 3;
  const t2x = mx + tx * 3;
  const t2y = my + ty * 3;

  return [
    `M ${(t1x - nx * 6).toFixed(1)} ${(t1y - ny * 6).toFixed(1)} L ${(t1x + nx * 6).toFixed(1)} ${(t1y + ny * 6).toFixed(1)}`,
    `M ${(t2x - nx * 6).toFixed(1)} ${(t2y - ny * 6).toFixed(1)} L ${(t2x + nx * 6).toFixed(1)} ${(t2y + ny * 6).toFixed(1)}`,
  ].join(" ");
}

const OUTER_CIRCLE_ARC = buildArcSweep(POINT_X, RADIUS_AX, ANGLE_A_DEG + 18, ANGLE_G_DEG - 16);
const COMPASS_ARC_AG = buildArcSweep(POINT_X, RADIUS_AX, ANGLE_A_DEG, ANGLE_G_DEG);
const TICKS_AX = buildCongruenceTicks(POINT_X, POINT_A);
const TICKS_GX = buildCongruenceTicks(POINT_X, POINT_G);

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
        filter={pulse > 0.1 ? "url(#slide09-luminous-glow)" : undefined}
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

export function Slide09TriangleAfx(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  // Beat 1 (0.00s - 5.02s): Seamless carry-over from Slide 08 + taller triangle AFX draws
  const stageFadeIn = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.9));
  const efxCarryOpacity = 1 - 0.55 * easeInOutCubic(progressBetween(elapsedSeconds, 1.8, 3.6));
  const aVertexOpacity = easeOutCubic(progressBetween(elapsedSeconds, 1.8, 2.7));
  const afxDraw = easeInOutCubic(progressBetween(elapsedSeconds, 2.0, 4.35));

  // Beat 2 (5.56s - 14.24s): Vertical side AF = l + k & base FX = sqrt(r^2 - l^2)
  const afFocus = pulseEnvelope(elapsedSeconds, 5.5, 6.2, 10.9, 11.6);
  const lCaliperOpacity = easeOutCubic(progressBetween(elapsedSeconds, 6.2, 8.2));
  const kCaliperDraw = easeInOutCubic(progressBetween(elapsedSeconds, 9.15, 10.75));
  const lkBracketOpacity = easeOutCubic(progressBetween(elapsedSeconds, 10.4, 11.4));

  const fxFocus = pulseEnvelope(elapsedSeconds, 11.5, 12.1, 14.1, 14.9);
  const baseFxExprOpacity = easeOutCubic(progressBetween(elapsedSeconds, 12.2, 13.4));

  // Beat 3 (14.76s - 21.02s): Pythagoras a second time -> hypotenuse AX & outer circle arc
  const pythagorasGlow = pulseEnvelope(elapsedSeconds, 14.75, 15.3, 16.8, 17.5);
  const axFocus = Math.max(pulseEnvelope(elapsedSeconds, 17.0, 17.6, 19.6, 20.5), pythagorasGlow * 0.65);
  const axLabelOpacity = easeOutCubic(progressBetween(elapsedSeconds, 17.8, 18.8));
  const outerCircleDraw = easeInOutCubic(progressBetween(elapsedSeconds, 19.1, 21.3));

  const eqBoxOpacity = easeOutCubic(progressBetween(elapsedSeconds, 16.4, 17.6));
  const eqRadicalDraw = easeInOutCubic(progressBetween(elapsedSeconds, 16.8, 18.4));

  // Beat 4 (21.58s - 32.00s): Step 3 — Point G on same circle -> |GX| = |AX|
  const frontCarOpacity = easeOutCubic(progressBetween(elapsedSeconds, 22.8, 24.4)) * 0.72;
  const gOpacity = easeOutCubic(progressBetween(elapsedSeconds, 23.6, 24.8));
  const circleHighlight = pulseEnvelope(elapsedSeconds, 25.3, 25.9, 27.6, 29.0);

  const compassSweep = easeInOutCubic(progressBetween(elapsedSeconds, 27.1, 28.9));
  const gxRayDraw = easeInOutCubic(progressBetween(elapsedSeconds, 27.3, 29.1));
  const congruenceOpacity = easeOutCubic(progressBetween(elapsedSeconds, 28.9, 29.9));
  const gxEqReveal = easeInOutCubic(progressBetween(elapsedSeconds, 28.6, 30.0));

  // Vertex pulses synchronized to spoken letters
  const pulseA = Math.max(
    pulseFactor(elapsedSeconds, 4.35, 0.55),
    pulseFactor(elapsedSeconds, 6.98, 0.45),
    pulseFactor(elapsedSeconds, 18.6, 0.55),
    pulseFactor(elapsedSeconds, 30.15, 0.55),
  );
  const pulseE = pulseFactor(elapsedSeconds, 8.85, 0.55);
  const pulseF = Math.max(
    pulseFactor(elapsedSeconds, 4.6, 0.55),
    pulseFactor(elapsedSeconds, 7.05, 0.45),
    pulseFactor(elapsedSeconds, 12.9, 0.55),
  );
  const pulseX = Math.max(
    pulseFactor(elapsedSeconds, 4.85, 0.55),
    pulseFactor(elapsedSeconds, 13.15, 0.55),
    pulseFactor(elapsedSeconds, 18.8, 0.55),
    pulseFactor(elapsedSeconds, 28.5, 0.55),
  );
  const pulseG = Math.max(pulseFactor(elapsedSeconds, 25.18, 0.6), pulseFactor(elapsedSeconds, 28.35, 0.55));

  const pillWidth = 336 + 78 * gxEqReveal;
  const pillX = -(pillWidth * 0.5);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">09</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Proof Steps 2 &amp; 3: Front Corner Radius AX &amp; GX
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>Right-angled triangle AFX solving |AX| and matching outer-circle radius |GX| = |AX|</title>
        <defs>
          <radialGradient id="slide09-ambient-glow" cx="50%" cy="50%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide09-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="slide09-top-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="14%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="white" stopOpacity={1} />
          </linearGradient>

          <mask id="slide09-top-fade-mask">
            <rect x={0} y={0} width={960} height={620} fill="url(#slide09-top-fade-grad)" />
          </mask>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={310} r={315} fill="url(#slide09-ambient-glow)" />

        {/* Subtle Vertical Proof Axis Along A-E-F-H */}
        <line
          x1={PROOF_LINE_X}
          y1={80}
          x2={PROOF_LINE_X}
          y2={500}
          stroke="oklch(0.75 0 0 / 0.24)"
          strokeWidth={1.1}
          strokeDasharray="4 6"
          opacity={stageFadeIn}
        />

        {/* Subtle Front Bumper Reference Line Through A */}
        <line
          x1={CAR_CENTER_X - HALF_W}
          y1={FRONT_BUMPER_Y}
          x2={PROOF_LINE_X}
          y2={FRONT_BUMPER_Y}
          stroke="oklch(0.8 0 0 / 0.35)"
          strokeWidth={1.1}
          strokeDasharray="3 4"
          opacity={aVertexOpacity}
        />

        {/* Front Parked Car Rear Silhouette (Faded Softly at Top) */}
        {frontCarOpacity > 0.01 ? (
          <g mask="url(#slide09-top-fade-mask)" opacity={frontCarOpacity}>
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
        ) : null}

        {/* Cut-Plane Sports Coupe Context */}
        <g transform={`translate(${CAR_CENTER_X}, ${CAR_CENTER_Y}) scale(${CAR_SCALE})`} opacity={stageFadeIn * 0.48}>
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

        {/* ================================================================
            OUTER TURNING CIRCLE ARC & COMPASS SWEEP A -> G
           ================================================================ */}
        {outerCircleDraw > 0.01 ? (
          <path
            d={OUTER_CIRCLE_ARC.path}
            fill="none"
            stroke={`oklch(0.92 0 0 / ${(0.55 + 0.35 * circleHighlight).toFixed(2)})`}
            strokeWidth={1.5 + 0.7 * circleHighlight}
            strokeDasharray={outerCircleDraw < 0.995 ? OUTER_CIRCLE_ARC.length : "6 5"}
            strokeDashoffset={outerCircleDraw < 0.995 ? OUTER_CIRCLE_ARC.length * (1 - outerCircleDraw) : 0}
            filter={circleHighlight > 0.25 ? "url(#slide09-luminous-glow)" : undefined}
          />
        ) : null}

        {compassSweep > 0.01 ? (
          <path
            d={COMPASS_ARC_AG.path}
            fill="none"
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.5}
            strokeDasharray={COMPASS_ARC_AG.length}
            strokeDashoffset={COMPASS_ARC_AG.length * (1 - compassSweep)}
            filter="url(#slide09-luminous-glow)"
          />
        ) : null}

        {/* ================================================================
            CARRY-OVER TRIANGLE EFX (SUBTLE REFERENCE)
           ================================================================ */}
        <g opacity={stageFadeIn * efxCarryOpacity}>
          <line
            x1={POINT_X.x}
            y1={POINT_X.y}
            x2={POINT_E.x}
            y2={POINT_E.y}
            stroke="oklch(0.75 0 0 / 0.45)"
            strokeWidth={1.25}
            strokeDasharray="4 4"
          />
        </g>

        {/* ================================================================
            RIGHT-ANGLED TRIANGLE AFX
           ================================================================ */}
        {afxDraw > 0.01 ? (
          <g>
            {/* Subtle Interior Fill */}
            <path
              d={TRIANGLE_AFX_PATH}
              fill={`oklch(0.96 0 0 / ${(0.045 + 0.03 * pythagorasGlow).toFixed(3)})`}
              opacity={easeOutCubic(progressBetween(afxDraw, 0.35, 1))}
            />

            {/* Triangle AFX Perimeter */}
            <path
              d={TRIANGLE_AFX_PATH}
              fill="none"
              stroke="oklch(0.94 0 0 / 0.86)"
              strokeWidth={1.7}
              strokeLinejoin="round"
              strokeDasharray={TRIANGLE_AFX_PERIMETER}
              strokeDashoffset={TRIANGLE_AFX_PERIMETER * (1 - afxDraw)}
            />

            {/* Right-Angle Corner Marker at F */}
            <path
              d={`M ${POINT_F.x - 15} ${POINT_F.y} L ${POINT_F.x - 15} ${POINT_F.y - 15} L ${POINT_F.x} ${POINT_F.y - 15}`}
              fill="none"
              stroke="oklch(0.96 0 0 / 0.85)"
              strokeWidth={1.4}
              opacity={stageFadeIn}
            />

            {/* Active Segment Spotlights */}
            {afFocus > 0.02 || pythagorasGlow > 0.02 ? (
              <line
                x1={POINT_A.x}
                y1={POINT_A.y}
                x2={POINT_F.x}
                y2={POINT_F.y}
                stroke="oklch(0.99 0 0)"
                strokeWidth={2.7}
                opacity={Math.max(afFocus, pythagorasGlow)}
                filter="url(#slide09-luminous-glow)"
              />
            ) : null}

            {fxFocus > 0.02 || pythagorasGlow > 0.02 ? (
              <line
                x1={POINT_X.x}
                y1={POINT_X.y}
                x2={POINT_F.x}
                y2={POINT_F.y}
                stroke="oklch(0.99 0 0)"
                strokeWidth={2.7}
                opacity={Math.max(fxFocus, pythagorasGlow)}
                filter="url(#slide09-luminous-glow)"
              />
            ) : null}

            {axFocus > 0.02 ? (
              <line
                x1={POINT_X.x}
                y1={POINT_X.y}
                x2={POINT_A.x}
                y2={POINT_A.y}
                stroke="oklch(0.99 0 0)"
                strokeWidth={2.7}
                opacity={axFocus}
                filter="url(#slide09-luminous-glow)"
              />
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            STEP 3: RADIUS GX IDENTICAL TO AX
           ================================================================ */}
        {gxRayDraw > 0.01 ? (
          <g>
            <line
              x1={POINT_X.x}
              y1={POINT_X.y}
              x2={POINT_G.x}
              y2={POINT_G.y}
              stroke="oklch(0.99 0 0)"
              strokeWidth={2.2}
              strokeDasharray={RADIUS_AX}
              strokeDashoffset={RADIUS_AX * (1 - gxRayDraw)}
              filter="url(#slide09-luminous-glow)"
            />

            {congruenceOpacity > 0.01 ? (
              <g opacity={congruenceOpacity}>
                <path d={TICKS_AX} fill="none" stroke="oklch(0.98 0 0)" strokeWidth={1.7} strokeLinecap="round" />
                <path d={TICKS_GX} fill="none" stroke="oklch(0.98 0 0)" strokeWidth={1.7} strokeLinecap="round" />
                <text
                  x={427}
                  y={267}
                  textAnchor="end"
                  stroke="oklch(0.15 0 0 / 0.94)"
                  strokeWidth={4.5}
                  strokeLinejoin="round"
                  className="svg-label-halo fill-text-primary font-mono text-sm font-semibold tracking-mono"
                >
                  |GX|
                </text>
              </g>
            ) : null}
          </g>
        ) : null}

        {/* ================================================================
            VERTICAL CALIPERS: l + k ALONG AF & HYPOTENUSE |AX|
           ================================================================ */}
        {/* Split Caliper l (EF) + k (AE) */}
        {lCaliperOpacity > 0.01 ? (
          <g>
            <g stroke="oklch(0.84 0 0 / 0.58)" strokeWidth={1.1} strokeDasharray="3 3" opacity={lCaliperOpacity}>
              <line x1={POINT_E.x} y1={POINT_E.y} x2={CALIPER_X + 6} y2={POINT_E.y} />
              <line x1={POINT_F.x} y1={POINT_F.y} x2={CALIPER_X + 6} y2={POINT_F.y} />
            </g>
            <line
              x1={CALIPER_X}
              y1={POINT_E.y}
              x2={CALIPER_X}
              y2={POINT_F.y}
              stroke="oklch(0.95 0 0)"
              strokeWidth={1.8}
              opacity={lCaliperOpacity}
            />
            <g stroke="oklch(0.95 0 0 / 0.9)" strokeWidth={1.4} opacity={lCaliperOpacity}>
              <line x1={CALIPER_X - 4} y1={POINT_E.y} x2={CALIPER_X + 4} y2={POINT_E.y} />
              <line x1={CALIPER_X - 4} y1={POINT_F.y} x2={CALIPER_X + 4} y2={POINT_F.y} />
            </g>
            <text
              x={CALIPER_X + 14}
              y={(POINT_E.y + POINT_F.y) * 0.5 + 5}
              textAnchor="start"
              opacity={lCaliperOpacity}
              className="fill-text-primary font-mono text-base font-semibold"
            >
              l
            </text>
          </g>
        ) : null}

        {kCaliperDraw > 0.01 ? (
          <g>
            <line
              x1={POINT_A.x}
              y1={POINT_A.y}
              x2={CALIPER_X + 6}
              y2={POINT_A.y}
              stroke="oklch(0.84 0 0 / 0.58)"
              strokeWidth={1.1}
              strokeDasharray="3 3"
              opacity={kCaliperDraw}
            />
            <line
              x1={CALIPER_X}
              y1={POINT_E.y}
              x2={CALIPER_X}
              y2={POINT_A.y}
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.9}
              strokeDasharray={LENGTH_AE}
              strokeDashoffset={LENGTH_AE * (1 - kCaliperDraw)}
              filter="url(#slide09-luminous-glow)"
            />
            <line
              x1={CALIPER_X - 4}
              y1={POINT_A.y}
              x2={CALIPER_X + 4}
              y2={POINT_A.y}
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.4}
              opacity={kCaliperDraw}
            />
            <text
              x={CALIPER_X + 14}
              y={(POINT_A.y + POINT_E.y) * 0.5 + 5}
              textAnchor="start"
              opacity={easeOutCubic(progressBetween(kCaliperDraw, 0.4, 1))}
              className="fill-text-primary font-mono text-base font-semibold"
            >
              k
            </text>
          </g>
        ) : null}

        {/* Combined Total Bracket l + k */}
        {lkBracketOpacity > 0.01 ? (
          <g opacity={lkBracketOpacity}>
            <path
              d={`M ${TOTAL_CALIPER_X - 5} ${POINT_A.y} L ${TOTAL_CALIPER_X} ${POINT_A.y} L ${TOTAL_CALIPER_X} ${POINT_F.y} L ${TOTAL_CALIPER_X - 5} ${POINT_F.y}`}
              fill="none"
              stroke="oklch(0.88 0 0 / 0.78)"
              strokeWidth={1.35}
            />
            <text
              x={TOTAL_CALIPER_X + 12}
              y={(POINT_A.y + POINT_F.y) * 0.5 + 5}
              textAnchor="start"
              className="fill-text-primary font-mono text-sm font-semibold"
            >
              l + k
            </text>
          </g>
        ) : null}

        {/* Hypotenuse |AX| Label */}
        {axLabelOpacity > 0.01 ? (
          <text
            x={478}
            y={303}
            textAnchor="end"
            opacity={axLabelOpacity}
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4.5}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold tracking-mono"
          >
            |AX|
          </text>
        ) : null}

        {/* Base |FX| = sqrt(r^2 - l^2) Label Below Base */}
        <g transform={`translate(${(POINT_X.x + POINT_F.x) * 0.5}, ${POINT_X.y + 30})`} opacity={stageFadeIn}>
          {baseFxExprOpacity < 0.99 ? (
            <text
              x={0}
              y={0}
              textAnchor="middle"
              opacity={1 - baseFxExprOpacity}
              className="fill-text-secondary font-mono text-sm font-semibold tracking-mono"
            >
              |FX|
            </text>
          ) : null}
          {baseFxExprOpacity > 0.01 ? (
            <g opacity={baseFxExprOpacity}>
              <path
                d="M -32 0 L -29 0 L -26 6 L -19 -13 L 34 -13"
                fill="none"
                stroke="oklch(0.95 0 0)"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x={-10} y={2} textAnchor="middle" className="fill-text-primary font-mono text-sm font-semibold">
                r
              </text>
              <text x={-2} y={-6} textAnchor="middle" className="fill-text-primary font-mono text-xs">
                2
              </text>
              <text x={8} y={2} textAnchor="middle" className="fill-text-secondary font-mono text-sm">
                −
              </text>
              <text x={20} y={2} textAnchor="middle" className="fill-text-primary font-mono text-sm font-semibold">
                l
              </text>
              <text x={28} y={-6} textAnchor="middle" className="fill-text-primary font-mono text-xs">
                2
              </text>
            </g>
          ) : null}
        </g>

        {/* ================================================================
            BOTTOM EQUATION CARD: |GX| = |AX| = sqrt((r^2 - l^2) + (l + k)^2)
           ================================================================ */}
        {eqBoxOpacity > 0.01 ? (
          <g transform="translate(490, 512)" opacity={eqBoxOpacity}>
            <rect
              x={pillX}
              y={-28}
              width={pillWidth}
              height={52}
              rx={8}
              fill="oklch(0.21 0 0 / 0.92)"
              stroke="oklch(0.95 0 0 / 0.85)"
              strokeWidth={1.4}
            />

            {/* Step 3 Left-Hand Equivalence: |GX| = */}
            {gxEqReveal > 0.01 ? (
              <g opacity={gxEqReveal}>
                <text x={-153} y={6} textAnchor="middle" className="fill-text-primary font-mono text-lg font-semibold">
                  |GX|
                </text>
                <text x={-117} y={6} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                  =
                </text>
              </g>
            ) : null}

            {/* Step 2 Core Formula Shifting Smoothly Right for |GX| = */}
            <g transform={`translate(${38 * gxEqReveal}, 0)`}>
              <text x={-119} y={6} textAnchor="middle" className="fill-text-primary font-mono text-lg font-semibold">
                |AX|
              </text>
              <text x={-86} y={6} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                =
              </text>

              <path
                d="M -70 0 L -66 0 L -61 10 L -51 -19 L 141 -19"
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={232}
                strokeDashoffset={232 * (1 - eqRadicalDraw)}
                filter="url(#slide09-luminous-glow)"
              />

              <g opacity={easeOutCubic(progressBetween(eqRadicalDraw, 0.25, 0.95))}>
                <text x={-43} y={6} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                  (
                </text>
                <text x={-31} y={6} textAnchor="middle" className="fill-text-primary font-mono text-lg font-semibold">
                  r
                </text>
                <text x={-22} y={-5} textAnchor="middle" className="fill-text-primary font-mono text-xs font-semibold">
                  2
                </text>
                <text x={-8} y={6} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                  −
                </text>
                <text x={6} y={6} textAnchor="middle" className="fill-text-primary font-mono text-lg font-semibold">
                  l
                </text>
                <text x={15} y={-5} textAnchor="middle" className="fill-text-primary font-mono text-xs font-semibold">
                  2
                </text>
                <text x={25} y={6} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                  )
                </text>

                <text x={41} y={6} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                  +
                </text>

                <text x={58} y={6} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                  (
                </text>
                <text x={71} y={6} textAnchor="middle" className="fill-text-primary font-mono text-lg font-semibold">
                  l
                </text>
                <text x={87} y={6} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                  +
                </text>
                <text x={103} y={6} textAnchor="middle" className="fill-text-primary font-mono text-lg font-semibold">
                  k
                </text>
                <text x={116} y={6} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                  )
                </text>
                <text x={126} y={-5} textAnchor="middle" className="fill-text-primary font-mono text-xs font-semibold">
                  2
                </text>
              </g>
            </g>
          </g>
        ) : null}

        {/* ================================================================
            TURNING CENTER X & VERTEX NODES A, E, F, G
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
          <circle cx={0} cy={0} r={4.5 + 1.4 * pulseX} fill="oklch(0.98 0 0)" filter="url(#slide09-luminous-glow)" />
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
          point={POINT_E}
          label="E"
          labelX={636}
          labelY={POINT_E.y + 4}
          textAnchor="start"
          opacity={stageFadeIn}
          pulse={pulseE}
        />
        <VertexNode
          point={POINT_F}
          label="F"
          labelX={636}
          labelY={POINT_F.y + 6}
          textAnchor="start"
          opacity={stageFadeIn}
          pulse={pulseF}
        />
        <VertexNode
          point={POINT_A}
          label="A"
          labelX={636}
          labelY={POINT_A.y - 4}
          textAnchor="start"
          opacity={aVertexOpacity}
          pulse={pulseA}
        />
        <VertexNode
          point={POINT_G}
          label="G"
          labelX={POINT_G.x - 14}
          labelY={POINT_G.y - 8}
          textAnchor="end"
          opacity={gOpacity}
          pulse={pulseG}
        />
      </svg>
    </div>
  );
}
