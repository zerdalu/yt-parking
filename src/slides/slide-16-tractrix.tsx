import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import {
  CarSectionVariants,
  computeAckermannAngles,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  type Point2D,
} from "@/simulation/car-simulator";
import { usePresentationStore } from "@/store/presentation-store";
import { useMemo, type ReactElement } from "react";

const CAR_SCALE = 0.85;
const CAR_LENGTH = DEFAULT_VEHICLE_DIMENSIONS.length * CAR_SCALE; // 142.8 (common radius of Figure 6 circles)
const CAR_WIDTH = DEFAULT_VEHICLE_DIMENSIONS.width * CAR_SCALE; // 64.6
const HALF_CAR_W = CAR_WIDTH * 0.5; // 32.3
const HALF_CAR_L = CAR_LENGTH * 0.5; // 71.4
const WHEELBASE = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * CAR_SCALE; // 88.4
const HALF_WHEELBASE = WHEELBASE * 0.5; // 44.2

// Figure 5 horizontal multi-storey bay EFGH on the right, driving aisle on the left
const X_0 = 315;
const Y_GUIDE = 398; // Dashed guide line for corner B just above EF (y = 408)
const BAY_LEFT_X = 530;
const BAY_RIGHT_X = 720;
const BAY_TOP_Y = 290;
const BAY_BOT_Y = 408;

const POINT_E: Point2D = { x: BAY_LEFT_X, y: BAY_BOT_Y };
const POINT_F: Point2D = { x: BAY_RIGHT_X, y: BAY_BOT_Y };
const POINT_G: Point2D = { x: BAY_LEFT_X, y: BAY_TOP_Y };
const POINT_H: Point2D = { x: BAY_RIGHT_X, y: BAY_TOP_Y };

const BAY_HORIZONTAL_LINES_Y = [172, 290, 408, 526] as const;

// Figure 6 family of equal-radius circles centered along the horizontal guide line y = Y_GUIDE
const FAMILY_CIRCLE_CENTERS_X = [415, 450, 485, 520, 555, 590, 625, 660] as const;

const U_START_DEG = 45;
const U_END_DEG = 10;
const U_ASYMPTOTIC_START_DEG = 66;
const U_ASYMPTOTIC_END_DEG = 5;

const ENTRY_TURN_RADIUS = 128;
const EXIT_TURN_RADIUS = 140;

interface TractrixFrame {
  readonly centerX: number;
  readonly centerY: number;
  readonly headingDeg: number;
  readonly steerDeg: number;
  readonly cornerB: Point2D;
  readonly cornerC: Point2D;
  readonly cornerD: Point2D;
  readonly wheelRollDistance: number;
}

interface TractrixGeometrySample {
  readonly uDeg: number;
  readonly cornerB: Point2D;
  readonly cornerC: Point2D;
  readonly cornerD: Point2D;
  readonly centerX: number;
  readonly centerY: number;
}

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

