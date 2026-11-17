import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { CarSectionVariants, DEFAULT_VEHICLE_DIMENSIONS, KerbSides, type Point2D } from "@/simulation/car-simulator";
import { usePresentationStore } from "@/store/presentation-store";
import type { ReactElement } from "react";

const HALF_W = DEFAULT_VEHICLE_DIMENSIONS.width * 0.5; // 38
const HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5; // 84
const TRACK_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth; // 31
const WHEEL_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5; // 52
const WHEELBASE_PX = DEFAULT_VEHICLE_DIMENSIONS.wheelbase; // 104

// Canonical right-hand-traffic bay geometry keeping y <= 465 above bottom formula card
const PARALLEL_CENTER_X = 640;
const PARALLEL_CENTER_Y = 285;
const REAR_AXLE_Y = PARALLEL_CENTER_Y + WHEEL_HALF_L; // 337
const TURNING_CENTER: Point2D = { x: 430, y: REAR_AXLE_Y }; // (430, 337)

const KERB_LINE_X = PARALLEL_CENTER_X + HALF_W; // 678
const KERB_STONE_X = 682;
const PARKING_LINE_X = 594;

// Concentric turning radii anchored to kerb-side points F, E, and A
const RADIUS_FX = PARALLEL_CENTER_X + TRACK_HALF_W - TURNING_CENTER.x; // 241
const RADIUS_EX = Math.hypot(RADIUS_FX, -WHEELBASE_PX); // 262.482
const RADIUS_AX = Math.hypot(KERB_LINE_X - TURNING_CENTER.x, PARALLEL_CENTER_Y - HALF_L - TURNING_CENTER.y); // 282.843

// Front parked car rear-left corner G positioned on the exact outer circle of radius RADIUS_AX
const POINT_G_X = PARALLEL_CENTER_X - HALF_W; // 602
const POINT_G_Y = TURNING_CENTER.y - Math.sqrt(RADIUS_AX * RADIUS_AX - (POINT_G_X - TURNING_CENTER.x) ** 2); // 112.467
const POINT_G: Point2D = { x: POINT_G_X, y: POINT_G_Y };
const POINT_H: Point2D = { x: KERB_LINE_X, y: POINT_G_Y };
const FRONT_PARKED_CENTER_Y = POINT_G_Y - HALF_L; // 28.467

const POINT_A_PARALLEL: Point2D = { x: KERB_LINE_X, y: PARALLEL_CENTER_Y - HALF_L }; // (678, 201)
const ANGLE_A_PARALLEL_DEG =
  (Math.atan2(POINT_A_PARALLEL.y - TURNING_CENTER.y, POINT_A_PARALLEL.x - TURNING_CENTER.x) * 180) / Math.PI; // -28.74 deg
const ANGLE_G_DEG = (Math.atan2(POINT_G.y - TURNING_CENTER.y, POINT_G.x - TURNING_CENTER.x) * 180) / Math.PI; // -52.55 deg
const GRAZE_HEADING_DEG = ANGLE_G_DEG - ANGLE_A_PARALLEL_DEG; // -23.81 deg

const TIRE_RADIUS = 14;
const TREAD_RIB_COUNT = 10;
const TREAD_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const KERB_JOINT_Y = [56, 132, 208, 284, 360, 436] as const;
const PAVING_JOINT_Y = [76, 160, 244, 328, 412] as const;

const NARROW_ROAD_WALL_X = 440;

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

