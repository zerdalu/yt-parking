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

const CAR_SCALE = 0.8;
const CAR_LENGTH = DEFAULT_VEHICLE_DIMENSIONS.length * CAR_SCALE; // 134.4
const CAR_WIDTH = DEFAULT_VEHICLE_DIMENSIONS.width * CAR_SCALE; // 60.8
const HALF_CAR_W = CAR_WIDTH * 0.5; // 30.4
const WHEELBASE = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * CAR_SCALE; // 83.2
const HALF_WHEELBASE = WHEELBASE * 0.5; // 41.6

// Multi-storey carpark bay EFGH geometry & vertical straight guide line EF
const X_GUIDE = 540;
const Y_0 = 446;
const BAY_WIDTH = 90;
const BAY_TOP_Y = 95;
const BAY_BOT_Y = 272;

const POINT_E: Point2D = { x: X_GUIDE, y: BAY_TOP_Y };
const POINT_F: Point2D = { x: X_GUIDE, y: BAY_BOT_Y };
const POINT_G: Point2D = { x: X_GUIDE + BAY_WIDTH, y: BAY_BOT_Y };
const POINT_H: Point2D = { x: X_GUIDE + BAY_WIDTH, y: BAY_TOP_Y };

const BAY_DIVIDERS_X = [270, 360, 450, 540, 630, 720, 810] as const;
const FAMILY_CIRCLE_ANGLES_DEG = [50, 44, 38, 32, 26, 20] as const;

const U_START_DEG = 52;
const U_END_DEG = 20;

const ENTRY_TURN_RADIUS = 145;
const EXIT_TURN_RADIUS = 160;
const EXIT_PEAK_HEADING_DEG = 32;

