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

const HALF_W = DEFAULT_VEHICLE_DIMENSIONS.width * 0.5; // 38
const HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5; // 84
const TRACK_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth; // 31
const WHEEL_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5; // 52
const WHEELBASE_PX = DEFAULT_VEHICLE_DIMENSIONS.wheelbase; // 104

// Right-hand-traffic Figure 2 geometry centered cleanly above the bottom formula card
const PARALLEL_CENTER_X = 636;
const PARALLEL_CENTER_Y = 342;
const REAR_AXLE_Y = PARALLEL_CENTER_Y + WHEEL_HALF_L; // 394
const TURNING_CENTER: Point2D = { x: 436, y: REAR_AXLE_Y }; // (436, 394)

const KERB_LINE_X = PARALLEL_CENTER_X + HALF_W; // 674
const KERB_STONE_X = 678;
const PARKING_LINE_X = 594;
const LANE_DIVIDER_X = 468;
const ASPHALT_LEFT_X = 342;

// Exact concentric radii around turning center X(436, 394)
const RADIUS_FX = PARALLEL_CENTER_X + TRACK_HALF_W - TURNING_CENTER.x; // 231
const RADIUS_EX = Math.hypot(RADIUS_FX, -WHEELBASE_PX); // 253.332
const RADIUS_AX = Math.hypot(KERB_LINE_X - TURNING_CENTER.x, PARALLEL_CENTER_Y - HALF_L - TURNING_CENTER.y); // 274.117

const R_TURN_SIGNED = -(PARALLEL_CENTER_X - TURNING_CENTER.x); // -200
const FULL_LOCK_DEG = -((Math.atan2(WHEELBASE_PX, Math.abs(R_TURN_SIGNED)) * 180) / Math.PI); // -27.474 deg

// Front parked car rear-left corner G positioned on the exact outer turning circle
const POINT_G_X = PARALLEL_CENTER_X - HALF_W; // 598
const POINT_G_Y = TURNING_CENTER.y - Math.sqrt(RADIUS_AX * RADIUS_AX - (POINT_G_X - TURNING_CENTER.x) ** 2); // 172.876
const POINT_G: Point2D = { x: POINT_G_X, y: POINT_G_Y };
const FRONT_PARKED_CENTER_Y = POINT_G_Y - HALF_L; // 88.876

// Tangent & approach angles (Blackburn's theorem: ideal approach = tangent_G - tangent_A)
const POINT_A_PARALLEL: Point2D = { x: KERB_LINE_X, y: PARALLEL_CENTER_Y - HALF_L }; // (674, 258)
const TANGENT_ANGLE_A_DEG =
  (Math.atan2(TURNING_CENTER.y - POINT_A_PARALLEL.y, POINT_A_PARALLEL.x - TURNING_CENTER.x) * 180) / Math.PI; // 29.744 deg
const TANGENT_ANGLE_G_DEG = (Math.atan2(TURNING_CENTER.y - POINT_G.y, POINT_G.x - TURNING_CENTER.x) * 180) / Math.PI; // 53.771 deg
const GRAZE_HEADING_DEG = -(TANGENT_ANGLE_G_DEG - TANGENT_ANGLE_A_DEG); // -24.027 deg

const KERB_JOINT_Y = [56, 132, 208, 284, 360, 436] as const;
const PAVING_JOINT_Y = [76, 160, 244, 328, 412] as const;