function rotateLocalPointAroundX(localX: number, localY: number, headingDeg: number): Point2D {
  const theta = degToRad(headingDeg);
  const baseWorldX = PARALLEL_CENTER_X + localX;
  const baseWorldY = PARALLEL_CENTER_Y + localY;
  const vx = baseWorldX - TURNING_CENTER.x;
  const vy = baseWorldY - TURNING_CENTER.y;
  return {
    x: TURNING_CENTER.x + vx * Math.cos(theta) - vy * Math.sin(theta),
    y: TURNING_CENTER.y + vx * Math.sin(theta) + vy * Math.cos(theta),
  };
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

const OUTER_CIRCLE_ARC = buildArcSweep(TURNING_CENTER, RADIUS_AX, -78, -14);
const WHEEL_E_ARC = buildArcSweep(TURNING_CENTER, RADIUS_EX, -74, -8);
const WHEEL_F_ARC = buildArcSweep(TURNING_CENTER, RADIUS_FX, -68, 10);

function computeMorphingBodyPath(dx: number): string {
  const l16 = (-16 + dx).toFixed(1);
  const l20 = (-20 + dx).toFixed(1);
  const l22 = (-22 + dx).toFixed(1);
  const l24 = (-24 + dx).toFixed(1);
  const l26 = (-26 + dx).toFixed(1);
  const l29 = (-29 + dx).toFixed(1);
  const l33 = (-33 + dx).toFixed(1);
  const l335 = (-33.5 + dx).toFixed(1);
  const l34 = (-34 + dx).toFixed(1);
  const l35 = (-35 + dx).toFixed(1);
  const l355 = (-35.5 + dx).toFixed(1);
  const l36 = (-36 + dx).toFixed(1);
  const l185 = (-18.5 + dx).toFixed(1);

  return [
    `M ${l16} -84`,
    "L 16 -84",
    "C 26 -83.5, 34 -78, 35 -70",
    "L 34 -68",
    "C 22 -68, 18.5 -63, 18.5 -52",
    "C 18.5 -41, 22 -36, 34 -36",
    "L 35 -33",
    "C 34 -18, 33 -2, 33.5 14",
    "C 34 24, 35.5 29, 36 33",
    "L 35 36",
    "C 24 36, 22 41, 22 52",
    "C 22 63, 24 68, 35 68",
    "L 35.5 71",
    "C 35 79, 29 83.2, 20 84",
    `L ${l20} 84`,
    `C ${l29} 83.2, ${l35} 79, ${l355} 71`,
    `L ${l35} 68`,
    `C ${l24} 68, ${l22} 63, ${l22} 52`,
    `C ${l22} 41, ${l24} 36, ${l35} 36`,
    `L ${l36} 33`,
    `C ${l355} 29, ${l34} 24, ${l335} 14`,
    `C ${l33} -2, ${l34} -18, ${l35} -33`,
    `L ${l34} -36`,
    `C ${l22} -36, ${l185} -41, ${l185} -52`,
    `C ${l185} -63, ${l22} -68, ${l34} -68`,
    `L ${l35} -70`,
    `C ${l34} -78, ${l26} -83.5, ${l16} -84`,
    "Z",
  ].join(" ");
}

interface MorphingTireProps {
  readonly x: number;
  readonly y: number;
  readonly steerDeg: number;
  readonly wheelRollDistance: number;
}

function MorphingTire({ x, y, steerDeg, wheelRollDistance }: MorphingTireProps): ReactElement {
  const rollAngleBase = -wheelRollDistance / TIRE_RADIUS;

  return (
    <g transform={`translate(${x}, ${y}) rotate(${steerDeg})`}>
      <rect
        x={-5.5}
        y={-14}
        width={11}
        height={28}
        rx={3.5}
        fill="url(#cut-car-tire-hero-grad)"
        stroke="oklch(0.92 0 0 / 0.92)"
        strokeWidth={1.35}
      />
      <g clipPath="url(#cut-car-tire-clip)">
        <line x1={-2} y1={-14} x2={-2} y2={14} stroke="oklch(0.11 0 0 / 0.72)" strokeWidth={0.9} />
        <line x1={2} y1={-14} x2={2} y2={14} stroke="oklch(0.11 0 0 / 0.72)" strokeWidth={0.9} />
        {TREAD_INDICES.map((index) => {
          const angle = rollAngleBase + (index * 2 * Math.PI) / TREAD_RIB_COUNT;
          const cosAngle = Math.cos(angle);
          if (cosAngle <= 0.08) {
            return null;
          }
          const ribY = TIRE_RADIUS * Math.sin(angle);
          const ridgeOpacity = 0.22 + 0.48 * cosAngle;
          const grooveOpacity = 0.35 + 0.48 * cosAngle;
          return (
            <g key={index}>
              <line
                x1={-5}
                y1={ribY}
                x2={5}
                y2={ribY}
                stroke={`oklch(0.78 0 0 / ${ridgeOpacity.toFixed(2)})`}
                strokeWidth={1.1}
              />
              <line
                x1={-5}
                y1={ribY + 1.15}
                x2={5}
                y2={ribY + 1.15}
                stroke={`oklch(0.08 0 0 / ${grooveOpacity.toFixed(2)})`}
                strokeWidth={1}
              />
            </g>
          );
        })}
      </g>
      <line x1={-7.5} y1={0} x2={7.5} y2={0} stroke="oklch(0.97 0 0)" strokeWidth={1.2} />
      <circle cx={0} cy={0} r={2.1} fill="oklch(0.97 0 0)" />
    </g>
  );
}

interface MorphingCutPlaneCarProps {
  readonly widthDelta: number;
  readonly frontLeftSteerDeg: number;
  readonly frontRightSteerDeg: number;
  readonly wheelRollDistance: number;
  readonly isReversing: boolean;
  readonly isBraking: boolean;
  readonly bcEdgeGlow: number;
}

/**
 * 2D Cut-Plane Coupe whose kerb-side edge AD (+X = +38) and wheel centers E, F (+31)
 * remain strictly locked while road-side edge BC (-X = -38 - widthDelta) expands & contracts cleanly.
 */
function MorphingCutPlaneCar({
  widthDelta,
  frontLeftSteerDeg,
  frontRightSteerDeg,
  wheelRollDistance,
  isReversing,
  isBraking,
  bcEdgeGlow,
}: MorphingCutPlaneCarProps): ReactElement {
  const dx = -widthDelta;
  const midX = dx * 0.5;
  const bodyPath = computeMorphingBodyPath(dx);
  const taillightStroke = isBraking ? "oklch(0.68 0.22 25 / 0.96)" : "oklch(0.78 0.08 25 / 0.64)";

  return (
    <g className="select-none">
      {/* Ground Contact Shadow */}
      <path d={bodyPath} fill="oklch(0 0 0 / 0.45)" transform="translate(0, 4)" />

      {/* Four Sectioned Tires (Left-side tires shift cleanly with edge BC) */}
      <MorphingTire
        x={-TRACK_HALF_W + dx}
        y={-WHEEL_HALF_L}
        steerDeg={frontLeftSteerDeg}
        wheelRollDistance={wheelRollDistance}
      />
      <MorphingTire
        x={TRACK_HALF_W}
        y={-WHEEL_HALF_L}
        steerDeg={frontRightSteerDeg}
        wheelRollDistance={wheelRollDistance}
      />
      <MorphingTire x={-TRACK_HALF_W + dx} y={WHEEL_HALF_L} steerDeg={0} wheelRollDistance={wheelRollDistance} />
      <MorphingTire x={TRACK_HALF_W} y={WHEEL_HALF_L} steerDeg={0} wheelRollDistance={wheelRollDistance} />

      {/* Sculpted Coupe Body Shell */}
      <path d={bodyPath} fill="url(#cut-car-hero-grad)" stroke="oklch(0.92 0 0 / 0.88)" strokeWidth={1.4} />

      {/* Wing Mirrors */}
      <g fill="oklch(0.32 0 0)" stroke="oklch(0.84 0 0 / 0.75)" strokeWidth={0.9}>
        <path d={`M ${-33.5 + dx} -22 L ${-38 + dx} -20 L ${-38 + dx} -15.5 L ${-33.5 + dx} -17 Z`} />
        <path d="M 33.5 -22 L 38 -20 L 38 -15.5 L 33.5 -17 Z" />
      </g>

      {/* Bonnet Creases, Glasshouse, Roof & LED Lights */}
      <g>
        <path
          d={`M ${-15 + dx} -78 C ${-13 + dx} -60, ${-11 + dx} -42, ${-10 + dx} -25 M 15 -78 C 13 -60, 11 -42, 10 -25`}
          fill="none"
          stroke="oklch(0.68 0 0 / 0.36)"
          strokeWidth={0.9}
          strokeLinecap="round"
        />

        {/* Windshield */}
        <path
          d={`M ${-22 + dx} -24 Q ${midX} -28 22 -24 L 17.5 2 L ${-17.5 + dx} 2 Z`}
          fill="url(#cut-car-glass-grad)"
          stroke="oklch(0.76 0 0 / 0.35)"
          strokeWidth={0.9}
        />

        {/* Rear Glass */}
        <path
          d={`M ${-15 + dx} 32 L 15 32 L 18 58 Q ${midX} 61 ${-18 + dx} 58 Z`}
          fill="url(#cut-car-glass-grad)"
          stroke="oklch(0.72 0 0 / 0.3)"
          strokeWidth={0.9}
        />

        {/* Tapered Roof Panel */}
        <path
          d={`M ${-17.5 + dx} 2 L 17.5 2 L 15 32 L ${-15 + dx} 32 Z`}
          fill="url(#cut-car-hero-cabin-grad)"
          stroke="oklch(0.78 0 0 / 0.32)"
          strokeWidth={0.9}
        />

        {/* Headlight Blades */}
        <path
          d={`M ${-29 + dx} -76 C ${-24 + dx} -80, ${-17 + dx} -81.5, ${-12 + dx} -80`}
          fill="none"
          stroke="oklch(0.96 0 0 / 0.94)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="M 12 -80 C 17 -81.5, 24 -80, 29 -76"
          fill="none"
          stroke="oklch(0.96 0 0 / 0.94)"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Taillights & Brake Strip */}
        <path
          d={`M ${-27 + dx} 79 C ${-21 + dx} 81.5, ${-15 + dx} 82, ${-10 + dx} 81.5`}
          fill="none"
          stroke={taillightStroke}
          strokeWidth={isBraking ? 2.1 : 1.6}
          strokeLinecap="round"
        />
        <path
          d="M 10 81.5 C 15 82, 21 81.5, 27 79"
          fill="none"
          stroke={taillightStroke}
          strokeWidth={isBraking ? 2.1 : 1.6}
          strokeLinecap="round"
        />
        <line
          x1={-7 + dx}
          y1={81.5}
          x2={7}
          y2={81.5}
          stroke={taillightStroke}
          strokeWidth={isBraking ? 1.5 : 0.9}
          strokeLinecap="round"
        />

        {/* Reversing Lamps */}
        {isReversing ? (
          <g stroke="oklch(0.97 0 0 / 0.95)" strokeWidth={1.8} strokeLinecap="round">
            <line x1={-11 + dx} y1={82} x2={-6 + dx} y2={82} />
            <line x1={6} y1={82} x2={11} y2={82} />
          </g>
        ) : null}
      </g>

      {/* Wheel-Center Cut-Plane Axles */}
      <line
        x1={-25 + dx}
        y1={-WHEEL_HALF_L}
        x2={25}
        y2={-WHEEL_HALF_L}
        stroke="oklch(0.88 0 0 / 0.65)"
        strokeWidth={1.2}
        strokeDasharray="2.5 2.5"
      />
      <line
        x1={-25 + dx}
        y1={WHEEL_HALF_L}
        x2={25}
        y2={WHEEL_HALF_L}
        stroke="oklch(0.95 0 0 / 0.88)"
        strokeWidth={1.75}
      />
      <circle cx={midX} cy={WHEEL_HALF_L} r={3} fill="oklch(0.2 0 0)" stroke="oklch(0.97 0 0)" strokeWidth={1.2} />
      <line
        x1={midX}
        y1={-WHEEL_HALF_L}
        x2={midX}
        y2={WHEEL_HALF_L}
        stroke="oklch(0.78 0 0 / 0.35)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      {/* Outer Bounding Envelope ABCD & Luminous Edge BC Highlight */}
      <rect
        x={-HALF_W + dx}
        y={-HALF_L}
        width={HALF_W * 2 - dx}
        height={HALF_L * 2}
        rx={2}
        fill="none"
        stroke="oklch(0.84 0 0 / 0.32)"
        strokeWidth={1}
        strokeDasharray="3 4"
      />
      {bcEdgeGlow > 0.02 ? (
        <line
          x1={-HALF_W + dx}
          y1={-HALF_L}
          x2={-HALF_W + dx}
          y2={HALF_L}
          stroke="oklch(0.99 0 0)"
          strokeWidth={2.6}
          opacity={bcEdgeGlow}
          filter="url(#slide13-luminous-glow)"
        />
      ) : null}
    </g>
  );
}