interface TractrixFrame {
  readonly centerX: number;
  readonly centerY: number;
  readonly headingDeg: number;
  readonly steerDeg: number;
  readonly cornerB: Point2D;
  readonly cornerC: Point2D;
  readonly wheelRollDistance: number;
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
 * Exact orthogonal tractrix state parameterized by angle `uDeg` between car side BC
 * and straight vertical guide line EF (x = X_GUIDE).
 */
function sampleTractrixGeometry(uDeg: number): {
  readonly cornerB: Point2D;
  readonly cornerC: Point2D;
  readonly centerX: number;
  readonly centerY: number;
} {
  const u = degToRad(uDeg);
  const sinU = Math.sin(u);
  const cosU = Math.cos(u);
  const yB = Y_0 + CAR_LENGTH * Math.log(Math.tan(u * 0.5));
  const xC = X_GUIDE - CAR_LENGTH * sinU;
  const yC = yB + CAR_LENGTH * cosU;

  const midX = (X_GUIDE + xC) * 0.5;
  const midY = (yB + yC) * 0.5;

  return {
    cornerB: { x: X_GUIDE, y: yB },
    cornerC: { x: xC, y: yC },
    centerX: midX + HALF_CAR_W * cosU,
    centerY: midY + HALF_CAR_W * sinU,
  };
}

function buildLeftSemicircleArc(center: Point2D, radius: number): string {
  const topY = (center.y - radius).toFixed(2);
  const botY = (center.y + radius).toFixed(2);
  const cx = center.x.toFixed(2);
  const r = radius.toFixed(2);
  return `M ${cx} ${topY} A ${r} ${r} 0 0 0 ${cx} ${botY}`;
}

function cornersFromCenter(
  centerX: number,
  centerY: number,
  headingDeg: number,
): {
  readonly cornerB: Point2D;
  readonly cornerC: Point2D;
} {
  const hRad = degToRad(headingDeg);
  const cosH = Math.cos(hRad);
  const sinH = Math.sin(hRad);
  return {
    cornerB: {
      x: centerX + -HALF_CAR_W * cosH - -(CAR_LENGTH * 0.5) * sinH,
      y: centerY + -HALF_CAR_W * sinH + -(CAR_LENGTH * 0.5) * cosH,
    },
    cornerC: {
      x: centerX + -HALF_CAR_W * cosH - CAR_LENGTH * 0.5 * sinH,
      y: centerY + -HALF_CAR_W * sinH + CAR_LENGTH * 0.5 * cosH,
    },
  };
}

const ENTRY_START_SAMPLE = sampleTractrixGeometry(U_START_DEG);
const FINAL_END_SAMPLE = sampleTractrixGeometry(U_END_DEG);

// Non-holonomic Phase 1 entry kinematics (straight aisle -> left turn onto tractrix entry at 52 deg)
const ENTRY_REAR_AXLE: Point2D = {
  x: ENTRY_START_SAMPLE.centerX - HALF_WHEELBASE * Math.sin(degToRad(U_START_DEG)),
  y: ENTRY_START_SAMPLE.centerY + HALF_WHEELBASE * Math.cos(degToRad(U_START_DEG)),
};
const ENTRY_TURN_CENTER: Point2D = {
  x: ENTRY_REAR_AXLE.x - ENTRY_TURN_RADIUS * Math.cos(degToRad(U_START_DEG)),
  y: ENTRY_REAR_AXLE.y - ENTRY_TURN_RADIUS * Math.sin(degToRad(U_START_DEG)),
};
const ENTRY_STRAIGHT_DIST = 64;
const ENTRY_TURN_ARC_LEN = ENTRY_TURN_RADIUS * degToRad(90 - U_START_DEG);
const ENTRY_TURN_STEER_DEG = -radToDeg(Math.atan2(WHEELBASE, ENTRY_TURN_RADIUS));

// Non-holonomic Phase 3 bay-centering kinematics (20 deg -> 32 deg -> 0 deg inside EFGH)
const EXIT_REAR_AXLE_START: Point2D = {
  x: FINAL_END_SAMPLE.centerX - HALF_WHEELBASE * Math.sin(degToRad(U_END_DEG)),
  y: FINAL_END_SAMPLE.centerY + HALF_WHEELBASE * Math.cos(degToRad(U_END_DEG)),
};
const EXIT_RIGHT_CENTER: Point2D = {
  x: EXIT_REAR_AXLE_START.x + EXIT_TURN_RADIUS * Math.cos(degToRad(U_END_DEG)),
  y: EXIT_REAR_AXLE_START.y + EXIT_TURN_RADIUS * Math.sin(degToRad(U_END_DEG)),
};
const EXIT_REAR_AXLE_PEAK: Point2D = {
  x: EXIT_RIGHT_CENTER.x - EXIT_TURN_RADIUS * Math.cos(degToRad(EXIT_PEAK_HEADING_DEG)),
  y: EXIT_RIGHT_CENTER.y - EXIT_TURN_RADIUS * Math.sin(degToRad(EXIT_PEAK_HEADING_DEG)),
};
const EXIT_LEFT_CENTER: Point2D = {
  x: EXIT_REAR_AXLE_PEAK.x + EXIT_TURN_RADIUS * Math.cos(degToRad(EXIT_PEAK_HEADING_DEG)),
  y: EXIT_REAR_AXLE_PEAK.y + EXIT_TURN_RADIUS * Math.sin(degToRad(EXIT_PEAK_HEADING_DEG)),
};
const EXIT_ARC_1_LEN = EXIT_TURN_RADIUS * degToRad(EXIT_PEAK_HEADING_DEG - U_END_DEG);
const EXIT_ARC_2_LEN = EXIT_TURN_RADIUS * degToRad(EXIT_PEAK_HEADING_DEG);
const EXIT_TURN_STEER_DEG = radToDeg(Math.atan2(WHEELBASE, EXIT_TURN_RADIUS));

const GUIDE_TOTAL_DIST = ENTRY_START_SAMPLE.cornerB.y - FINAL_END_SAMPLE.cornerB.y;

function computeTractrixUDeg(seconds: number): number {
  if (seconds <= 4.55) {
    return U_START_DEG;
  }
  if (seconds >= 11.4) {
    return U_END_DEG;
  }
  return cubicHermite(seconds, 4.55, 11.4, U_START_DEG, U_END_DEG, -6.4, -2.8);
}

function computeTractrixSteerDeg(uDeg: number): number {
  const tanU = Math.tan(degToRad(uDeg));
  const icrOffset = HALF_CAR_W + CAR_LENGTH / tanU;
  const frontAxleToIcrY = CAR_LENGTH * 0.5 + HALF_WHEELBASE; // 108.8
  return -Math.min(38, radToDeg(Math.atan2(frontAxleToIcrY, icrOffset)));
}

function computeSlide16Frame(seconds: number): TractrixFrame {
  // Phase 1A (0.00s - 1.65s): Straight drive along aisle (heading = 90 deg, steer = 0 deg)
  if (seconds < 1.65) {
    const u = cubicHermite(seconds, 0.0, 1.65, 0, 1, 0, 0.9);
    const rx = ENTRY_TURN_CENTER.x - ENTRY_STRAIGHT_DIST * (1 - u);
    const ry = ENTRY_TURN_CENTER.y + ENTRY_TURN_RADIUS;
    const centerX = rx + HALF_WHEELBASE;
    const centerY = ry;
    const { cornerB, cornerC } = cornersFromCenter(centerX, centerY, 90);
    return {
      centerX,
      centerY,
      headingDeg: 90,
      steerDeg: 0,
      cornerB,
      cornerC,
      wheelRollDistance: (ENTRY_STRAIGHT_DIST * u) / CAR_SCALE,
    };
  }

  // Phase 1B (1.65s - 4.55s): True Ackermann circular arc turning left 90 deg -> 52 deg onto guide line EF
  if (seconds < 4.55) {
    const u = cubicHermite(seconds, 1.65, 4.55, 0, 1, 1.05, 0.57);
    const headingDeg = 90 + (U_START_DEG - 90) * u;
    const hRad = degToRad(headingDeg);
    const rx = ENTRY_TURN_CENTER.x + ENTRY_TURN_RADIUS * Math.cos(hRad);
    const ry = ENTRY_TURN_CENTER.y + ENTRY_TURN_RADIUS * Math.sin(hRad);
    const centerX = rx + HALF_WHEELBASE * Math.sin(hRad);
    const centerY = ry - HALF_WHEELBASE * Math.cos(hRad);
    const steerIn = easeInOutCubic(progressBetween(seconds, 1.65, 2.1));
    const entryTractrixBlend = easeInOutCubic(progressBetween(seconds, 4.25, 4.55));
    const targetTractrixSteer = computeTractrixSteerDeg(U_START_DEG);
    const steerDeg =
      ENTRY_TURN_STEER_DEG * steerIn * (1 - entryTractrixBlend) + targetTractrixSteer * entryTractrixBlend;
    const { cornerB, cornerC } = cornersFromCenter(centerX, centerY, headingDeg);
    return {
      centerX,
      centerY,
      headingDeg,
      steerDeg,
      cornerB,
      cornerC,
      wheelRollDistance: (ENTRY_STRAIGHT_DIST + ENTRY_TURN_ARC_LEN * u) / CAR_SCALE,
    };
  }

  // Phase 2 (4.55s - 11.40s): Corner B tracks vertical line EF while rear corner C traces the orthogonal tractrix
  if (seconds < 11.4) {
    const currentUDeg = computeTractrixUDeg(seconds);
    const geom = sampleTractrixGeometry(currentUDeg);
    const steerDeg = computeTractrixSteerDeg(currentUDeg);
    const distanceAlongGuide = ENTRY_START_SAMPLE.cornerB.y - geom.cornerB.y;
    return {
      centerX: geom.centerX,
      centerY: geom.centerY,
      headingDeg: currentUDeg,
      steerDeg,
      cornerB: geom.cornerB,
      cornerC: geom.cornerC,
      wheelRollDistance: (ENTRY_STRAIGHT_DIST + ENTRY_TURN_ARC_LEN + distanceAlongGuide) / CAR_SCALE,
    };
  }

  // Phase 3A (11.40s - 12.40s): True Ackermann right swing 20 deg -> 32 deg to center inside bay EFGH
  const baseRoll = ENTRY_STRAIGHT_DIST + ENTRY_TURN_ARC_LEN + GUIDE_TOTAL_DIST;
  if (seconds < 12.4) {
    const u = cubicHermite(seconds, 11.4, 12.4, 0, 1, 0.57, 0.96);
    const headingDeg = U_END_DEG + (EXIT_PEAK_HEADING_DEG - U_END_DEG) * u;
    const hRad = degToRad(headingDeg);
    const rx = EXIT_RIGHT_CENTER.x - EXIT_TURN_RADIUS * Math.cos(hRad);
    const ry = EXIT_RIGHT_CENTER.y - EXIT_TURN_RADIUS * Math.sin(hRad);
    const centerX = rx + HALF_WHEELBASE * Math.sin(hRad);
    const centerY = ry - HALF_WHEELBASE * Math.cos(hRad);
    const startSteer = computeTractrixSteerDeg(U_END_DEG);
    const steerBlend = easeInOutCubic(progressBetween(seconds, 11.4, 11.85));
    const steerDeg = startSteer * (1 - steerBlend) + EXIT_TURN_STEER_DEG * steerBlend;
    const { cornerB, cornerC } = cornersFromCenter(centerX, centerY, headingDeg);
    return {
      centerX,
      centerY,
      headingDeg,
      steerDeg,
      cornerB,
      cornerC,
      wheelRollDistance: (baseRoll + EXIT_ARC_1_LEN * u) / CAR_SCALE,
    };
  }

  // Phase 3B (12.40s - 14.80s): True Ackermann left straighten 32 deg -> 0 deg cleanly inside bay EFGH
  if (seconds < 14.8) {
    const u = cubicHermite(seconds, 12.4, 14.8, 0, 1, 0.84, 0);
    const headingDeg = EXIT_PEAK_HEADING_DEG * (1 - u);
    const hRad = degToRad(headingDeg);
    const rx = EXIT_LEFT_CENTER.x - EXIT_TURN_RADIUS * Math.cos(hRad);
    const ry = EXIT_LEFT_CENTER.y - EXIT_TURN_RADIUS * Math.sin(hRad);
    const centerX = rx + HALF_WHEELBASE * Math.sin(hRad);
    const centerY = ry - HALF_WHEELBASE * Math.cos(hRad);
    const flipBlend = easeInOutCubic(progressBetween(seconds, 12.4, 12.85));
    const exitStraighten = 1 - easeInOutCubic(progressBetween(seconds, 14.35, 14.8));
    const steerDeg = (EXIT_TURN_STEER_DEG * (1 - flipBlend) - EXIT_TURN_STEER_DEG * flipBlend) * exitStraighten;
    const { cornerB, cornerC } = cornersFromCenter(centerX, centerY, headingDeg);
    return {
      centerX,
      centerY,
      headingDeg,
      steerDeg,
      cornerB,
      cornerC,
      wheelRollDistance: (baseRoll + EXIT_ARC_1_LEN + EXIT_ARC_2_LEN * u) / CAR_SCALE,
    };
  }

  // Parked cleanly parallel inside bay EFGH
  const finalCenterX = EXIT_LEFT_CENTER.x - EXIT_TURN_RADIUS;
  const finalCenterY = EXIT_LEFT_CENTER.y - HALF_WHEELBASE;
  const { cornerB, cornerC } = cornersFromCenter(finalCenterX, finalCenterY, 0);
  return {
    centerX: finalCenterX,
    centerY: finalCenterY,
    headingDeg: 0,
    steerDeg: 0,
    cornerB,
    cornerC,
    wheelRollDistance: (baseRoll + EXIT_ARC_1_LEN + EXIT_ARC_2_LEN) / CAR_SCALE,
  };
}

function buildTractrixCurvePolyline(seconds: number): string {
  if (seconds < 4.55) {
    return "";
  }
  const endUDeg = computeTractrixUDeg(seconds);
  const points: string[] = [];
  const stepDeg = 1.2;

  for (let deg = U_START_DEG; deg >= endUDeg; deg -= stepDeg) {
    const pt = sampleTractrixGeometry(deg).cornerC;
    points.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
  }

  const exactEnd = sampleTractrixGeometry(endUDeg).cornerC;
  points.push(`${exactEnd.x.toFixed(1)},${exactEnd.y.toFixed(1)}`);
  return points.join(" ");
}

export function Slide16Tractrix(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);
  const stageFadeIn = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.8));

  const frame = computeSlide16Frame(elapsedSeconds);
  const ackermann = computeAckermannAngles(frame.steerDeg, DEFAULT_VEHICLE_DIMENSIONS);
  const tractrixPolyline = useMemo(() => buildTractrixCurvePolyline(elapsedSeconds), [elapsedSeconds]);

  // Progressive visual highlights aligned to narration
  const guideHighlight = pulseEnvelope(elapsedSeconds, 4.5, 5.2, 7.6, 8.5);
  const bPulse = pulseFactor(elapsedSeconds, 6.2, 0.7);
  const cPulse = pulseFactor(elapsedSeconds, 9.0, 0.7);
  const tractrixGlow = pulseEnvelope(elapsedSeconds, 8.6, 9.5, 14.5, 17.5);
  const tractrixLabelOpacity = easeOutCubic(progressBetween(elapsedSeconds, 9.8, 10.9));

  // Progress of uDeg along the tractrix for revealing the family of orthogonal circles
  const currentUDeg = computeTractrixUDeg(elapsedSeconds);
  const showLiveOrthogonalRadius = elapsedSeconds >= 4.55 && elapsedSeconds < 11.65;

  // Orthogonal right-angle marker between live tangent radius C->B and circle arc at C
  const liveU = degToRad(currentUDeg);
  const tangentDirX = Math.sin(liveU);
  const tangentDirY = -Math.cos(liveU);
  const orthoPerpX = tangentDirY;
  const orthoPerpY = -tangentDirX;
  const tickLen = 9;
  const liveOrthoCornerPath = [
    `M ${(frame.cornerC.x + tangentDirX * tickLen).toFixed(1)} ${(frame.cornerC.y + tangentDirY * tickLen).toFixed(1)}`,
    `L ${(frame.cornerC.x + tangentDirX * tickLen + orthoPerpX * tickLen).toFixed(1)} ${(frame.cornerC.y + tangentDirY * tickLen + orthoPerpY * tickLen).toFixed(1)}`,
    `L ${(frame.cornerC.x + orthoPerpX * tickLen).toFixed(1)} ${(frame.cornerC.y + orthoPerpY * tickLen).toFixed(1)}`,
  ].join(" ");

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
          Multi-storey carpark bay EFGH showing front corner B tracking straight guide line EF while rear corner C
          traces an orthogonal tractrix across a family of circles
        </title>
        <defs>
          <radialGradient id="slide16-ambient-glow" cx="52%" cy="48%" r="54%">
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

          <linearGradient id="slide16-floor-fade-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="12%" stopColor="white" stopOpacity={1} />
            <stop offset="88%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="black" stopOpacity={0} />
          </linearGradient>

          <mask id="slide16-floor-fade-mask">
            <rect x={140} y={40} width={740} height={510} fill="url(#slide16-floor-fade-grad)" />
          </mask>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={305} r={315} fill="url(#slide16-ambient-glow)" />

        {/* ================================================================
            MULTI-STOREY CARPARK FLOOR & PERPENDICULAR BAYS
           ================================================================ */}
        <g opacity={stageFadeIn} mask="url(#slide16-floor-fade-mask)">
          {/* Concrete Carpark Deck */}
          <rect x={160} y={84} width={700} height={446} fill="oklch(0.165 0 0)" />

          {/* Top Structural Concrete Wheel-Stop Kerb */}
          <rect x={160} y={84} width={700} height={11} fill="oklch(0.26 0 0)" />
          <line x1={160} y1={95} x2={860} y2={95} stroke="oklch(0.68 0 0 / 0.55)" strokeWidth={1.5} />

          {/* Bottom Driving Aisle Centerline */}
          <line
            x1={180}
            y1={426}
            x2={840}
            y2={426}
            stroke="oklch(0.7 0 0 / 0.25)"
            strokeWidth={1.5}
            strokeDasharray="20 18"
          />

          {/* Parking Bay Stall Divider Lines */}
          <g stroke="oklch(0.68 0 0 / 0.34)" strokeWidth={1.4}>
            {BAY_DIVIDERS_X.map((bx) => (
              <line key={`bay-${bx}`} x1={bx} y1={BAY_TOP_Y} x2={bx} y2={BAY_BOT_Y} />
            ))}
          </g>

          {/* Highlighted Target Bay EFGH */}
          <rect
            x={X_GUIDE}
            y={BAY_TOP_Y}
            width={BAY_WIDTH}
            height={BAY_BOT_Y - BAY_TOP_Y}
            fill="oklch(0.95 0 0 / 0.04)"
            stroke="oklch(0.88 0 0 / 0.5)"
            strokeWidth={1.3}
          />

          {/* Neighboring Parked Cars in Multi-Storey Bays */}
          <g transform={`translate(315, 184) scale(${CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
          <g transform={`translate(675, 184) scale(${CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
          <g transform={`translate(765, 184) scale(${CAR_SCALE})`}>
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
            FIGURE 6: FAMILY OF SEMICIRCULAR ARCS CENTERED ALONG GUIDE LINE EF
           ================================================================ */}
        {elapsedSeconds >= 4.55 ? (
          <g>
            {FAMILY_CIRCLE_ANGLES_DEG.map((deg) => {
              const centerB = sampleTractrixGeometry(deg).cornerB;
              const isReached = currentUDeg <= deg + 1;
              const appear = easeOutCubic(progressBetween(deg + 2 - currentUDeg, 0, 8));
              if (!isReached || appear <= 0.01) {
                return null;
              }
              return (
                <g key={`fam-${deg}`} opacity={appear}>
                  <path
                    d={buildLeftSemicircleArc(centerB, CAR_LENGTH)}
                    fill="none"
                    stroke="oklch(0.84 0 0 / 0.28)"
                    strokeWidth={1.15}
                    strokeDasharray="3 5"
                  />
                  <circle cx={centerB.x} cy={centerB.y} r={2.2} fill="oklch(0.84 0 0 / 0.55)" />
                </g>
              );
            })}
          </g>
        ) : null}

        {/* Straight Guide Line Extension Along EF */}
        <line
          x1={X_GUIDE}
          y1={BAY_TOP_Y}
          x2={X_GUIDE}
          y2={438}
          stroke={`oklch(0.96 0 0 / ${(0.35 + 0.65 * guideHighlight).toFixed(2)})`}
          strokeWidth={1.5 + 0.9 * guideHighlight}
          strokeDasharray="5 5"
          opacity={stageFadeIn}
          filter={guideHighlight > 0.2 ? "url(#slide16-luminous-glow)" : undefined}
        />

        {/* Live Orthogonal Radius Segment B -> C & Right-Angle Tick */}
        {showLiveOrthogonalRadius ? (
          <g>
            <path
              d={buildLeftSemicircleArc(frame.cornerB, CAR_LENGTH)}
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
            <path d={liveOrthoCornerPath} fill="none" stroke="oklch(0.98 0 0 / 0.85)" strokeWidth={1.3} />
          </g>
        ) : null}

        {/* ================================================================
            SWEPT ORTHOGONAL TRACTRIX CURVE TRACED BY CORNER C
           ================================================================ */}
        {tractrixPolyline ? (
          <polyline
            points={tractrixPolyline}
            fill="none"
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.4 + 0.7 * tractrixGlow}
            strokeLinecap="round"
            filter="url(#slide16-luminous-glow)"
          />
        ) : null}

        {tractrixLabelOpacity > 0.01 ? (
          <text
            x={386}
            y={362}
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
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={true}
            frontLeftSteerDeg={ackermann.frontLeftSteerDeg}
            frontRightSteerDeg={ackermann.frontRightSteerDeg}
            wheelRollDistance={frame.wheelRollDistance}
            isReversing={false}
            isBraking={elapsedSeconds >= 14.3}
          />
        </g>

        {/* ================================================================
            BAY CORNERS E, F, G, H & LIVE CORNERS B, C
           ================================================================ */}
        <g opacity={stageFadeIn} className="font-mono text-xs font-semibold">
          <circle cx={POINT_E.x} cy={POINT_E.y} r={3} fill="oklch(0.86 0 0)" />
          <text x={POINT_E.x - 10} y={POINT_E.y - 6} textAnchor="end" className="fill-text-secondary">
            E
          </text>

          <circle cx={POINT_F.x} cy={POINT_F.y} r={3} fill="oklch(0.86 0 0)" />
          <text x={POINT_F.x + 10} y={POINT_F.y + 15} textAnchor="start" className="fill-text-secondary">
            F
          </text>

          <circle cx={POINT_G.x} cy={POINT_G.y} r={3} fill="oklch(0.86 0 0)" />
          <text x={POINT_G.x + 8} y={POINT_G.y + 15} textAnchor="start" className="fill-text-secondary">
            G
          </text>

          <circle cx={POINT_H.x} cy={POINT_H.y} r={3} fill="oklch(0.86 0 0)" />
          <text x={POINT_H.x + 8} y={POINT_H.y - 6} textAnchor="start" className="fill-text-secondary">
            H
          </text>
        </g>

        {/* Live Front Corner B Tracking Straight Line EF */}
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
            x={14}
            y={4}
            textAnchor="start"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
          >
            B
          </text>
        </g>

        {/* Live Rear Corner C Tracing the Tractrix */}
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
      </svg>
    </div>
  );
}