function cubicHermite(t: number, t0: number, t1: number, y0: number, y1: number, v0: number, v1: number): number {
  const dt = t1 - t0;
  if (dt <= 0) {
    return y1;
  }
  const u = clamp01((t - t0) / dt);
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return h00 * y0 + h10 * (dt * v0) + h01 * y1 + h11 * (dt * v1);
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

function pulseFactor(seconds: number, centerTime: number, halfWidth: number = 0.6): number {
  const dist = Math.abs(seconds - centerTime);
  if (dist >= halfWidth) {
    return 0;
  }
  return Math.cos((dist / halfWidth) * (Math.PI * 0.5));
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Exact Figure 5 & Figure 6 orthogonal tractrix state parameterized by angle `uDeg`
 * between the car's guide edge BC and the horizontal guide line y = Y_GUIDE.
 * headingDeg = 90 + uDeg (180 = straight down in aisle; 90 = horizontal facing right in bay).
 */
function sampleTractrixGeometry(uDeg: number): TractrixGeometrySample {
  const u = degToRad(uDeg);
  const sinU = Math.sin(u);
  const cosU = Math.cos(u);

  const xB = X_0 - CAR_LENGTH * Math.log(Math.tan(u * 0.5));
  const yB = Y_GUIDE;
  const xC = xB - CAR_LENGTH * cosU;
  const yC = yB - CAR_LENGTH * sinU;

  // Opposite rear corner D sits perpendicular to BC by CAR_WIDTH toward the bay interior (above BC)
  const xD = xC + CAR_WIDTH * sinU;
  const yD = yC - CAR_WIDTH * cosU;

  const midBCx = (xB + xC) * 0.5;
  const midBCy = (yB + yC) * 0.5;

  return {
    uDeg,
    cornerB: { x: xB, y: yB },
    cornerC: { x: xC, y: yC },
    cornerD: { x: xD, y: yD },
    centerX: midBCx + HALF_CAR_W * sinU,
    centerY: midBCy - HALF_CAR_W * cosU,
  };
}

function solveTractrixUDegForCenterX(centerX: number): number {
  const tanHalf = Math.exp((X_0 - centerX) / CAR_LENGTH);
  return radToDeg(2 * Math.atan(tanHalf));
}

function buildUpperSemicircleArc(centerX: number, radius: number): string {
  const leftX = (centerX - radius).toFixed(2);
  const rightX = (centerX + radius).toFixed(2);
  const cy = Y_GUIDE.toFixed(2);
  const r = radius.toFixed(2);
  return `M ${leftX} ${cy} A ${r} ${r} 0 0 1 ${rightX} ${cy}`;
}

function cornersFromCenter(
  centerX: number,
  centerY: number,
  headingDeg: number,
): {
  readonly cornerB: Point2D;
  readonly cornerC: Point2D;
  readonly cornerD: Point2D;
} {
  const hRad = degToRad(headingDeg);
  const cosH = Math.cos(hRad);
  const sinH = Math.sin(hRad);
  return {
    cornerB: {
      x: centerX + HALF_CAR_W * cosH - -HALF_CAR_L * sinH,
      y: centerY + HALF_CAR_W * sinH + -HALF_CAR_L * cosH,
    },
    cornerC: {
      x: centerX + HALF_CAR_W * cosH - HALF_CAR_L * sinH,
      y: centerY + HALF_CAR_W * sinH + HALF_CAR_L * cosH,
    },
    cornerD: {
      x: centerX + -HALF_CAR_W * cosH - HALF_CAR_L * sinH,
      y: centerY + -HALF_CAR_W * sinH + HALF_CAR_L * cosH,
    },
  };
}

const ENTRY_START_SAMPLE = sampleTractrixGeometry(U_START_DEG);
const FINAL_END_SAMPLE = sampleTractrixGeometry(U_END_DEG);

// Phase 1 entry kinematics: driving straight down aisle -> full-lock left turn onto guide line at u = 45 deg
const ENTRY_REAR_AXLE: Point2D = {
  x: ENTRY_START_SAMPLE.centerX - HALF_WHEELBASE * Math.cos(degToRad(U_START_DEG)),
  y: ENTRY_START_SAMPLE.centerY - HALF_WHEELBASE * Math.sin(degToRad(U_START_DEG)),
};
const ENTRY_TURN_CENTER: Point2D = {
  x: ENTRY_REAR_AXLE.x + ENTRY_TURN_RADIUS * Math.sin(degToRad(U_START_DEG)),
  y: ENTRY_REAR_AXLE.y - ENTRY_TURN_RADIUS * Math.cos(degToRad(U_START_DEG)),
};
const ENTRY_STRAIGHT_DIST = 56;
const ENTRY_TURN_ARC_LEN = ENTRY_TURN_RADIUS * degToRad(90 - U_START_DEG); // 100.53
const ENTRY_TURN_STEER_DEG = -radToDeg(Math.atan2(WHEELBASE, ENTRY_TURN_RADIUS)); // -34.63 deg

// Phase 3 final bay alignment: hard-left turn from u = 10 deg -> u = 0 deg parallel inside bay EFGH
const EXIT_REAR_AXLE_START: Point2D = {
  x: FINAL_END_SAMPLE.centerX - HALF_WHEELBASE * Math.cos(degToRad(U_END_DEG)),
  y: FINAL_END_SAMPLE.centerY - HALF_WHEELBASE * Math.sin(degToRad(U_END_DEG)),
};
const EXIT_TURN_CENTER: Point2D = {
  x: EXIT_REAR_AXLE_START.x + EXIT_TURN_RADIUS * Math.sin(degToRad(U_END_DEG)),
  y: EXIT_REAR_AXLE_START.y - EXIT_TURN_RADIUS * Math.cos(degToRad(U_END_DEG)),
};
const EXIT_ARC_LEN = EXIT_TURN_RADIUS * degToRad(U_END_DEG); // 24.43
const EXIT_TURN_STEER_DEG = -radToDeg(Math.atan2(WHEELBASE, EXIT_TURN_RADIUS)); // -32.27 deg

const GUIDE_TOTAL_DIST = FINAL_END_SAMPLE.cornerB.x - ENTRY_START_SAMPLE.cornerB.x;

function computeTractrixUDeg(seconds: number): number {
  if (seconds <= 4.55) {
    return U_START_DEG;
  }
  if (seconds >= 11.4) {
    return U_END_DEG;
  }
  return cubicHermite(seconds, 4.55, 11.4, U_START_DEG, U_END_DEG, -9.5, -1.6);
}

function computeTractrixSteerDeg(uDeg: number): number {
  const icrOffsetFromCenterline = CAR_LENGTH / Math.tan(degToRad(uDeg)) - HALF_CAR_W;
  return -Math.min(38, radToDeg(Math.atan2(WHEELBASE, Math.max(1, icrOffsetFromCenterline))));
}

function computeSlide16Frame(seconds: number): TractrixFrame {
  // Phase 1A (0.00s - 1.45s): Straight down driving aisle (heading = 180 deg)
  if (seconds < 1.45) {
    const u = cubicHermite(seconds, 0.0, 1.45, 0, 1, 0, 1.16);
    const rx = ENTRY_TURN_CENTER.x - ENTRY_TURN_RADIUS;
    const ry = ENTRY_TURN_CENTER.y - ENTRY_STRAIGHT_DIST * (1 - u);
    const centerX = rx;
    const centerY = ry + HALF_WHEELBASE;
    const steerPrep = easeInOutCubic(progressBetween(seconds, 1.15, 1.45));
    const { cornerB, cornerC, cornerD } = cornersFromCenter(centerX, centerY, 180);
    return {
      centerX,
      centerY,
      headingDeg: 180,
      steerDeg: ENTRY_TURN_STEER_DEG * 0.35 * steerPrep,
      cornerB,
      cornerC,
      cornerD,
      wheelRollDistance: (ENTRY_STRAIGHT_DIST * u) / CAR_SCALE,
    };
  }

  // Phase 1B (1.45s - 4.55s): Full-lock left turn onto straight guide line EF (heading 180 -> 135 deg)
  if (seconds < 4.55) {
    const u = cubicHermite(seconds, 1.45, 4.55, 0, 1, 1.38, 0.59);
    const uDeg = 90 + (U_START_DEG - 90) * u;
    const uRad = degToRad(uDeg);
    const headingDeg = 90 + uDeg;
    const rx = ENTRY_TURN_CENTER.x - ENTRY_TURN_RADIUS * Math.sin(uRad);
    const ry = ENTRY_TURN_CENTER.y + ENTRY_TURN_RADIUS * Math.cos(uRad);
    const centerX = rx + HALF_WHEELBASE * Math.cos(uRad);
    const centerY = ry + HALF_WHEELBASE * Math.sin(uRad);

    const steerIn = easeInOutCubic(progressBetween(seconds, 1.45, 1.85));
    const tractrixBlend = easeInOutCubic(progressBetween(seconds, 4.2, 4.55));
    const targetTractrixSteer = computeTractrixSteerDeg(U_START_DEG);
    const entrySteer = ENTRY_TURN_STEER_DEG * (0.35 + 0.65 * steerIn);
    const steerDeg = entrySteer * (1 - tractrixBlend) + targetTractrixSteer * tractrixBlend;

    const { cornerB, cornerC, cornerD } = cornersFromCenter(centerX, centerY, headingDeg);
    return {
      centerX,
      centerY,
      headingDeg,
      steerDeg,
      cornerB,
      cornerC,
      cornerD,
      wheelRollDistance: (ENTRY_STRAIGHT_DIST + ENTRY_TURN_ARC_LEN * u) / CAR_SCALE,
    };
  }

  // Phase 2 (4.55s - 11.40s): Corner B tracks horizontal line EF while C traces the tractrix
  if (seconds < 11.4) {
    const currentUDeg = computeTractrixUDeg(seconds);
    const geom = sampleTractrixGeometry(currentUDeg);
    const steerDeg = computeTractrixSteerDeg(currentUDeg);
    const distanceAlongGuide = geom.cornerB.x - ENTRY_START_SAMPLE.cornerB.x;
    return {
      centerX: geom.centerX,
      centerY: geom.centerY,
      headingDeg: 90 + currentUDeg,
      steerDeg,
      cornerB: geom.cornerB,
      cornerC: geom.cornerC,
      cornerD: geom.cornerD,
      wheelRollDistance: (ENTRY_STRAIGHT_DIST + ENTRY_TURN_ARC_LEN + distanceAlongGuide) / CAR_SCALE,
    };
  }

  // Phase 3 (11.40s - 13.70s): Hard-left steer into exact center of bay EFGH (u = 10 -> 0 deg)
  const baseRoll = ENTRY_STRAIGHT_DIST + ENTRY_TURN_ARC_LEN + GUIDE_TOTAL_DIST;
  if (seconds < 13.7) {
    const u = cubicHermite(seconds, 11.4, 13.7, 0, 1, 2.05, 0);
    const uDeg = U_END_DEG * (1 - u);
    const uRad = degToRad(uDeg);
    const headingDeg = 90 + uDeg;
    const rx = EXIT_TURN_CENTER.x - EXIT_TURN_RADIUS * Math.sin(uRad);
    const ry = EXIT_TURN_CENTER.y + EXIT_TURN_RADIUS * Math.cos(uRad);
    const centerX = rx + HALF_WHEELBASE * Math.cos(uRad);
    const centerY = ry + HALF_WHEELBASE * Math.sin(uRad);

    const startSteer = computeTractrixSteerDeg(U_END_DEG);
    const lockIn = easeInOutCubic(progressBetween(seconds, 11.4, 11.8));
    const exitStraighten = 1 - easeInOutCubic(progressBetween(seconds, 13.15, 13.7));
    const steerDeg = (startSteer * (1 - lockIn) + EXIT_TURN_STEER_DEG * lockIn) * exitStraighten;

    const { cornerB, cornerC, cornerD } = cornersFromCenter(centerX, centerY, headingDeg);
    return {
      centerX,
      centerY,
      headingDeg,
      steerDeg,
      cornerB,
      cornerC,
      cornerD,
      wheelRollDistance: (baseRoll + EXIT_ARC_LEN * u) / CAR_SCALE,
    };
  }

  // Parked cleanly centered and parallel inside bay EFGH
  const finalCenterX = EXIT_TURN_CENTER.x + HALF_WHEELBASE;
  const finalCenterY = EXIT_TURN_CENTER.y + EXIT_TURN_RADIUS;
  const { cornerB, cornerC, cornerD } = cornersFromCenter(finalCenterX, finalCenterY, 90);
  return {
    centerX: finalCenterX,
    centerY: finalCenterY,
    headingDeg: 90,
    steerDeg: 0,
    cornerB,
    cornerC,
    cornerD,
    wheelRollDistance: (baseRoll + EXIT_ARC_LEN) / CAR_SCALE,
  };
}

function buildTheoreticalCurves(): {
  readonly tractrixGhost: string;
  readonly dPathGhost: string;
} {
  const cPts: string[] = [];
  const dPts: string[] = [];
  for (let deg = U_ASYMPTOTIC_START_DEG; deg >= U_ASYMPTOTIC_END_DEG; deg -= 1) {
    const sample = sampleTractrixGeometry(deg);
    cPts.push(`${sample.cornerC.x.toFixed(1)},${sample.cornerC.y.toFixed(1)}`);
    dPts.push(`${sample.cornerD.x.toFixed(1)},${sample.cornerD.y.toFixed(1)}`);
  }
  return {
    tractrixGhost: cPts.join(" "),
    dPathGhost: dPts.join(" "),
  };
}

const THEORETICAL_CURVES = buildTheoreticalCurves();

function buildSweptCurves(seconds: number): {
  readonly tractrixSwept: string;
  readonly dSwept: string;
} {
  if (seconds < 4.55) {
    return { tractrixSwept: "", dSwept: "" };
  }
  const endUDeg = computeTractrixUDeg(seconds);
  const cPts: string[] = [];
  const dPts: string[] = [];
  for (let deg = U_START_DEG; deg >= endUDeg; deg -= 1) {
    const sample = sampleTractrixGeometry(deg);
    cPts.push(`${sample.cornerC.x.toFixed(1)},${sample.cornerC.y.toFixed(1)}`);
    dPts.push(`${sample.cornerD.x.toFixed(1)},${sample.cornerD.y.toFixed(1)}`);
  }
  const exactEnd = sampleTractrixGeometry(endUDeg);
  cPts.push(`${exactEnd.cornerC.x.toFixed(1)},${exactEnd.cornerC.y.toFixed(1)}`);
  dPts.push(`${exactEnd.cornerD.x.toFixed(1)},${exactEnd.cornerD.y.toFixed(1)}`);
  return {
    tractrixSwept: cPts.join(" "),
    dSwept: dPts.join(" "),
  };
}

function buildOrthogonalRightAnglePath(uDeg: number): string {
  const geom = sampleTractrixGeometry(uDeg);
  const uRad = degToRad(uDeg);
  // Tractrix tangent points along C -> B: (cos u, sin u); circle tangent points along (-sin u, cos u)
  const tx = Math.cos(uRad);
  const ty = Math.sin(uRad);
  const nx = -Math.sin(uRad);
  const ny = Math.cos(uRad);
  const s = 7;
  const cx = geom.cornerC.x;
  const cy = geom.cornerC.y;

  return [
    `M ${(cx + tx * s).toFixed(1)} ${(cy + ty * s).toFixed(1)}`,
    `L ${(cx + tx * s + nx * s).toFixed(1)} ${(cy + ty * s + ny * s).toFixed(1)}`,
    `L ${(cx + nx * s).toFixed(1)} ${(cy + ny * s).toFixed(1)}`,
  ].join(" ");
}

export function Slide16Tractrix(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);
  const stageFadeIn = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.8));

  const frame = computeSlide16Frame(elapsedSeconds);
  const ackermann = computeAckermannAngles(frame.steerDeg, DEFAULT_VEHICLE_DIMENSIONS);
  const sweptCurves = useMemo(() => buildSweptCurves(elapsedSeconds), [elapsedSeconds]);

  // Narration-synced emphasis envelopes
  const guideHighlight = pulseEnvelope(elapsedSeconds, 4.5, 5.4, 7.6, 8.6);
  const bPulse = pulseFactor(elapsedSeconds, 6.2, 0.75);
  const cPulse = pulseFactor(elapsedSeconds, 9.0, 0.75);
  const tractrixGlow = Math.max(
    pulseEnvelope(elapsedSeconds, 8.6, 9.5, 13.6, 15.8),
    pulseEnvelope(elapsedSeconds, 13.8, 14.4, 16.0, 17.6) * 0.7,
  );
  const tractrixLabelOpacity = easeOutCubic(progressBetween(elapsedSeconds, 9.8, 11.0));
  const dClearanceOpacity = easeOutCubic(progressBetween(elapsedSeconds, 7.8, 9.2));

  const currentUDeg = computeTractrixUDeg(elapsedSeconds);
  const showLiveOrthogonalRadius = elapsedSeconds >= 4.55 && elapsedSeconds < 11.55;
  const liveOrthoCornerPath = buildOrthogonalRightAnglePath(currentUDeg);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">16</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Nose-First Bay Parking &amp; The Tractrix
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>
          Multi-storey carpark bay EFGH showing front corner B tracking horizontal guide line EF while rear corner C
          traces an orthogonal tractrix across a family of equal-radius circles and side AD clears corner G
        </title>
        <defs>
          <radialGradient id="slide16-ambient-glow" cx="54%" cy="50%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide16-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="slide16-deck-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="10%" stopColor="white" stopOpacity={1} />
            <stop offset="90%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="black" stopOpacity={0} />
          </linearGradient>

          <mask id="slide16-deck-fade-mask">
            <rect x={180} y={84} width={640} height={476} fill="url(#slide16-deck-fade-grad)" />
          </mask>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={490} cy={325} r={320} fill="url(#slide16-ambient-glow)" />

        {/* ================================================================
            MULTI-STOREY CARPARK DECK, VERTICAL AISLE & HORIZONTAL BAYS
           ================================================================ */}
        <g opacity={stageFadeIn} mask="url(#slide16-deck-fade-mask)">
          {/* Concrete Deck Floor */}
          <rect x={236} y={92} width={496} height={460} fill="oklch(0.165 0 0)" />

          {/* Left Structural Aisle Wall & Kerb */}
          <rect x={224} y={92} width={12} height={460} fill="oklch(0.25 0 0)" />
          <line x1={236} y1={92} x2={236} y2={552} stroke="oklch(0.64 0 0 / 0.5)" strokeWidth={1.4} />

          {/* Right Structural Concrete Wheel-Stop Wall */}
          <rect x={720} y={92} width={12} height={460} fill="oklch(0.26 0 0)" />
          <line x1={720} y1={92} x2={720} y2={552} stroke="oklch(0.68 0 0 / 0.55)" strokeWidth={1.5} />

          {/* Driving Aisle Centerline */}
          <line
            x1={398}
            y1={108}
            x2={398}
            y2={536}
            stroke="oklch(0.7 0 0 / 0.24)"
            strokeWidth={1.5}
            strokeDasharray="20 18"
          />

          {/* Horizontal Parking Bay Stall Divider Lines */}
          <g stroke="oklch(0.68 0 0 / 0.34)" strokeWidth={1.4}>
            {BAY_HORIZONTAL_LINES_Y.map((by) => (
              <line key={`bay-y-${by}`} x1={BAY_LEFT_X} y1={by} x2={BAY_RIGHT_X} y2={by} />
            ))}
          </g>

          {/* Highlighted Target Bay EFGH */}
          <rect
            x={BAY_LEFT_X}
            y={BAY_TOP_Y}
            width={BAY_RIGHT_X - BAY_LEFT_X}
            height={BAY_BOT_Y - BAY_TOP_Y}
            fill="oklch(0.95 0 0 / 0.04)"
            stroke="oklch(0.88 0 0 / 0.52)"
            strokeWidth={1.35}
          />

          {/* Neighboring Parked Cars Above GH & Below EF (Facing Nose-In Right) */}
          <g transform={`translate(625, 231) rotate(90) scale(${CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Left}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
          <g transform={`translate(625, 467) rotate(90) scale(${CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Left}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
        </g>

        {/* ================================================================
            FIGURE 6: FAMILY OF EQUAL-RADIUS CIRCLES CENTERED ON HORIZONTAL EF
           ================================================================ */}
        {elapsedSeconds >= 4.2 ? (
          <g>
            {FAMILY_CIRCLE_CENTERS_X.map((cx) => {
              const uAtCircleDeg = solveTractrixUDegForCenterX(cx);
              const isReached = elapsedSeconds >= 4.55 && currentUDeg <= uAtCircleDeg + 1.5;
              const appear = easeOutCubic(progressBetween(uAtCircleDeg + 2.5 - currentUDeg, 0, 7));
              const isActiveIntersection = uAtCircleDeg <= U_START_DEG && uAtCircleDeg >= U_END_DEG;

              if (!isReached || appear <= 0.01) {
                return null;
              }

              return (
                <g key={`fam-${cx}`} opacity={appear}>
                  <path
                    d={buildUpperSemicircleArc(cx, CAR_LENGTH)}
                    fill="none"
                    stroke="oklch(0.84 0 0 / 0.28)"
                    strokeWidth={1.15}
                    strokeDasharray="3 5"
                  />
                  <circle cx={cx} cy={Y_GUIDE} r={2.2} fill="oklch(0.86 0 0 / 0.55)" />
                  {isActiveIntersection && currentUDeg <= uAtCircleDeg ? (
                    <path
                      d={buildOrthogonalRightAnglePath(uAtCircleDeg)}
                      fill="none"
                      stroke="oklch(0.95 0 0 / 0.65)"
                      strokeWidth={1.15}
                    />
                  ) : null}
                </g>
              );
            })}
          </g>
        ) : null}

        {/* Straight Horizontal Guide Line Close to EF (y = Y_GUIDE) */}
        <line
          x1={296}
          y1={Y_GUIDE}
          x2={BAY_RIGHT_X}
          y2={Y_GUIDE}
          stroke={`oklch(0.96 0 0 / ${(0.34 + 0.66 * guideHighlight).toFixed(2)})`}
          strokeWidth={1.5 + 0.9 * guideHighlight}
          strokeDasharray="5 5"
          opacity={stageFadeIn}
          filter={guideHighlight > 0.2 ? "url(#slide16-luminous-glow)" : undefined}
        />

        {/* Faint Theoretical Extensions of Figure 6 Tractrix & Path of D */}
        {elapsedSeconds >= 7.5 ? (
          <g opacity={easeOutCubic(progressBetween(elapsedSeconds, 7.5, 9.2)) * 0.24}>
            <polyline
              points={THEORETICAL_CURVES.tractrixGhost}
              fill="none"
              stroke="oklch(0.9 0 0)"
              strokeWidth={1.2}
              strokeDasharray="3 4"
            />
            <polyline
              points={THEORETICAL_CURVES.dPathGhost}
              fill="none"
              stroke="oklch(0.8 0 0)"
              strokeWidth={1.1}
              strokeDasharray="2 4"
            />
          </g>
        ) : null}

        {/* Live Instantaneous Orthogonal Circle & Radius Segment B -> C */}
        {showLiveOrthogonalRadius ? (
          <g>
            <path
              d={buildUpperSemicircleArc(frame.cornerB.x, CAR_LENGTH)}
              fill="none"
              stroke="oklch(0.92 0 0 / 0.36)"
              strokeWidth={1.25}
            />
            <line
              x1={frame.cornerB.x}
              y1={frame.cornerB.y}
              x2={frame.cornerC.x}
              y2={frame.cornerC.y}
              stroke="oklch(0.96 0 0 / 0.72)"
              strokeWidth={1.4}
              strokeDasharray="4 4"
            />
            <path d={liveOrthoCornerPath} fill="none" stroke="oklch(0.98 0 0 / 0.88)" strokeWidth={1.35} />
          </g>
        ) : null}

        {/* ================================================================
            COMPANION CLEARANCE PATH OF D (CLEARING G) & SWEPT TRACTRIX OF C
           ================================================================ */}
        {sweptCurves.dSwept ? (
          <polyline
            points={sweptCurves.dSwept}
            fill="none"
            stroke="oklch(0.84 0 0 / 0.68)"
            strokeWidth={1.55}
            strokeDasharray="5 4"
            opacity={dClearanceOpacity}
          />
        ) : null}

        {sweptCurves.tractrixSwept ? (
          <polyline
            points={sweptCurves.tractrixSwept}
            fill="none"
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.4 + 0.75 * tractrixGlow}
            strokeLinecap="round"
            filter="url(#slide16-luminous-glow)"
          />
        ) : null}

        {tractrixLabelOpacity > 0.01 ? (
          <text
            x={392}
            y={366}
            textAnchor="end"
            opacity={tractrixLabelOpacity}
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-xs font-semibold tracking-mono"
          >
            TRACTRIX
          </text>
        ) : null}

        {/* ================================================================
            HERO 2D CUT-PLANE CAR TURNING NOSE-FIRST INTO BAY EFGH
           ================================================================ */}
        <g transform={`translate(${frame.centerX}, ${frame.centerY}) rotate(${frame.headingDeg}) scale(${CAR_SCALE})`}>
          <CutPlaneCar
            variant={CarSectionVariants.Hero}
            kerbSide={KerbSides.Left}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={true}
            frontLeftSteerDeg={ackermann.frontLeftSteerDeg}
            frontRightSteerDeg={ackermann.frontRightSteerDeg}
            wheelRollDistance={frame.wheelRollDistance}
            isReversing={false}
            isBraking={elapsedSeconds >= 13.15}
          />
        </g>

        {/* ================================================================
            BAY CORNERS E, F, G, H & LIVE CORNERS B, C, D
           ================================================================ */}
        <g opacity={stageFadeIn} className="font-mono text-xs font-semibold">
          <circle cx={POINT_E.x} cy={POINT_E.y} r={3} fill="oklch(0.86 0 0)" />
          <text x={POINT_E.x - 10} y={POINT_E.y + 16} textAnchor="end" className="fill-text-secondary">
            E
          </text>

          <circle cx={POINT_F.x} cy={POINT_F.y} r={3} fill="oklch(0.86 0 0)" />
          <text x={POINT_F.x + 16} y={POINT_F.y + 15} textAnchor="start" className="fill-text-secondary">
            F
          </text>

          <circle cx={POINT_G.x} cy={POINT_G.y} r={3.4} fill="oklch(0.92 0 0)" />
          <text x={POINT_G.x - 10} y={POINT_G.y - 6} textAnchor="end" className="fill-text-primary">
            G
          </text>

          <circle cx={POINT_H.x} cy={POINT_H.y} r={3} fill="oklch(0.86 0 0)" />
          <text x={POINT_H.x + 16} y={POINT_H.y - 6} textAnchor="start" className="fill-text-secondary">
            H
          </text>
        </g>

        {/* Live Front Corner B Tracking Horizontal Guide Line EF */}
        <g transform={`translate(${frame.cornerB.x}, ${frame.cornerB.y})`} opacity={stageFadeIn}>
          {bPulse > 0.04 ? (
            <circle
              cx={0}
              cy={0}
              r={8 + 8 * bPulse}
              fill="none"
              stroke="oklch(0.99 0 0)"
              strokeWidth={1.3}
              opacity={bPulse}
            />
          ) : null}
          <circle cx={0} cy={0} r={4.2 + 1.4 * bPulse} fill="oklch(0.99 0 0)" filter="url(#slide16-luminous-glow)" />
          <text
            x={8}
            y={18}
            textAnchor="start"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
          >
            B
          </text>
        </g>

        {/* Live Rear Corner C Tracing the Orthogonal Tractrix */}
        <g transform={`translate(${frame.cornerC.x}, ${frame.cornerC.y})`} opacity={stageFadeIn}>
          {cPulse > 0.04 ? (
            <circle
              cx={0}
              cy={0}
              r={8 + 8 * cPulse}
              fill="none"
              stroke="oklch(0.99 0 0)"
              strokeWidth={1.3}
              opacity={cPulse}
            />
          ) : null}
          <circle cx={0} cy={0} r={4.2 + 1.4 * cPulse} fill="oklch(0.99 0 0)" filter="url(#slide16-luminous-glow)" />
          <text
            x={-14}
            y={12}
            textAnchor="end"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
          >
            C
          </text>
        </g>

        {/* Live Opposite Rear Corner D Clearing G */}
        {dClearanceOpacity > 0.01 ? (
          <g transform={`translate(${frame.cornerD.x}, ${frame.cornerD.y})`} opacity={dClearanceOpacity}>
            <circle cx={0} cy={0} r={3.2} fill="oklch(0.88 0 0)" />
            <text
              x={10}
              y={-10}
              textAnchor="start"
              stroke="oklch(0.15 0 0 / 0.94)"
              strokeWidth={4}
              strokeLinejoin="round"
              className="svg-label-halo fill-text-secondary font-mono text-xs font-semibold"
            >
              D
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