export function Slide13WidthParadox(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);
  const stageFadeIn = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.9));

  // Car pose & width-morph timeline across 0s - 36s
  let headingDeg = -38;
  let widthDelta = 0;
  let shuffleOffsetX = 0;
  let shuffleOffsetY = 0;
  let isReversing = false;
  let isBraking = true;

  if (elapsedSeconds < 12.66) {
    headingDeg = -38;
    widthDelta = 0;
    isReversing = false;
    isBraking = true;
  } else if (elapsedSeconds < 19.15) {
    const u = easeInOutCubic(progressBetween(elapsedSeconds, 12.66, 19.15));
    headingDeg = -38 + (GRAZE_HEADING_DEG - -38) * u;
    widthDelta = 0;
    isReversing = true;
    isBraking = false;
  } else if (elapsedSeconds < 20.8) {
    const u = easeInOutCubic(progressBetween(elapsedSeconds, 19.15, 20.8));
    headingDeg = GRAZE_HEADING_DEG + (-14 - GRAZE_HEADING_DEG) * u;
    widthDelta = 0;
    isReversing = true;
    isBraking = false;
  } else if (elapsedSeconds < 23.4) {
    const u = easeInOutCubic(progressBetween(elapsedSeconds, 20.8, 23.4));
    headingDeg = -14 + (-36 - -14) * u;
    widthDelta = 52 * easeInOutCubic(progressBetween(elapsedSeconds, 20.8, 23.2));
    isReversing = false;
    isBraking = false;
  } else if (elapsedSeconds < 27.4) {
    const u = easeInOutCubic(progressBetween(elapsedSeconds, 23.4, 27.4));
    headingDeg = -36 * (1 - u);
    if (elapsedSeconds < 25.2) {
      widthDelta = 52;
    } else if (elapsedSeconds < 26.5) {
      const shrink = easeInOutCubic(progressBetween(elapsedSeconds, 25.2, 26.5));
      widthDelta = 52 + (-14 - 52) * shrink;
    } else {
      const expand = easeInOutCubic(progressBetween(elapsedSeconds, 26.5, 27.4));
      widthDelta = -14 + (44 - -14) * expand;
    }
    isReversing = true;
    isBraking = false;
  } else if (elapsedSeconds < 29.8) {
    const u = easeInOutCubic(progressBetween(elapsedSeconds, 27.4, 29.8));
    headingDeg = -46 * u;
    widthDelta = 44;
    isReversing = false;
    isBraking = false;
  } else if (elapsedSeconds < 31.8) {
    headingDeg = -46;
    widthDelta = 44;
    isReversing = false;
    isBraking = true;
  } else if (elapsedSeconds < 35.0) {
    const narrowRelax = easeInOutCubic(progressBetween(elapsedSeconds, 31.8, 32.8));
    widthDelta = 44 + (24 - 44) * narrowRelax;
    if (elapsedSeconds < 32.9) {
      const u = easeInOutCubic(progressBetween(elapsedSeconds, 31.8, 32.9));
      headingDeg = -46 + (-12 - -46) * u;
      isReversing = true;
      isBraking = false;
    } else if (elapsedSeconds < 33.8) {
      const u = easeInOutCubic(progressBetween(elapsedSeconds, 32.9, 33.8));
      headingDeg = -12 + (-20 - -12) * u;
      shuffleOffsetX = -10 * Math.sin(u * Math.PI);
      shuffleOffsetY = -14 * Math.sin(u * Math.PI);
      isReversing = false;
      isBraking = false;
    } else {
      const u = easeInOutCubic(progressBetween(elapsedSeconds, 33.8, 35.0));
      headingDeg = -20 * (1 - u);
      isReversing = true;
      isBraking = elapsedSeconds >= 34.7;
    }
  } else {
    headingDeg = 0;
    const settle = easeInOutCubic(progressBetween(elapsedSeconds, 35.0, 35.8));
    widthDelta = 24 * (1 - settle);
    isReversing = false;
    isBraking = true;
  }

  // Exact Ackermann wheel angles keeping axle normals focused at X(430, 337)
  const frontRightSteerDeg = -((Math.atan2(WHEELBASE_PX, RADIUS_FX) * 180) / Math.PI); // -23.34 deg
  const frontLeftSteerDeg = -((Math.atan2(WHEELBASE_PX, RADIUS_FX - 2 * TRACK_HALF_W - widthDelta) * 180) / Math.PI);
  const wheelRollDistance = -RADIUS_FX * degToRad(headingDeg);

  const rawCenter = rotateLocalPointAroundX(0, 0, headingDeg);
  const carCenterX = rawCenter.x + shuffleOffsetX;
  const carCenterY = rawCenter.y + shuffleOffsetY;

  // World vertices of A, B, C, D, E, F
  const rawA = rotateLocalPointAroundX(HALF_W, -HALF_L, headingDeg);
  const rawB = rotateLocalPointAroundX(-HALF_W - widthDelta, -HALF_L, headingDeg);
  const rawC = rotateLocalPointAroundX(-HALF_W - widthDelta, HALF_L, headingDeg);
  const rawD = rotateLocalPointAroundX(HALF_W, HALF_L, headingDeg);
  const pointA: Point2D = { x: rawA.x + shuffleOffsetX, y: rawA.y + shuffleOffsetY };
  const pointB: Point2D = { x: rawB.x + shuffleOffsetX, y: rawB.y + shuffleOffsetY };
  const pointC: Point2D = { x: rawC.x + shuffleOffsetX, y: rawC.y + shuffleOffsetY };
  const pointD: Point2D = { x: rawD.x + shuffleOffsetX, y: rawD.y + shuffleOffsetY };

  const bcMid: Point2D = { x: (pointB.x + pointC.x) * 0.5, y: (pointB.y + pointC.y) * 0.5 };

  // Beat highlights
  const wFormulaGlow = pulseEnvelope(elapsedSeconds, 4.9, 5.5, 7.3, 8.1);
  const formulaScanProgress = progressBetween(elapsedSeconds, 8.5, 11.1);
  const showFormulaScan = formulaScanProgress > 0 && formulaScanProgress < 1;
  const formulaScanX = -205 + 525 * easeInOutCubic(formulaScanProgress);

  const ownWidthPulse = pulseEnvelope(elapsedSeconds, 8.4, 9.1, 10.9, 11.7);
  const pinchPointGlow = Math.max(
    pulseEnvelope(elapsedSeconds, 15.8, 16.5, 19.8, 20.6),
    pulseEnvelope(elapsedSeconds, 24.3, 24.8, 26.8, 27.5),
  );

  const bcEdgeGlow = pulseEnvelope(elapsedSeconds, 21.0, 21.8, 25.0, 26.0);
  const bcToXIndicator = pulseEnvelope(elapsedSeconds, 21.8, 22.5, 25.0, 26.0);
  const outerPathGlow = pulseEnvelope(elapsedSeconds, 24.6, 25.4, 27.0, 27.8);

  // Beat 4: Narrow road encroachment (28.5s - 32.0s) & shuffle indicator (32.0s - 35.5s)
  const narrowRoadProgress =
    easeInOutCubic(progressBetween(elapsedSeconds, 28.5, 30.6)) *
    (1 - 0.16 * easeInOutCubic(progressBetween(elapsedSeconds, 31.8, 32.8)));
  const asphaltLeftX = 280 + (NARROW_ROAD_WALL_X - 280) * narrowRoadProgress; // 280 -> 440 -> 414
  const wideRoadDividerOpacity = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 28.6, 30.0));
  const narrowWarningGlow = pulseEnvelope(elapsedSeconds, 29.8, 30.3, 31.6, 32.2);
  const narrowNormalGhostOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 29.6, 30.2)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 31.5, 32.1))) *
    0.4;

  const shuffleOverlayOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 32.0, 32.8)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 35.0, 35.8)));

  // Formula card dims gently during final real-world caveat so road stage commands full attention
  const formulaCardOpacity = stageFadeIn * (1 - 0.35 * easeInOutCubic(progressBetween(elapsedSeconds, 27.6, 29.2)));

  // Outward normal unit vectors for crisp moving vertex labels
  const hRad = degToRad(headingDeg);
  const rightX = Math.cos(hRad);
  const rightY = Math.sin(hRad);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">13</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Why Doesn&apos;t Your Car&apos;s Width Matter?
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>
          Cut-plane car expanding and contracting along road edge BC while kerb edge AD and front corner A follow the
          unchanged turning circle past G
        </title>
        <defs>
          <radialGradient id="slide13-ambient-glow" cx="52%" cy="45%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide13-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="slide13-road-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="9%" stopColor="white" stopOpacity={1} />
            <stop offset="85%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="black" stopOpacity={0} />
          </linearGradient>

          <mask id="slide13-road-fade-mask">
            <rect x={0} y={0} width={960} height={472} fill="url(#slide13-road-fade-grad)" />
          </mask>

          <linearGradient id="slide13-asphalt-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.145 0 0)" />
            <stop offset="20%" stopColor="oklch(0.165 0 0)" />
            <stop offset="52%" stopColor="oklch(0.175 0 0)" />
            <stop offset="100%" stopColor="oklch(0.145 0 0)" />
          </linearGradient>

          <linearGradient id="slide13-sidewalk-right-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.88)" />
            <stop offset="55%" stopColor="oklch(0.19 0 0 / 0.42)" />
            <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
          </linearGradient>

          <linearGradient id="slide13-sidewalk-left-grad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.84)" />
            <stop offset="55%" stopColor="oklch(0.18 0 0 / 0.35)" />
            <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
          </linearGradient>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={300} r={315} fill="url(#slide13-ambient-glow)" />

        {/* ================================================================
            ROAD STAGE (WIDENS / NARROWS LEFT EDGE FOR REAL-LIFE COMPARISON)
           ================================================================ */}
        <g opacity={stageFadeIn} mask="url(#slide13-road-fade-mask)">
          {/* Left Shoulder / Narrow-Road Wall */}
          <rect x={asphaltLeftX - 110} y={0} width={104} height={472} fill="url(#slide13-sidewalk-left-grad)" />
          <rect x={asphaltLeftX - 6} y={0} width={6} height={472} fill="oklch(0.27 0 0)" />
          <line
            x1={asphaltLeftX}
            y1={0}
            x2={asphaltLeftX}
            y2={472}
            stroke={narrowWarningGlow > 0.15 ? "oklch(0.84 0.14 25)" : "oklch(0.56 0 0 / 0.48)"}
            strokeWidth={narrowWarningGlow > 0.15 ? 2 : 1.25}
          />

          {/* Right Sidewalk */}
          <rect x={KERB_STONE_X + 8} y={0} width={145} height={472} fill="url(#slide13-sidewalk-right-grad)" />
          <g stroke="oklch(0.32 0 0 / 0.34)" strokeWidth={1}>
            {PAVING_JOINT_Y.map((y) => (
              <line key={`pave-${y}`} x1={KERB_STONE_X + 8} y1={y} x2={KERB_STONE_X + 135} y2={y} />
            ))}
          </g>

          {/* Asphalt Road Surface */}
          <rect
            x={asphaltLeftX}
            y={0}
            width={KERB_STONE_X - asphaltLeftX}
            height={472}
            fill="url(#slide13-asphalt-grad)"
          />

          {/* Concrete Right Kerb */}
          <rect x={KERB_STONE_X} y={0} width={8} height={472} fill="oklch(0.29 0 0)" />
          <line x1={KERB_STONE_X} y1={0} x2={KERB_STONE_X} y2={472} stroke="oklch(0.72 0 0 / 0.65)" strokeWidth={1.5} />
          <g stroke="oklch(0.44 0 0 / 0.65)" strokeWidth={1}>
            {KERB_JOINT_Y.map((y) => (
              <line key={`kerb-${y}`} x1={KERB_STONE_X} y1={y} x2={KERB_STONE_X + 8} y2={y} />
            ))}
          </g>

          {/* Parking Bay Line */}
          <line
            x1={PARKING_LINE_X}
            y1={0}
            x2={PARKING_LINE_X}
            y2={472}
            stroke="oklch(0.62 0 0 / 0.34)"
            strokeWidth={1.2}
            strokeDasharray="8 10"
          />

          {/* Center Lane Divider (Fades out as road narrows) */}
          {wideRoadDividerOpacity > 0.01 ? (
            <line
              x1={437}
              y1={8}
              x2={437}
              y2={464}
              stroke="oklch(0.74 0 0 / 0.4)"
              strokeWidth={1.7}
              strokeDasharray="22 18"
              opacity={wideRoadDividerOpacity}
            />
          ) : null}

          {/* Kerb Tangent Alignment Line */}
          <line
            x1={KERB_LINE_X}
            y1={12}
            x2={KERB_LINE_X}
            y2={460}
            stroke="oklch(0.74 0 0 / 0.25)"
            strokeWidth={1}
            strokeDasharray="3 5"
          />

          {/* Front Parked Car (Width w) */}
          <g transform={`translate(${PARALLEL_CENTER_X}, ${FRONT_PARKED_CENTER_Y})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
        </g>

        {/* ================================================================
            UNCHANGED CONCENTRIC TURNING CIRCLES AROUND X
           ================================================================ */}
        <g opacity={stageFadeIn}>
          <path d={WHEEL_F_ARC} fill="none" stroke="oklch(0.76 0 0 / 0.28)" strokeWidth={1.2} strokeDasharray="4 6" />
          <path d={WHEEL_E_ARC} fill="none" stroke="oklch(0.8 0 0 / 0.34)" strokeWidth={1.25} strokeDasharray="4 6" />
          <path
            d={OUTER_CIRCLE_ARC}
            fill="none"
            stroke={`oklch(0.96 0 0 / ${(0.68 + 0.3 * Math.max(pinchPointGlow, outerPathGlow)).toFixed(2)})`}
            strokeWidth={1.8 + 0.8 * outerPathGlow}
            filter={Math.max(pinchPointGlow, outerPathGlow) > 0.2 ? "url(#slide13-luminous-glow)" : undefined}
          />
        </g>

        {/* Parked Car Width w Caliper (4.98s - 8.1s) */}
        {wFormulaGlow > 0.02 ? (
          <g opacity={wFormulaGlow}>
            <line
              x1={POINT_G.x}
              y1={POINT_G.y}
              x2={POINT_H.x}
              y2={POINT_H.y}
              stroke="oklch(0.99 0 0)"
              strokeWidth={2.5}
              filter="url(#slide13-luminous-glow)"
            />
            <g stroke="oklch(0.92 0 0 / 0.72)" strokeWidth={1.2}>
              <line x1={POINT_G.x} y1={POINT_G.y + 8} x2={POINT_G.x} y2={POINT_G.y + 18} />
              <line x1={POINT_H.x} y1={POINT_H.y + 8} x2={POINT_H.x} y2={POINT_H.y + 18} />
              <line x1={POINT_G.x} y1={POINT_G.y + 13} x2={POINT_H.x} y2={POINT_H.y + 13} />
            </g>
            <text
              x={PARALLEL_CENTER_X}
              y={POINT_G.y + 31}
              textAnchor="middle"
              stroke="oklch(0.15 0 0 / 0.94)"
              strokeWidth={4}
              strokeLinejoin="round"
              className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
            >
              w
            </text>
          </g>
        ) : null}

        {/* Standard-Width Ghost Car During Narrow-Road Encroachment Comparison */}
        {narrowNormalGhostOpacity > 0.01 ? (
          <g
            transform={`translate(${carCenterX}, ${carCenterY}) rotate(${headingDeg})`}
            opacity={narrowNormalGhostOpacity}
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

        {/* Tight Multi-Point Shuffle Zig-Zag Guide (32.0s - 35.8s) */}
        {shuffleOverlayOpacity > 0.01 ? (
          <g opacity={shuffleOverlayOpacity} fill="none">
            <path
              d="M 555 245 C 585 268, 608 278, 636 286 M 636 286 C 618 264, 604 252, 588 238 M 588 238 C 608 260, 624 274, 640 285"
              stroke="oklch(0.95 0 0 / 0.78)"
              strokeWidth={1.7}
              strokeDasharray="4 4"
              filter="url(#slide13-luminous-glow)"
            />
            <rect
              x={600}
              y={374}
              width={80}
              height={40}
              rx={4}
              fill="oklch(0.2 0 0 / 0.65)"
              stroke="oklch(0.78 0 0 / 0.45)"
              strokeWidth={1.2}
              strokeDasharray="4 4"
            />
          </g>
        ) : null}

        {/* Live Dashed Distance Indicator Between Morphing Edge BC and Center X */}
        {bcToXIndicator > 0.02 ? (
          <g opacity={bcToXIndicator}>
            <line
              x1={bcMid.x}
              y1={bcMid.y}
              x2={TURNING_CENTER.x}
              y2={TURNING_CENTER.y}
              stroke="oklch(0.96 0 0 / 0.8)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <circle cx={bcMid.x} cy={bcMid.y} r={3.5} fill="oklch(0.98 0 0)" />
          </g>
        ) : null}

        {/* ================================================================
            MORPHING 2D CUT-PLANE HERO CAR
           ================================================================ */}
        <g transform={`translate(${carCenterX}, ${carCenterY}) rotate(${headingDeg})`}>
          <MorphingCutPlaneCar
            widthDelta={widthDelta}
            frontLeftSteerDeg={frontLeftSteerDeg}
            frontRightSteerDeg={frontRightSteerDeg}
            wheelRollDistance={wheelRollDistance}
            isReversing={isReversing}
            isBraking={isBraking}
            bcEdgeGlow={bcEdgeGlow}
          />

          {/* Own-Car Width Bracket Highlight (8.4s - 11.7s) */}
          {ownWidthPulse > 0.02 ? (
            <g opacity={ownWidthPulse}>
              <line
                x1={-HALF_W}
                y1={-HALF_L - 14}
                x2={HALF_W}
                y2={-HALF_L - 14}
                stroke="oklch(0.98 0 0)"
                strokeWidth={1.8}
                filter="url(#slide13-luminous-glow)"
              />
              <g stroke="oklch(0.98 0 0)" strokeWidth={1.3}>
                <line x1={-HALF_W} y1={-HALF_L - 19} x2={-HALF_W} y2={-HALF_L - 9} />
                <line x1={HALF_W} y1={-HALF_L - 19} x2={HALF_W} y2={-HALF_L - 9} />
              </g>
            </g>
          ) : null}
        </g>

        {/* Narrow-Road Encroachment Warning Ring on Wide Corner B */}
        {narrowWarningGlow > 0.02 ? (
          <g transform={`translate(${pointB.x}, ${pointB.y})`} opacity={narrowWarningGlow}>
            <circle
              cx={0}
              cy={0}
              r={14}
              fill="oklch(0.7 0.16 25 / 0.18)"
              stroke="oklch(0.84 0.16 25)"
              strokeWidth={1.8}
            />
            <circle cx={0} cy={0} r={4.5} fill="oklch(0.86 0.16 25)" />
          </g>
        ) : null}

        {/* ================================================================
            CRITICAL PINCH POINT G & TURNING CENTER X NODES
           ================================================================ */}
        <g transform={`translate(${POINT_G.x}, ${POINT_G.y})`} opacity={stageFadeIn}>
          {pinchPointGlow > 0.03 ? (
            <circle
              cx={0}
              cy={0}
              r={10 + 12 * pinchPointGlow}
              fill="none"
              stroke="oklch(0.99 0 0)"
              strokeWidth={1.4}
              opacity={pinchPointGlow * 0.85}
            />
          ) : null}
          <circle
            cx={0}
            cy={0}
            r={4.2 + 1.4 * pinchPointGlow}
            fill="oklch(0.98 0 0)"
            filter={pinchPointGlow > 0.1 ? "url(#slide13-luminous-glow)" : undefined}
          />
          <text
            x={-13}
            y={-8}
            textAnchor="end"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
          >
            G
          </text>
        </g>

        <g transform={`translate(${TURNING_CENTER.x}, ${TURNING_CENTER.y})`} opacity={stageFadeIn}>
          {bcToXIndicator > 0.03 ? (
            <circle
              cx={0}
              cy={0}
              r={20 + 8 * bcToXIndicator}
              fill="none"
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.3}
              opacity={bcToXIndicator * 0.8}
            />
          ) : null}
          <polygon
            points="0,-16 13.86,-8 13.86,8 0,16 -13.86,8 -13.86,-8"
            fill="oklch(0.24 0 0 / 0.94)"
            stroke="oklch(0.94 0 0 / 0.9)"
            strokeWidth={1.4}
          />
          <circle cx={0} cy={0} r={4.5} fill="oklch(0.98 0 0)" filter="url(#slide13-luminous-glow)" />
          <text
            x={-22}
            y={5}
            textAnchor="end"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
          >
            X
          </text>
        </g>

        {/* Moving Corner Vertex Labels A, B, C, D */}
        <g opacity={stageFadeIn} className="font-mono text-sm font-semibold">
          <circle cx={pointA.x} cy={pointA.y} r={4} fill="oklch(0.98 0 0)" filter="url(#slide13-luminous-glow)" />
          <text
            x={pointA.x + rightX * 14}
            y={pointA.y + rightY * 14 + 4}
            textAnchor="start"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary"
          >
            A
          </text>

          <circle cx={pointB.x} cy={pointB.y} r={3.2} fill="oklch(0.92 0 0)" />
          <text
            x={pointB.x - rightX * 14}
            y={pointB.y - rightY * 14 + 4}
            textAnchor="end"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-secondary"
          >
            B
          </text>

          <circle cx={pointC.x} cy={pointC.y} r={3.2} fill="oklch(0.92 0 0)" />
          <text
            x={pointC.x - rightX * 14}
            y={pointC.y - rightY * 14 + 4}
            textAnchor="end"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-secondary"
          >
            C
          </text>

          <circle cx={pointD.x} cy={pointD.y} r={3} fill="oklch(0.84 0 0)" />
          <text
            x={pointD.x + rightX * 14}
            y={pointD.y + rightY * 14 + 4}
            textAnchor="start"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-secondary"
          >
            D
          </text>
        </g>

        {/* ================================================================
            BOTTOM MASTER FORMULA CARD (HIGHLIGHTING w & ABSENCE OF CAR WIDTH)
           ================================================================ */}
        <g transform="translate(480, 526) scale(0.84)" opacity={formulaCardOpacity}>
          <rect
            x={-336}
            y={-52}
            width={672}
            height={80}
            rx={10}
            fill="oklch(0.21 0 0 / 0.94)"
            stroke="oklch(0.95 0 0 / 0.85)"
            strokeWidth={1.5}
          />

          {/* Formula Absence Scan Beam (8.5s - 11.1s) */}
          {showFormulaScan ? (
            <g>
              <rect x={formulaScanX - 28} y={-44} width={56} height={64} rx={6} fill="oklch(0.98 0 0 / 0.08)" />
              <line
                x1={formulaScanX}
                y1={-46}
                x2={formulaScanX}
                y2={22}
                stroke="oklch(0.98 0 0 / 0.82)"
                strokeWidth={1.6}
                filter="url(#slide13-luminous-glow)"
              />
            </g>
          ) : null}

          <text x={-290} y={8} textAnchor="middle" className="fill-text-primary font-mono text-2xl font-semibold">
            |AH|
          </text>
          <text x={-242} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            =
          </text>
          <path
            d="M -224 1 L -219 1 L -213 13 L -199 -41 L 236 -41 L 236 -35"
            fill="none"
            stroke="oklch(0.98 0 0)"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <text x={-184} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            (
          </text>
          <text x={-169} y={8} textAnchor="middle" className="fill-text-primary font-mono text-2xl font-semibold">
            r
          </text>
          <text x={-157} y={-8} textAnchor="middle" className="fill-text-primary font-mono text-base font-semibold">
            2
          </text>
          <text x={-141} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            −
          </text>
          <text x={-123} y={8} textAnchor="middle" className="fill-text-primary font-mono text-2xl font-semibold">
            l
          </text>
          <text x={-111} y={-8} textAnchor="middle" className="fill-text-primary font-mono text-base font-semibold">
            2
          </text>
          <text x={-97} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            )
          </text>

          <text x={-76} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            +
          </text>

          <text x={-54} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            (
          </text>
          <text x={-38} y={8} textAnchor="middle" className="fill-text-primary font-mono text-2xl font-semibold">
            l
          </text>
          <text x={-20} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            +
          </text>
          <text x={-2} y={8} textAnchor="middle" className="fill-text-primary font-mono text-2xl font-semibold">
            k
          </text>
          <text x={13} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            )
          </text>
          <text x={25} y={-8} textAnchor="middle" className="fill-text-primary font-mono text-base font-semibold">
            2
          </text>

          <text x={44} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            −
          </text>

          <path d="M 68 -26 Q 59 -6 68 14" fill="none" stroke="oklch(0.84 0 0)" strokeWidth={2} strokeLinecap="round" />
          <path
            d="M 74 0 L 78 0 L 82 9 L 92 -27 L 164 -27"
            fill="none"
            stroke="oklch(0.98 0 0)"
            strokeWidth={1.85}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x={100} y={8} textAnchor="middle" className="fill-text-primary font-mono text-2xl font-semibold">
            r
          </text>
          <text x={112} y={-7} textAnchor="middle" className="fill-text-primary font-mono text-sm font-semibold">
            2
          </text>
          <text x={127} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            −
          </text>
          <text x={143} y={8} textAnchor="middle" className="fill-text-primary font-mono text-2xl font-semibold">
            l
          </text>
          <text x={155} y={-7} textAnchor="middle" className="fill-text-primary font-mono text-sm font-semibold">
            2
          </text>
          <text x={173} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            −
          </text>

          {wFormulaGlow > 0.02 ? (
            <circle
              cx={190}
              cy={1}
              r={16}
              fill="oklch(0.98 0 0 / 0.14)"
              stroke="oklch(0.98 0 0 / 0.85)"
              strokeWidth={1.4}
              opacity={wFormulaGlow}
            />
          ) : null}
          <text
            x={190}
            y={8}
            textAnchor="middle"
            filter={wFormulaGlow > 0.2 ? "url(#slide13-luminous-glow)" : undefined}
            className="fill-text-primary font-mono text-2xl font-semibold"
          >
            w
          </text>

          <path
            d="M 204 -26 Q 213 -6 204 14"
            fill="none"
            stroke="oklch(0.84 0 0)"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <text x={219} y={-10} textAnchor="middle" className="fill-text-primary font-mono text-base font-semibold">
            2
          </text>

          <text x={252} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            −
          </text>
          <text x={272} y={8} textAnchor="middle" className="fill-text-primary font-mono text-2xl font-semibold">
            l
          </text>
          <text x={292} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
            −
          </text>
          <text x={312} y={8} textAnchor="middle" className="fill-text-primary font-mono text-2xl font-semibold">
            k
          </text>
        </g>
      </svg>
    </div>
  );
}