interface Slide14Pose {
  readonly centerX: number;
  readonly centerY: number;
  readonly headingDeg: number;
  readonly steerDeg: number;
  readonly wheelRollDistance: number;
  readonly isReversing: boolean;
  readonly isBraking: boolean;
  readonly heroOpacity: number;
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

// Key pose when A passes right over G along the straight approach line
const CENTER_AT_G = rotateLocalPointAroundX(0, 0, GRAZE_HEADING_DEG);
const GRAZE_RAD = degToRad(GRAZE_HEADING_DEG);
const APPROACH_FWD_X = Math.sin(GRAZE_RAD); // -0.40717
const APPROACH_FWD_Y = -Math.cos(GRAZE_RAD); // -0.91335

// Concentric turning arcs centered at X
const OUTER_CIRCLE_ARC = buildArcSweep(TURNING_CENTER, RADIUS_AX, -78, -14);
const WHEEL_E_ARC = buildArcSweep(TURNING_CENTER, RADIUS_EX, -74, -8);
const WHEEL_F_ARC = buildArcSweep(TURNING_CENTER, RADIUS_FX, -68, 10);
const ACTIVE_CIRCULAR_ARC = buildArcSweep(
  TURNING_CENTER,
  RADIUS_AX,
  -90 + (90 - TANGENT_ANGLE_G_DEG),
  -90 + (90 - TANGENT_ANGLE_A_DEG),
);

// Geometry for tangent rays & kerb angle arcs at G and A (0 deg = straight UP -Y along kerb)
const TANGENT_G_UP_X = POINT_G.x - 148 * Math.sin(degToRad(TANGENT_ANGLE_G_DEG));
const TANGENT_G_UP_Y = POINT_G.y - 148 * Math.cos(degToRad(TANGENT_ANGLE_G_DEG));
const TANGENT_G_KERB_Y = POINT_G.y + (KERB_LINE_X - POINT_G.x) / Math.tan(degToRad(TANGENT_ANGLE_G_DEG)); // 228.56

const TANGENT_A_UP_X = POINT_A_PARALLEL.x - 138 * Math.sin(degToRad(TANGENT_ANGLE_A_DEG));
const TANGENT_A_UP_Y = POINT_A_PARALLEL.y - 138 * Math.cos(degToRad(TANGENT_ANGLE_A_DEG));

const APPROACH_LINE_UP_X = POINT_G.x + 160 * APPROACH_FWD_X;
const APPROACH_LINE_UP_Y = POINT_G.y + 160 * APPROACH_FWD_Y;

// Angle arcs measured clockwise/counterclockwise from straight UP (-90 deg in standard SVG)
const ARC_APPROACH_THETA = buildArcSweep(POINT_G, 46, -90, -90 + GRAZE_HEADING_DEG);
const ARC_TANGENT_G = buildArcSweep(POINT_G, 88, -90, -90 - TANGENT_ANGLE_G_DEG);
const ARC_TANGENT_A = buildArcSweep(POINT_A_PARALLEL, 56, -90, -90 - TANGENT_ANGLE_A_DEG);

function computeSlide14Pose(seconds: number): Slide14Pose {
  // Pass 1 (0.00s - 10.20s): Quick demo of straight angled reverse -> late lock -> circular arc
  if (seconds < 10.6) {
    const fadeOut = 1 - easeInOutCubic(progressBetween(seconds, 10.1, 10.55));
    if (seconds < 5.2) {
      return {
        centerX: CENTER_AT_G.x + 126 * APPROACH_FWD_X,
        centerY: CENTER_AT_G.y + 126 * APPROACH_FWD_Y,
        headingDeg: GRAZE_HEADING_DEG,
        steerDeg: 0,
        wheelRollDistance: 126,
        isReversing: false,
        isBraking: true,
        heroOpacity: easeOutCubic(progressBetween(seconds, 0.0, 0.8)),
      };
    }
    if (seconds < 7.1) {
      const u = easeInOutCubic(progressBetween(seconds, 5.2, 7.1));
      const d = 126 * (1 - u);
      const lockSnap = easeInOutCubic(progressBetween(seconds, 6.85, 7.1));
      return {
        centerX: CENTER_AT_G.x + d * APPROACH_FWD_X,
        centerY: CENTER_AT_G.y + d * APPROACH_FWD_Y,
        headingDeg: GRAZE_HEADING_DEG,
        steerDeg: FULL_LOCK_DEG * lockSnap * 0.45,
        wheelRollDistance: d,
        isReversing: true,
        isBraking: false,
        heroOpacity: 1,
      };
    }
    if (seconds < 7.55) {
      const lockSnap = easeInOutCubic(progressBetween(seconds, 7.1, 7.55));
      return {
        centerX: CENTER_AT_G.x,
        centerY: CENTER_AT_G.y,
        headingDeg: GRAZE_HEADING_DEG,
        steerDeg: FULL_LOCK_DEG * (0.45 + 0.55 * lockSnap),
        wheelRollDistance: 0,
        isReversing: true,
        isBraking: false,
        heroOpacity: 1,
      };
    }
    const u = easeInOutCubic(progressBetween(seconds, 7.55, 9.8));
    const headingDeg = GRAZE_HEADING_DEG * (1 - u);
    const center = rotateLocalPointAroundX(0, 0, headingDeg);
    const arcRoll = -RADIUS_FX * degToRad(headingDeg - GRAZE_HEADING_DEG);
    const straighten = easeInOutCubic(progressBetween(seconds, 9.7, 10.1));
    return {
      centerX: center.x,
      centerY: center.y,
      headingDeg,
      steerDeg: FULL_LOCK_DEG * (1 - straighten),
      wheelRollDistance: arcRoll,
      isReversing: seconds < 9.78,
      isBraking: seconds >= 9.78,
      heroOpacity: fadeOut,
    };
  }

  // Pass 2 (10.60s - 21.10s): Analytical slow-motion pass syncing A passing G (15.65s) & circle merge
  const fadeIn = easeOutCubic(progressBetween(seconds, 10.65, 11.15));
  if (seconds < 15.65) {
    const u = easeInOutCubic(progressBetween(seconds, 11.2, 15.65));
    const d = 118 * (1 - u);
    const steerPrep = easeInOutCubic(progressBetween(seconds, 14.9, 15.65));
    return {
      centerX: CENTER_AT_G.x + d * APPROACH_FWD_X,
      centerY: CENTER_AT_G.y + d * APPROACH_FWD_Y,
      headingDeg: GRAZE_HEADING_DEG,
      steerDeg: FULL_LOCK_DEG * steerPrep * 0.55,
      wheelRollDistance: d,
      isReversing: seconds >= 11.2,
      isBraking: seconds < 11.2,
      heroOpacity: fadeIn,
    };
  }

  if (seconds < 17.55) {
    const lockComplete = easeInOutCubic(progressBetween(seconds, 15.65, 16.35));
    return {
      centerX: CENTER_AT_G.x,
      centerY: CENTER_AT_G.y,
      headingDeg: GRAZE_HEADING_DEG,
      steerDeg: FULL_LOCK_DEG * (0.55 + 0.45 * lockComplete),
      wheelRollDistance: 0,
      isReversing: false,
      isBraking: true,
      heroOpacity: 1,
    };
  }

  if (seconds < 20.6) {
    const u = easeInOutCubic(progressBetween(seconds, 17.55, 20.6));
    const headingDeg = GRAZE_HEADING_DEG * (1 - u);
    const center = rotateLocalPointAroundX(0, 0, headingDeg);
    const arcRoll = -RADIUS_FX * degToRad(headingDeg - GRAZE_HEADING_DEG);
    return {
      centerX: center.x,
      centerY: center.y,
      headingDeg,
      steerDeg: FULL_LOCK_DEG,
      wheelRollDistance: arcRoll,
      isReversing: true,
      isBraking: false,
      heroOpacity: 1,
    };
  }

  // Beat 3 (20.60s - 31.00s): Parallel pose at (636, 342) while tangents at G and A are analyzed
  const straighten = easeInOutCubic(progressBetween(seconds, 20.6, 21.2));
  return {
    centerX: PARALLEL_CENTER_X,
    centerY: PARALLEL_CENTER_Y,
    headingDeg: 0,
    steerDeg: FULL_LOCK_DEG * (1 - straighten),
    wheelRollDistance: -RADIUS_FX * degToRad(-GRAZE_HEADING_DEG),
    isReversing: false,
    isBraking: seconds < 21.3,
    heroOpacity: 1,
  };
}

export function Slide14AngledApproach(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);
  const stageFadeIn = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.9));

  const pose = computeSlide14Pose(elapsedSeconds);
  const ackermann = computeAckermannAngles(pose.steerDeg, DEFAULT_VEHICLE_DIMENSIONS);

  // Live front-right corner A in world coords for trail tracing
  const hRad = degToRad(pose.headingDeg);
  const livePointA: Point2D = {
    x: pose.centerX + HALF_W * Math.cos(hRad) - -HALF_L * Math.sin(hRad),
    y: pose.centerY + HALF_W * Math.sin(hRad) + -HALF_L * Math.cos(hRad),
  };

  // Straight approach line & angle θ
  const approachGuideOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 2.6, 3.6)) *
    (1 - 0.35 * easeInOutCubic(progressBetween(elapsedSeconds, 21.5, 22.8)));
  const approachThetaHighlight = pulseEnvelope(elapsedSeconds, 3.1, 3.6, 5.1, 5.8);

  // Straight reverse trace from A_start -> G
  const pass1StraightEnd =
    elapsedSeconds < 5.2
      ? { x: APPROACH_LINE_UP_X, y: APPROACH_LINE_UP_Y }
      : elapsedSeconds < 7.1
        ? livePointA
        : POINT_G;
  const showPass1Straight = elapsedSeconds >= 5.2 && elapsedSeconds < 10.4;

  // Blackburn turning circle & X node appear in Beat 2 (10.4s+)
  const circleSystemOpacity = easeOutCubic(progressBetween(elapsedSeconds, 10.5, 11.4));
  const pass2StraightActive = elapsedSeconds >= 11.2 && elapsedSeconds < 21.0;

  // Lock-at-G highlight & Ackermann rays onto X (14.8s - 20.8s)
  const lockAtGHighlight = pulseEnvelope(elapsedSeconds, 14.9, 15.6, 17.5, 18.4);
  const showAckermannRays = elapsedSeconds >= 15.65 && elapsedSeconds < 20.6;
  const activeCircleGlow = pulseEnvelope(elapsedSeconds, 17.6, 18.2, 20.4, 21.3);

  // Ghost car at G during Beat 3 (21.3s - 31.0s) so approach angle θ & tangents coexist clearly
  const grazeGhostOpacity = easeOutCubic(progressBetween(elapsedSeconds, 21.2, 22.1)) * 0.32;

  // Tangent lines & angle callouts at G and A (22.6s - 31.0s)
  const tangentGDraw = easeInOutCubic(progressBetween(elapsedSeconds, 22.8, 24.4));
  const tangentGGlow = pulseEnvelope(elapsedSeconds, 23.0, 23.8, 26.8, 27.6);
  const tangentADraw = easeInOutCubic(progressBetween(elapsedSeconds, 27.4, 28.8));
  const tangentAGlow = pulseEnvelope(elapsedSeconds, 27.5, 28.0, 29.8, 30.8);

  // Bottom ideal approach angle equation card (21.2s - 31.0s)
  const eqCardOpacity = easeOutCubic(progressBetween(elapsedSeconds, 21.2, 22.0));
  const eqThetaGlow = pulseEnvelope(elapsedSeconds, 21.4, 21.9, 22.8, 23.4);
  const eqThetaGReveal = easeOutCubic(progressBetween(elapsedSeconds, 23.2, 24.0));
  const eqThetaAReveal = easeOutCubic(progressBetween(elapsedSeconds, 27.4, 28.1));

  // Vertex pulses synced to spoken letters
  const pulseG = Math.max(pulseFactor(elapsedSeconds, 16.9, 0.7), pulseFactor(elapsedSeconds, 25.8, 0.65));
  const pulseA = Math.max(pulseFactor(elapsedSeconds, 16.0, 0.55), pulseFactor(elapsedSeconds, 29.0, 0.65));

  const rearRightWheel: Point2D = {
    x: pose.centerX + TRACK_HALF_W * Math.cos(hRad) - WHEEL_HALF_L * Math.sin(hRad),
    y: pose.centerY + TRACK_HALF_W * Math.sin(hRad) + WHEEL_HALF_L * Math.cos(hRad),
  };
  const frontRightWheel: Point2D = {
    x: pose.centerX + TRACK_HALF_W * Math.cos(hRad) - -WHEEL_HALF_L * Math.sin(hRad),
    y: pose.centerY + TRACK_HALF_W * Math.sin(hRad) + -WHEEL_HALF_L * Math.cos(hRad),
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">14</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Angled Approach &amp; Late Full-Lock
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>
          Straight angled reverse approach snapping to full lock as corner A passes G, with tangent angles at G and A
          defining the ideal approach angle
        </title>
        <defs>
          <radialGradient id="slide14-ambient-glow" cx="54%" cy="46%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide14-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="slide14-road-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="8%" stopColor="white" stopOpacity={1} />
            <stop offset="84%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="black" stopOpacity={0} />
          </linearGradient>

          <mask id="slide14-road-fade-mask">
            <rect x={0} y={0} width={960} height={476} fill="url(#slide14-road-fade-grad)" />
          </mask>

          <linearGradient id="slide14-asphalt-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.145 0 0)" />
            <stop offset="20%" stopColor="oklch(0.165 0 0)" />
            <stop offset="52%" stopColor="oklch(0.175 0 0)" />
            <stop offset="100%" stopColor="oklch(0.145 0 0)" />
          </linearGradient>

          <linearGradient id="slide14-sidewalk-right-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.88)" />
            <stop offset="55%" stopColor="oklch(0.19 0 0 / 0.42)" />
            <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
          </linearGradient>

          <linearGradient id="slide14-sidewalk-left-grad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.21 0 0 / 0.8)" />
            <stop offset="55%" stopColor="oklch(0.18 0 0 / 0.35)" />
            <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
          </linearGradient>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={305} r={315} fill="url(#slide14-ambient-glow)" />

        {/* ================================================================
            ARCHITECTURAL ROAD STAGE
           ================================================================ */}
        <g opacity={stageFadeIn} mask="url(#slide14-road-fade-mask)">
          <rect x={ASPHALT_LEFT_X - 105} y={0} width={99} height={476} fill="url(#slide14-sidewalk-left-grad)" />
          <rect x={ASPHALT_LEFT_X - 6} y={0} width={6} height={476} fill="oklch(0.27 0 0)" />
          <line
            x1={ASPHALT_LEFT_X}
            y1={0}
            x2={ASPHALT_LEFT_X}
            y2={476}
            stroke="oklch(0.54 0 0 / 0.45)"
            strokeWidth={1.25}
          />

          <rect x={KERB_STONE_X + 8} y={0} width={145} height={476} fill="url(#slide14-sidewalk-right-grad)" />
          <g stroke="oklch(0.32 0 0 / 0.34)" strokeWidth={1}>
            {PAVING_JOINT_Y.map((y) => (
              <line key={`pave-${y}`} x1={KERB_STONE_X + 8} y1={y} x2={KERB_STONE_X + 135} y2={y} />
            ))}
          </g>

          <rect
            x={ASPHALT_LEFT_X}
            y={0}
            width={KERB_STONE_X - ASPHALT_LEFT_X}
            height={476}
            fill="url(#slide14-asphalt-grad)"
          />

          <rect x={KERB_STONE_X} y={0} width={8} height={476} fill="oklch(0.29 0 0)" />
          <line x1={KERB_STONE_X} y1={0} x2={KERB_STONE_X} y2={476} stroke="oklch(0.72 0 0 / 0.65)" strokeWidth={1.5} />
          <g stroke="oklch(0.44 0 0 / 0.65)" strokeWidth={1}>
            {KERB_JOINT_Y.map((y) => (
              <line key={`kerb-${y}`} x1={KERB_STONE_X} y1={y} x2={KERB_STONE_X + 8} y2={y} />
            ))}
          </g>

          <line
            x1={PARKING_LINE_X}
            y1={0}
            x2={PARKING_LINE_X}
            y2={476}
            stroke="oklch(0.62 0 0 / 0.34)"
            strokeWidth={1.2}
            strokeDasharray="8 10"
          />
          <line
            x1={LANE_DIVIDER_X}
            y1={8}
            x2={LANE_DIVIDER_X}
            y2={468}
            stroke="oklch(0.74 0 0 / 0.4)"
            strokeWidth={1.7}
            strokeDasharray="22 18"
          />

          {/* Kerb Tangent Alignment Line Through A_parallel */}
          <line
            x1={KERB_LINE_X}
            y1={12}
            x2={KERB_LINE_X}
            y2={464}
            stroke="oklch(0.76 0 0 / 0.3)"
            strokeWidth={1.1}
            strokeDasharray="3 5"
          />

          {/* Front Parked Car (Corner G at (598, 172.88)) */}
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
            CONCENTRIC TURNING CIRCLES & CENTER X (BEAT 2+)
           ================================================================ */}
        {circleSystemOpacity > 0.01 ? (
          <g opacity={circleSystemOpacity}>
            <path d={WHEEL_F_ARC} fill="none" stroke="oklch(0.76 0 0 / 0.28)" strokeWidth={1.2} strokeDasharray="4 6" />
            <path d={WHEEL_E_ARC} fill="none" stroke="oklch(0.8 0 0 / 0.34)" strokeWidth={1.25} strokeDasharray="4 6" />
            <path d={OUTER_CIRCLE_ARC} fill="none" stroke="oklch(0.92 0 0 / 0.56)" strokeWidth={1.55} />

            {/* Highlighted Active Merge Arc Between G and A_parallel */}
            <path
              d={ACTIVE_CIRCULAR_ARC}
              fill="none"
              stroke="oklch(0.99 0 0)"
              strokeWidth={2.2 + 0.8 * activeCircleGlow}
              opacity={0.4 + 0.6 * activeCircleGlow}
              filter={activeCircleGlow > 0.2 ? "url(#slide14-luminous-glow)" : undefined}
            />
          </g>
        ) : null}

        {/* Live Ackermann Rays to X During Full-Lock Merge */}
        {showAckermannRays ? (
          <g stroke="oklch(0.86 0 0 / 0.52)" strokeWidth={1.2} strokeDasharray="4 4">
            <line x1={rearRightWheel.x} y1={rearRightWheel.y} x2={TURNING_CENTER.x} y2={TURNING_CENTER.y} />
            <line x1={frontRightWheel.x} y1={frontRightWheel.y} x2={TURNING_CENTER.x} y2={TURNING_CENTER.y} />
          </g>
        ) : null}

        {/* ================================================================
            STRAIGHT APPROACH LINE & APPROACH ANGLE θ
           ================================================================ */}
        {approachGuideOpacity > 0.01 ? (
          <g opacity={approachGuideOpacity}>
            {/* Kerb-Parallel Vertical Reference Rising from G */}
            <line
              x1={POINT_G.x}
              y1={POINT_G.y}
              x2={POINT_G.x}
              y2={54}
              stroke="oklch(0.82 0 0 / 0.45)"
              strokeWidth={1.2}
              strokeDasharray="4 4"
            />

            {/* Straight Angled Approach Path Line Through G */}
            <line
              x1={APPROACH_LINE_UP_X}
              y1={APPROACH_LINE_UP_Y}
              x2={POINT_G.x}
              y2={POINT_G.y}
              stroke="oklch(0.92 0 0 / 0.62)"
              strokeWidth={1.45}
              strokeDasharray="5 4"
            />

            {/* Luminous Straight Reverse Trace during Pass 1 & Pass 2 */}
            {showPass1Straight ? (
              <line
                x1={APPROACH_LINE_UP_X}
                y1={APPROACH_LINE_UP_Y}
                x2={pass1StraightEnd.x}
                y2={pass1StraightEnd.y}
                stroke="oklch(0.98 0 0)"
                strokeWidth={2}
                filter="url(#slide14-luminous-glow)"
              />
            ) : null}
            {pass2StraightActive ? (
              <line
                x1={APPROACH_LINE_UP_X}
                y1={APPROACH_LINE_UP_Y}
                x2={elapsedSeconds < 15.65 ? livePointA.x : POINT_G.x}
                y2={elapsedSeconds < 15.65 ? livePointA.y : POINT_G.y}
                stroke="oklch(0.98 0 0)"
                strokeWidth={2.1}
                filter="url(#slide14-luminous-glow)"
              />
            ) : null}

            {/* Ideal Approach Angle θ Arc at G */}
            <path
              d={ARC_APPROACH_THETA}
              fill="none"
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.6 + 0.7 * approachThetaHighlight}
              filter={approachThetaHighlight > 0.2 ? "url(#slide14-luminous-glow)" : undefined}
            />
            <text
              x={585}
              y={112}
              textAnchor="middle"
              stroke="oklch(0.15 0 0 / 0.94)"
              strokeWidth={4}
              strokeLinejoin="round"
              className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
            >
              θ
            </text>
          </g>
        ) : null}

        {/* Ghost Outline of Car Snapping to Lock at G During Beat 3 */}
        {grazeGhostOpacity > 0.01 ? (
          <g
            transform={`translate(${CENTER_AT_G.x}, ${CENTER_AT_G.y}) rotate(${GRAZE_HEADING_DEG})`}
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

        {/* ================================================================
            TANGENT LINES & KERB ANGLES AT G AND A (BEAT 3)
           ================================================================ */}
        {/* Tangent to Circle at G */}
        {tangentGDraw > 0.01 ? (
          <g>
            {/* Perpendicular Radius X -> G */}
            <line
              x1={TURNING_CENTER.x}
              y1={TURNING_CENTER.y}
              x2={POINT_G.x}
              y2={POINT_G.y}
              stroke="oklch(0.84 0 0 / 0.36)"
              strokeWidth={1.1}
              strokeDasharray="4 4"
            />
            {/* Tangent Extension Down-Right to Actual Kerb Line */}
            <line
              x1={POINT_G.x}
              y1={POINT_G.y}
              x2={KERB_LINE_X}
              y2={TANGENT_G_KERB_Y}
              stroke="oklch(0.88 0 0 / 0.45)"
              strokeWidth={1.2}
              strokeDasharray="3 4"
              opacity={tangentGDraw}
            />
            {/* Luminous Tangent Line Up-Left from G */}
            <line
              x1={POINT_G.x}
              y1={POINT_G.y}
              x2={POINT_G.x + (TANGENT_G_UP_X - POINT_G.x) * tangentGDraw}
              y2={POINT_G.y + (TANGENT_G_UP_Y - POINT_G.y) * tangentGDraw}
              stroke="oklch(0.99 0 0)"
              strokeWidth={1.9 + 0.6 * tangentGGlow}
              filter={tangentGGlow > 0.2 ? "url(#slide14-luminous-glow)" : undefined}
            />
            <path
              d={ARC_TANGENT_G}
              fill="none"
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.7 + 0.5 * tangentGGlow}
              opacity={tangentGDraw}
            />
            <g opacity={easeOutCubic(progressBetween(tangentGDraw, 0.45, 1))}>
              <text
                x={526}
                y={96}
                textAnchor="end"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
              >
                θ
              </text>
              <text
                x={536}
                y={101}
                textAnchor="end"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-primary font-mono text-xs font-semibold"
              >
                G
              </text>
            </g>
          </g>
        ) : null}

        {/* Tangent to Circle at A */}
        {tangentADraw > 0.01 ? (
          <g>
            {/* Perpendicular Radius X -> A_parallel */}
            <line
              x1={TURNING_CENTER.x}
              y1={TURNING_CENTER.y}
              x2={POINT_A_PARALLEL.x}
              y2={POINT_A_PARALLEL.y}
              stroke="oklch(0.84 0 0 / 0.36)"
              strokeWidth={1.1}
              strokeDasharray="4 4"
            />
            {/* Luminous Tangent Line Up-Left from A */}
            <line
              x1={POINT_A_PARALLEL.x}
              y1={POINT_A_PARALLEL.y}
              x2={POINT_A_PARALLEL.x + (TANGENT_A_UP_X - POINT_A_PARALLEL.x) * tangentADraw}
              y2={POINT_A_PARALLEL.y + (TANGENT_A_UP_Y - POINT_A_PARALLEL.y) * tangentADraw}
              stroke="oklch(0.99 0 0)"
              strokeWidth={1.9 + 0.6 * tangentAGlow}
              filter={tangentAGlow > 0.2 ? "url(#slide14-luminous-glow)" : undefined}
            />
            <path
              d={ARC_TANGENT_A}
              fill="none"
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.7 + 0.5 * tangentAGlow}
              opacity={tangentADraw}
            />
            <g opacity={easeOutCubic(progressBetween(tangentADraw, 0.45, 1))}>
              <text
                x={653}
                y={189}
                textAnchor="end"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
              >
                θ
              </text>
              <text
                x={663}
                y={194}
                textAnchor="end"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-primary font-mono text-xs font-semibold"
              >
                A
              </text>
            </g>
          </g>
        ) : null}

        {/* ================================================================
            HERO 2D CUT-PLANE SPORTS COUPE
           ================================================================ */}
        <g
          transform={`translate(${pose.centerX}, ${pose.centerY}) rotate(${pose.headingDeg})`}
          opacity={pose.heroOpacity}
        >
          <CutPlaneCar
            variant={CarSectionVariants.Hero}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={true}
            frontLeftSteerDeg={ackermann.frontLeftSteerDeg}
            frontRightSteerDeg={ackermann.frontRightSteerDeg}
            wheelRollDistance={pose.wheelRollDistance}
            isReversing={pose.isReversing}
            isBraking={pose.isBraking}
          />
        </g>

        {/* ================================================================
            TURNING CENTER X & CRITICAL POINTS G, A
           ================================================================ */}
        {circleSystemOpacity > 0.01 ? (
          <g transform={`translate(${TURNING_CENTER.x}, ${TURNING_CENTER.y})`} opacity={circleSystemOpacity}>
            <polygon
              points="0,-16 13.86,-8 13.86,8 0,16 -13.86,8 -13.86,-8"
              fill="oklch(0.24 0 0 / 0.94)"
              stroke="oklch(0.94 0 0 / 0.9)"
              strokeWidth={1.4}
            />
            <circle cx={0} cy={0} r={4.5} fill="oklch(0.98 0 0)" filter="url(#slide14-luminous-glow)" />
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
        ) : null}

        {/* Grazing Point G */}
        <g transform={`translate(${POINT_G.x}, ${POINT_G.y})`} opacity={stageFadeIn}>
          {Math.max(lockAtGHighlight, pulseG) > 0.04 ? (
            <circle
              cx={0}
              cy={0}
              r={10 + 11 * Math.max(lockAtGHighlight, pulseG)}
              fill="none"
              stroke="oklch(0.99 0 0)"
              strokeWidth={1.4}
              opacity={Math.max(lockAtGHighlight, pulseG) * 0.85}
            />
          ) : null}
          <circle
            cx={0}
            cy={0}
            r={4.2 + 1.4 * Math.max(lockAtGHighlight, pulseG)}
            fill="oklch(0.98 0 0)"
            filter={Math.max(lockAtGHighlight, pulseG) > 0.1 ? "url(#slide14-luminous-glow)" : undefined}
          />
          <text
            x={-13}
            y={8}
            textAnchor="end"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
          >
            G
          </text>
        </g>

        {/* Live Corner A Node */}
        <g transform={`translate(${livePointA.x}, ${livePointA.y})`} opacity={stageFadeIn * pose.heroOpacity}>
          <circle
            cx={0}
            cy={0}
            r={3.8 + 1.4 * pulseA}
            fill="oklch(0.98 0 0)"
            filter={pulseA > 0.1 ? "url(#slide14-luminous-glow)" : undefined}
          />
          <text
            x={13}
            y={4}
            textAnchor="start"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
          >
            A
          </text>
        </g>

        {/* ================================================================
            BOTTOM EQUATION CARD: θ = θ_G − θ_A
           ================================================================ */}
        {eqCardOpacity > 0.01 ? (
          <g transform="translate(480, 524)" opacity={eqCardOpacity}>
            <rect
              x={-146}
              y={-28}
              width={292}
              height={54}
              rx={9}
              fill="oklch(0.21 0 0 / 0.94)"
              stroke="oklch(0.95 0 0 / 0.86)"
              strokeWidth={1.5}
            />

            <text
              x={-90}
              y={6}
              textAnchor="middle"
              filter={eqThetaGlow > 0.25 ? "url(#slide14-luminous-glow)" : undefined}
              className="fill-text-primary font-mono text-2xl font-semibold"
            >
              θ
            </text>

            <text x={-52} y={6} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
              =
            </text>

            <g opacity={eqThetaGReveal} filter={tangentGGlow > 0.25 ? "url(#slide14-luminous-glow)" : undefined}>
              <text x={-12} y={6} textAnchor="middle" className="fill-text-primary font-mono text-2xl font-semibold">
                θ
              </text>
              <text x={2} y={13} textAnchor="middle" className="fill-text-primary font-mono text-xs font-semibold">
                G
              </text>
            </g>

            <g opacity={eqThetaAReveal} filter={tangentAGlow > 0.25 ? "url(#slide14-luminous-glow)" : undefined}>
              <text x={36} y={6} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
                −
              </text>
              <text x={74} y={6} textAnchor="middle" className="fill-text-primary font-mono text-2xl font-semibold">
                θ
              </text>
              <text x={88} y={13} textAnchor="middle" className="fill-text-primary font-mono text-xs font-semibold">
                A
              </text>
            </g>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
