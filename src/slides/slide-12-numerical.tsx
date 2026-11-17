import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import {
  CarSectionVariants,
  computeAckermannAngles,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  type Point2D,
  type VehicleDimensions,
} from "@/simulation/car-simulator";
import { usePresentationStore } from "@/store/presentation-store";
import { useMemo, type ReactElement } from "react";

// Scale: 31.2 px = 1.0 m (CutPlaneCar wheelbase 104 * 0.78 = 81.12 px = 2.6 m)
const PX_PER_METER = 31.2;
const CAR_SCALE = PX_PER_METER / 40; // 0.78

const SLIDE_12_DIMENSIONS: VehicleDimensions = {
  width: DEFAULT_VEHICLE_DIMENSIONS.width * CAR_SCALE, // 59.28 px (1.90 m)
  length: DEFAULT_VEHICLE_DIMENSIONS.length * CAR_SCALE, // 131.04 px (4.20 m)
  wheelbase: DEFAULT_VEHICLE_DIMENSIONS.wheelbase * CAR_SCALE, // 81.12 px (2.60 m)
  frontOverhang: DEFAULT_VEHICLE_DIMENSIONS.frontOverhang * CAR_SCALE, // 24.96 px
  rearOverhang: DEFAULT_VEHICLE_DIMENSIONS.rearOverhang * CAR_SCALE, // 24.96 px
  trackHalfWidth: DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth * CAR_SCALE, // 24.18 px
};

const HALF_WHEELBASE_PX = SLIDE_12_DIMENSIONS.wheelbase * 0.5; // 40.56
const HALF_CAR_WIDTH_PX = SLIDE_12_DIMENSIONS.width * 0.5; // 29.64
const HALF_CAR_LENGTH_PX = SLIDE_12_DIMENSIONS.length * 0.5; // 65.52

// Real-world Blackburn inputs: r = 5.4 m, l = 2.6 m, k = 1.3 m, w = 1.7 m -> |AH| = 1.43 m
const R_PX = 5.4 * PX_PER_METER; // 168.48 px
const FX_PX = Math.sqrt(R_PX * R_PX - SLIDE_12_DIMENSIONS.wheelbase * SLIDE_12_DIMENSIONS.wheelbase); // 147.669 px
const R_TURN_PX = FX_PX - SLIDE_12_DIMENSIONS.trackHalfWidth; // 123.489 px
const FULL_LOCK_DEG = (Math.atan2(SLIDE_12_DIMENSIONS.wheelbase, R_TURN_PX) * 180) / Math.PI; // 33.301 deg

const CLEARANCE_PX = 1.43 * PX_PER_METER; // 44.616 px

// Road stage geometry positioned cleanly on right half of 960x620 stage
const BAY_CENTER_X = 775;
const BAY_FINAL_CENTER_Y = 250;
const PHASE4_STOP_CENTER_Y = 260;

const KERB_X = BAY_CENTER_X + HALF_CAR_WIDTH_PX; // 804.64
const KERB_STONE_X = 808;
const PARKING_LINE_X = 738;
const LANE_DIVIDER_X = 626;
const ASPHALT_LEFT_X = 514;

const HERO_FRONT_BUMPER_FINAL_Y = BAY_FINAL_CENTER_Y - HALF_CAR_LENGTH_PX; // 184.48
const HERO_REAR_BUMPER_FINAL_Y = BAY_FINAL_CENTER_Y + HALF_CAR_LENGTH_PX; // 315.52
const FRONT_CAR_REAR_Y = HERO_FRONT_BUMPER_FINAL_Y - CLEARANCE_PX; // 139.864

// Front parked car (width w = 1.7 m = 53.04 px aligned against kerb)
const FRONT_CAR_WIDTH_PX = 1.7 * PX_PER_METER; // 53.04 px
const FRONT_CAR_SCALE = FRONT_CAR_WIDTH_PX / DEFAULT_VEHICLE_DIMENSIONS.width; // 0.6979
const FRONT_CAR_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5 * FRONT_CAR_SCALE; // 58.623 px
const FRONT_CAR_CENTER_X = KERB_X - FRONT_CAR_WIDTH_PX * 0.5; // 778.12
const FRONT_CAR_CENTER_Y = FRONT_CAR_REAR_Y - FRONT_CAR_HALF_L; // 81.241

const REAR_CAR_CENTER_Y = 395.52;

// Exact turning center X_2 for Phase 4 full-lock reverse arc into (775, 260)
const TURNING_CENTER: Point2D = {
  x: BAY_CENTER_X - R_TURN_PX, // 651.511
  y: PHASE4_STOP_CENTER_Y + HALF_WHEELBASE_PX, // 300.56
};

// Target front-kerb wheel center E at end of Phase 4 arc (distance |EX| = 168.48 px = 5.40 m)
const TARGET_E: Point2D = {
  x: BAY_CENTER_X + SLIDE_12_DIMENSIONS.trackHalfWidth, // 799.18
  y: PHASE4_STOP_CENTER_Y - HALF_WHEELBASE_PX, // 219.44
};

// Exact symmetric S-sweep kinematics from adjacent right driving lane into (775, 260)
const LANE_START_Y = 210;
const LANE_STAGE_CENTER_Y = 78.89;
const X1_Y = LANE_STAGE_CENTER_Y + HALF_WHEELBASE_PX; // 119.45
const SIN_INFLECT = (TURNING_CENTER.y - X1_Y) / (2 * R_TURN_PX); // 0.733304
const COS_INFLECT = Math.sqrt(1 - SIN_INFLECT * SIN_INFLECT); // 0.679901
const THETA_INFLECT_DEG = (Math.asin(SIN_INFLECT) * 180) / Math.PI; // 47.1636 deg
const LANE_STAGE_CENTER_X = BAY_CENTER_X - 2 * R_TURN_PX * (1 - COS_INFLECT); // 695.943
const X1_CENTER: Point2D = {
  x: LANE_STAGE_CENTER_X + R_TURN_PX, // 819.432
  y: X1_Y, // 119.45
};

const KERB_JOINT_Y = [56, 128, 200, 272, 344, 416] as const;
const PAVING_JOINT_Y = [72, 152, 232, 312, 392] as const;

const OUTER_RADICAL_PATH = "M -322 0 L -317 0 L -311 11 L -298 -35 L 284 -35 L 284 -29";
const INNER_RADICAL_PATH = "M 40 0 L 44 0 L 48 8 L 57 -23 L 176 -23";

interface Slide12Pose {
  readonly centerX: number;
  readonly centerY: number;
  readonly headingDeg: number;
  readonly frontLeftSteerDeg: number;
  readonly frontRightSteerDeg: number;
  readonly wheelRollDistance: number;
  readonly isReversing: boolean;
  readonly isBraking: boolean;
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

function computeSlide12Pose(seconds: number): Slide12Pose {
  const pullUpDistance = LANE_START_Y - LANE_STAGE_CENTER_Y; // 131.11
  const arcTotalRad = degToRad(THETA_INFLECT_DEG);
  const singleArcLength = R_TURN_PX * arcTotalRad;

  if (seconds < 3.6) {
    const u = easeInOutCubic(progressBetween(seconds, 0.0, 3.6));
    const centerY = LANE_START_Y + (LANE_STAGE_CENTER_Y - LANE_START_Y) * u;
    const ack = computeAckermannAngles(0, SLIDE_12_DIMENSIONS);
    return {
      centerX: LANE_STAGE_CENTER_X,
      centerY,
      headingDeg: 0,
      frontLeftSteerDeg: ack.frontLeftSteerDeg,
      frontRightSteerDeg: ack.frontRightSteerDeg,
      wheelRollDistance: pullUpDistance * u,
      isReversing: false,
      isBraking: seconds >= 2.85,
    };
  }

  if (seconds < 19.8) {
    const lockRight = easeInOutCubic(progressBetween(seconds, 18.8, 19.8));
    const ack = computeAckermannAngles(FULL_LOCK_DEG * lockRight, SLIDE_12_DIMENSIONS);
    return {
      centerX: LANE_STAGE_CENTER_X,
      centerY: LANE_STAGE_CENTER_Y,
      headingDeg: 0,
      frontLeftSteerDeg: ack.frontLeftSteerDeg,
      frontRightSteerDeg: ack.frontRightSteerDeg,
      wheelRollDistance: pullUpDistance,
      isReversing: false,
      isBraking: true,
    };
  }

  if (seconds < 23.6) {
    const u = easeInOutCubic(progressBetween(seconds, 19.8, 23.6));
    const headingDeg = -THETA_INFLECT_DEG * u;
    const headingRad = degToRad(headingDeg);
    const rearAxleX = X1_CENTER.x - R_TURN_PX * Math.cos(headingRad);
    const rearAxleY = X1_CENTER.y - R_TURN_PX * Math.sin(headingRad);
    const centerX = rearAxleX + HALF_WHEELBASE_PX * Math.sin(headingRad);
    const centerY = rearAxleY - HALF_WHEELBASE_PX * Math.cos(headingRad);
    const ack = computeAckermannAngles(FULL_LOCK_DEG, SLIDE_12_DIMENSIONS);
    return {
      centerX,
      centerY,
      headingDeg,
      frontLeftSteerDeg: ack.frontLeftSteerDeg,
      frontRightSteerDeg: ack.frontRightSteerDeg,
      wheelRollDistance: pullUpDistance - R_TURN_PX * Math.abs(headingRad),
      isReversing: true,
      isBraking: false,
    };
  }

  if (seconds < 24.4) {
    const u = easeInOutCubic(progressBetween(seconds, 23.6, 24.4));
    const headingDeg = -THETA_INFLECT_DEG;
    const headingRad = degToRad(headingDeg);
    const rearAxleX = X1_CENTER.x - R_TURN_PX * Math.cos(headingRad);
    const rearAxleY = X1_CENTER.y - R_TURN_PX * Math.sin(headingRad);
    const centerX = rearAxleX + HALF_WHEELBASE_PX * Math.sin(headingRad);
    const centerY = rearAxleY - HALF_WHEELBASE_PX * Math.cos(headingRad);
    const steerDeg = FULL_LOCK_DEG * (1 - 2 * u);
    const ack = computeAckermannAngles(steerDeg, SLIDE_12_DIMENSIONS);
    return {
      centerX,
      centerY,
      headingDeg,
      frontLeftSteerDeg: ack.frontLeftSteerDeg,
      frontRightSteerDeg: ack.frontRightSteerDeg,
      wheelRollDistance: pullUpDistance - singleArcLength,
      isReversing: false,
      isBraking: true,
    };
  }

  if (seconds < 28.4) {
    const u = easeInOutCubic(progressBetween(seconds, 24.4, 28.4));
    const headingDeg = -THETA_INFLECT_DEG * (1 - u);
    const headingRad = degToRad(headingDeg);
    const rearAxleX = TURNING_CENTER.x + R_TURN_PX * Math.cos(headingRad);
    const rearAxleY = TURNING_CENTER.y + R_TURN_PX * Math.sin(headingRad);
    const centerX = rearAxleX + HALF_WHEELBASE_PX * Math.sin(headingRad);
    const centerY = rearAxleY - HALF_WHEELBASE_PX * Math.cos(headingRad);
    const ack = computeAckermannAngles(-FULL_LOCK_DEG, SLIDE_12_DIMENSIONS);
    const arc2Distance = R_TURN_PX * (arcTotalRad - Math.abs(headingRad));
    return {
      centerX,
      centerY,
      headingDeg,
      frontLeftSteerDeg: ack.frontLeftSteerDeg,
      frontRightSteerDeg: ack.frontRightSteerDeg,
      wheelRollDistance: pullUpDistance - singleArcLength - arc2Distance,
      isReversing: true,
      isBraking: false,
    };
  }

  if (seconds < 29.0) {
    const u = easeInOutCubic(progressBetween(seconds, 28.4, 29.0));
    const ack = computeAckermannAngles(-FULL_LOCK_DEG * (1 - u), SLIDE_12_DIMENSIONS);
    return {
      centerX: BAY_CENTER_X,
      centerY: PHASE4_STOP_CENTER_Y,
      headingDeg: 0,
      frontLeftSteerDeg: ack.frontLeftSteerDeg,
      frontRightSteerDeg: ack.frontRightSteerDeg,
      wheelRollDistance: pullUpDistance - 2 * singleArcLength,
      isReversing: false,
      isBraking: true,
    };
  }

  if (seconds < 29.9) {
    const u = easeInOutCubic(progressBetween(seconds, 29.0, 29.9));
    const centerY = PHASE4_STOP_CENTER_Y + (BAY_FINAL_CENTER_Y - PHASE4_STOP_CENTER_Y) * u;
    const forwardStep = PHASE4_STOP_CENTER_Y - centerY;
    return {
      centerX: BAY_CENTER_X,
      centerY,
      headingDeg: 0,
      frontLeftSteerDeg: 0,
      frontRightSteerDeg: 0,
      wheelRollDistance: pullUpDistance - 2 * singleArcLength + forwardStep,
      isReversing: false,
      isBraking: seconds >= 29.65,
    };
  }

  return {
    centerX: BAY_CENTER_X,
    centerY: BAY_FINAL_CENTER_Y,
    headingDeg: 0,
    frontLeftSteerDeg: 0,
    frontRightSteerDeg: 0,
    wheelRollDistance: pullUpDistance - 2 * singleArcLength + (PHASE4_STOP_CENTER_Y - BAY_FINAL_CENTER_Y),
    isReversing: false,
    isBraking: false,
  };
}

function buildSweepCornerTrail(seconds: number): string {
  if (seconds < 19.8) {
    return "";
  }
  const endT = Math.min(seconds, 28.4);
  const points: string[] = [];
  const dt = 0.08;

  for (let t = 19.8; t <= endT; t += dt) {
    const pose = computeSlide12Pose(t);
    const hRad = degToRad(pose.headingDeg);
    const bx = pose.centerX + HALF_CAR_WIDTH_PX * Math.cos(hRad) - -HALF_CAR_LENGTH_PX * Math.sin(hRad);
    const by = pose.centerY + HALF_CAR_WIDTH_PX * Math.sin(hRad) + -HALF_CAR_LENGTH_PX * Math.cos(hRad);
    points.push(`${bx.toFixed(1)},${by.toFixed(1)}`);
  }

  const endPose = computeSlide12Pose(endT);
  const endRad = degToRad(endPose.headingDeg);
  const endBx = endPose.centerX + HALF_CAR_WIDTH_PX * Math.cos(endRad) - -HALF_CAR_LENGTH_PX * Math.sin(endRad);
  const endBy = endPose.centerY + HALF_CAR_WIDTH_PX * Math.sin(endRad) + -HALF_CAR_LENGTH_PX * Math.cos(endRad);
  points.push(`${endBx.toFixed(1)},${endBy.toFixed(1)}`);

  return points.join(" ");
}

interface MetricChipProps {
  readonly x: number;
  readonly y: number;
  readonly symbol: string;
  readonly value: string;
  readonly opacity: number;
  readonly activeGlow: number;
}

function MetricChip({ x, y, symbol, value, opacity, activeGlow }: MetricChipProps): ReactElement | null {
  if (opacity <= 0.01) {
    return null;
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={opacity}
      filter={activeGlow > 0.25 ? "url(#slide12-luminous-glow)" : undefined}
    >
      <rect
        x={0}
        y={0}
        width={176}
        height={58}
        rx={8}
        fill={activeGlow > 0.2 ? "oklch(0.25 0 0 / 0.94)" : "oklch(0.21 0 0 / 0.9)"}
        stroke={`oklch(0.95 0 0 / ${(0.42 + 0.52 * activeGlow).toFixed(2)})`}
        strokeWidth={1.25 + 0.55 * activeGlow}
      />
      <text
        x={22}
        y={36}
        textAnchor="start"
        className="fill-text-secondary font-mono text-lg font-semibold tracking-mono"
      >
        {symbol}
      </text>
      <text x={50} y={36} textAnchor="middle" className="fill-text-muted font-mono text-base">
        =
      </text>
      <text
        x={154}
        y={36}
        textAnchor="end"
        className="fill-text-primary font-mono text-lg font-semibold tracking-mono tabular-nums"
      >
        {value}
      </text>
    </g>
  );
}

export function Slide12Numerical(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  const stageFadeIn = easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.9));
  const pose = computeSlide12Pose(elapsedSeconds);
  const sweepTrail = useMemo(() => buildSweepCornerTrail(elapsedSeconds), [elapsedSeconds]);

  // Turning circle diameter (10.8 m) -> radius (r = 5.4 m) choreography (3.32s - 11.36s)
  const circleDraw = easeInOutCubic(progressBetween(elapsedSeconds, 4.2, 7.6));
  const circleDimAfterIntro = easeInOutCubic(progressBetween(elapsedSeconds, 12.2, 13.6));
  const diameterFade =
    easeOutCubic(progressBetween(elapsedSeconds, 5.2, 6.2)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 8.8, 9.6)));

  const radiusRayDraw = easeInOutCubic(progressBetween(elapsedSeconds, 9.1, 10.6));
  const radiusGlow = pulseEnvelope(elapsedSeconds, 9.2, 9.8, 11.2, 12.0);
  const xNodeOpacity = easeOutCubic(progressBetween(elapsedSeconds, 4.4, 5.4));

  // Ghost outline of target bay pose while r = 5.4 m & sweep are active
  const bayGhostOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 8.8, 9.8)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 28.0, 28.8))) *
    0.34;

  // On-car dimension calipers during staged period (12.12s - 22.42s)
  const lkFadeOutBeforeSweep = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 19.0, 19.7));
  const lCaliperDraw = easeInOutCubic(progressBetween(elapsedSeconds, 12.6, 14.2)) * lkFadeOutBeforeSweep;
  const kCaliperDraw = easeInOutCubic(progressBetween(elapsedSeconds, 15.6, 17.2)) * lkFadeOutBeforeSweep;
  const wCaliperDraw = easeInOutCubic(progressBetween(elapsedSeconds, 19.2, 21.0));
  const wGlow = pulseEnvelope(elapsedSeconds, 19.4, 20.1, 22.0, 22.8);

  // Left 2x2 Input Matrix Chips
  const chip1Opacity = easeOutCubic(progressBetween(elapsedSeconds, 4.4, 5.2));
  const chip1RadiusMorph = easeInOutCubic(progressBetween(elapsedSeconds, 9.1, 9.8));
  const chip1Glow = Math.max(
    pulseEnvelope(elapsedSeconds, 5.8, 6.5, 7.7, 8.3),
    pulseEnvelope(elapsedSeconds, 9.2, 9.8, 11.2, 12.0),
  );

  const chip2Opacity = easeOutCubic(progressBetween(elapsedSeconds, 12.6, 13.4));
  const chip2Glow = pulseEnvelope(elapsedSeconds, 12.8, 13.4, 14.7, 15.3);

  const chip3Opacity = easeOutCubic(progressBetween(elapsedSeconds, 15.6, 16.4));
  const chip3Glow = pulseEnvelope(elapsedSeconds, 15.8, 16.4, 17.7, 18.4);

  const chip4Opacity = easeOutCubic(progressBetween(elapsedSeconds, 19.2, 20.0));
  const chip4Glow = wGlow;

  // Variable pulse inside symbolic formula (0.6s - 22.7s)
  const rVarPulse = pulseFactor(elapsedSeconds, 9.6, 1.2);
  const lVarPulse = pulseFactor(elapsedSeconds, 13.5, 1.2);
  const kVarPulse = pulseFactor(elapsedSeconds, 16.6, 1.2);
  const wVarPulse = pulseFactor(elapsedSeconds, 20.6, 1.2);

  // Formula Card 4-State Evaluation Choreography (y = 528)
  const symbolicOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 0.7, 1.5)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 22.4, 23.0)));

  const numericOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 22.7, 23.4)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 25.8, 26.4)));

  const intermediateOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 26.1, 26.7)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 28.8, 29.4)));

  const finalCardOpacity = easeOutCubic(progressBetween(elapsedSeconds, 29.1, 29.8));
  const finalPulse = pulseEnvelope(elapsedSeconds, 29.6, 30.2, 31.6, 32.6);

  // Dynamic pill width for bottom formula card
  const toNumeric = easeInOutCubic(progressBetween(elapsedSeconds, 22.4, 23.2));
  const toIntermediate = easeInOutCubic(progressBetween(elapsedSeconds, 25.8, 26.5));
  const toFinal = easeInOutCubic(progressBetween(elapsedSeconds, 28.8, 29.5));
  const formulaPillWidth = 568 + 118 * toNumeric - 246 * toIntermediate - 140 * toFinal; // 568 -> 686 -> 440 -> 300

  // RoadStage final clearance callouts (28.0s - 33.0s)
  const carLengthCallout =
    easeOutCubic(progressBetween(elapsedSeconds, 28.0, 28.8)) *
    (1 - 0.45 * easeInOutCubic(progressBetween(elapsedSeconds, 29.8, 30.8)));
  const clearanceCallout = easeOutCubic(progressBetween(elapsedSeconds, 29.4, 30.4));
  const sweepTrailOpacity =
    elapsedSeconds < 19.8 ? 0 : elapsedSeconds > 30.0 ? Math.max(0.32, 1 - (elapsedSeconds - 30.0) / 1.5) : 0.88;

  // Staged car anchor coordinates (valid when 3.6 <= t <= 19.8)
  const stagedFrontBumperY = LANE_STAGE_CENTER_Y - HALF_CAR_LENGTH_PX; // 13.37
  const stagedFrontAxleY = LANE_STAGE_CENTER_Y - HALF_WHEELBASE_PX; // 38.33
  const stagedRearAxleY = LANE_STAGE_CENTER_Y + HALF_WHEELBASE_PX; // 119.45
  const stagedCarLeftX = LANE_STAGE_CENTER_X - HALF_CAR_WIDTH_PX; // 666.30

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">12</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Plugging in Real-World Numbers
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>
          Numerical evaluation of Blackburn's formula with r = 5.4 m, l = 2.6 m, k = 1.3 m, and w = 1.7 m yielding 1.43
          m of extra clearance
        </title>
        <defs>
          <radialGradient id="slide12-ambient-glow" cx="58%" cy="46%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide12-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="slide12-road-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="8%" stopColor="white" stopOpacity={1} />
            <stop offset="85%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="black" stopOpacity={0} />
          </linearGradient>

          <mask id="slide12-road-fade-mask">
            <rect x={430} y={0} width={520} height={476} fill="url(#slide12-road-fade-grad)" />
          </mask>

          <linearGradient id="slide12-asphalt-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.145 0 0)" />
            <stop offset="22%" stopColor="oklch(0.165 0 0)" />
            <stop offset="55%" stopColor="oklch(0.175 0 0)" />
            <stop offset="100%" stopColor="oklch(0.145 0 0)" />
          </linearGradient>

          <linearGradient id="slide12-sidewalk-right-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.88)" />
            <stop offset="55%" stopColor="oklch(0.19 0 0 / 0.42)" />
            <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
          </linearGradient>

          <linearGradient id="slide12-sidewalk-left-grad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.2 0 0 / 0.65)" />
            <stop offset="55%" stopColor="oklch(0.17 0 0 / 0.25)" />
            <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
          </linearGradient>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={305} r={320} fill="url(#slide12-ambient-glow)" />

        {/* ================================================================
            RIGHT HALF: ARCHITECTURAL SCALED ROAD STAGE & PARKING BAY
           ================================================================ */}
        <g opacity={stageFadeIn} mask="url(#slide12-road-fade-mask)">
          {/* Left Shoulder Fade */}
          <rect x={434} y={0} width={76} height={476} fill="url(#slide12-sidewalk-left-grad)" />
          <rect x={ASPHALT_LEFT_X - 4} y={0} width={4} height={476} fill="oklch(0.26 0 0)" />
          <line
            x1={ASPHALT_LEFT_X}
            y1={0}
            x2={ASPHALT_LEFT_X}
            y2={476}
            stroke="oklch(0.52 0 0 / 0.42)"
            strokeWidth={1.15}
          />

          {/* Right Sidewalk */}
          <rect x={KERB_STONE_X + 7} y={0} width={115} height={476} fill="url(#slide12-sidewalk-right-grad)" />
          <g stroke="oklch(0.32 0 0 / 0.34)" strokeWidth={1}>
            {PAVING_JOINT_Y.map((y) => (
              <line key={`pave-${y}`} x1={KERB_STONE_X + 7} y1={y} x2={KERB_STONE_X + 115} y2={y} />
            ))}
          </g>

          {/* Main Asphalt Road Surface */}
          <rect
            x={ASPHALT_LEFT_X}
            y={0}
            width={KERB_STONE_X - ASPHALT_LEFT_X}
            height={476}
            fill="url(#slide12-asphalt-grad)"
          />

          {/* Concrete Kerb */}
          <rect x={KERB_STONE_X} y={0} width={7} height={476} fill="oklch(0.29 0 0)" />
          <line x1={KERB_STONE_X} y1={0} x2={KERB_STONE_X} y2={476} stroke="oklch(0.72 0 0 / 0.65)" strokeWidth={1.4} />
          <g stroke="oklch(0.44 0 0 / 0.65)" strokeWidth={1}>
            {KERB_JOINT_Y.map((y) => (
              <line key={`kerb-${y}`} x1={KERB_STONE_X} y1={y} x2={KERB_STONE_X + 7} y2={y} />
            ))}
          </g>

          {/* Parking Bay Boundary Line & Corner Ticks */}
          <line
            x1={PARKING_LINE_X}
            y1={0}
            x2={PARKING_LINE_X}
            y2={476}
            stroke="oklch(0.62 0 0 / 0.34)"
            strokeWidth={1.2}
            strokeDasharray="7 9"
          />
          <g stroke="oklch(0.66 0 0 / 0.45)" strokeWidth={1.3}>
            <line x1={PARKING_LINE_X} y1={FRONT_CAR_REAR_Y} x2={PARKING_LINE_X + 10} y2={FRONT_CAR_REAR_Y} />
            <line x1={PARKING_LINE_X} y1={330} x2={PARKING_LINE_X + 10} y2={330} />
          </g>

          {/* Center Lane Divider & Directional Flow Arrow */}
          <line
            x1={LANE_DIVIDER_X}
            y1={8}
            x2={LANE_DIVIDER_X}
            y2={468}
            stroke="oklch(0.74 0 0 / 0.4)"
            strokeWidth={1.6}
            strokeDasharray="20 16"
          />
          <g
            transform="translate(682, 412)"
            fill="none"
            stroke="oklch(0.74 0 0 / 0.24)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1={0} y1={14} x2={0} y2={-12} />
            <polyline points="-7,-4 0,-13 7,-4" />
          </g>

          {/* Front Parked Car (Width w = 1.7 m) */}
          <g transform={`translate(${FRONT_CAR_CENTER_X}, ${FRONT_CAR_CENTER_Y}) scale(${FRONT_CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>

          {/* Rear Parked Car */}
          <g transform={`translate(${BAY_CENTER_X}, ${REAR_CAR_CENTER_Y}) scale(${CAR_SCALE})`}>
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
        </g>

        {/* Target Bay Ghost Pose During Setup & Sweep */}
        {bayGhostOpacity > 0.01 ? (
          <g
            transform={`translate(${BAY_CENTER_X}, ${PHASE4_STOP_CENTER_Y}) scale(${CAR_SCALE})`}
            opacity={bayGhostOpacity}
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
            TURNING CIRCLE (DIAMETER 10.8 m -> RADIUS r = 5.4 m)
           ================================================================ */}
        {circleDraw > 0.01 ? (
          <g opacity={1 - 0.55 * circleDimAfterIntro}>
            <circle
              cx={TURNING_CENTER.x}
              cy={TURNING_CENTER.y}
              r={R_PX}
              fill="none"
              stroke="oklch(0.9 0 0 / 0.52)"
              strokeWidth={1.45}
              strokeDasharray={2 * Math.PI * R_PX}
              strokeDashoffset={2 * Math.PI * R_PX * (1 - circleDraw)}
            />
          </g>
        ) : null}

        {/* Diameter 10.8 m Indicator (5.2s - 9.6s) */}
        {diameterFade > 0.01 ? (
          <g opacity={diameterFade}>
            <line
              x1={TURNING_CENTER.x - R_PX}
              y1={TURNING_CENTER.y}
              x2={TURNING_CENTER.x + R_PX}
              y2={TURNING_CENTER.y}
              stroke="oklch(0.97 0 0)"
              strokeWidth={1.7}
              strokeDasharray="5 4"
              filter="url(#slide12-luminous-glow)"
            />
            <g stroke="oklch(0.98 0 0)" strokeWidth={1.5}>
              <line
                x1={TURNING_CENTER.x - R_PX}
                y1={TURNING_CENTER.y - 6}
                x2={TURNING_CENTER.x - R_PX}
                y2={TURNING_CENTER.y + 6}
              />
              <line
                x1={TURNING_CENTER.x + R_PX}
                y1={TURNING_CENTER.y - 6}
                x2={TURNING_CENTER.x + R_PX}
                y2={TURNING_CENTER.y + 6}
              />
            </g>
            <rect
              x={TURNING_CENTER.x - 48}
              y={TURNING_CENTER.y - 44}
              width={96}
              height={26}
              rx={5}
              fill="oklch(0.2 0 0 / 0.92)"
              stroke="oklch(0.94 0 0 / 0.78)"
              strokeWidth={1.2}
            />
            <text
              x={TURNING_CENTER.x}
              y={TURNING_CENTER.y - 26}
              textAnchor="middle"
              className="fill-text-primary font-mono text-xs font-semibold tabular-nums"
            >
              Ø = 10.8 m
            </text>
          </g>
        ) : null}

        {/* Radius r = 5.4 m Ray from X to Target Wheel E */}
        {radiusRayDraw > 0.01 ? (
          <g opacity={1 - 0.45 * circleDimAfterIntro}>
            <line
              x1={TURNING_CENTER.x}
              y1={TURNING_CENTER.y}
              x2={TARGET_E.x}
              y2={TARGET_E.y}
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.85 + 0.5 * radiusGlow}
              strokeDasharray={R_PX}
              strokeDashoffset={R_PX * (1 - radiusRayDraw)}
              filter={radiusGlow > 0.2 ? "url(#slide12-luminous-glow)" : undefined}
            />
            {radiusRayDraw > 0.55 ? (
              <text
                x={716}
                y={248}
                textAnchor="end"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-primary font-mono text-xs font-semibold tabular-nums"
              >
                r = 5.4 m
              </text>
            ) : null}
          </g>
        ) : null}

        {/* Turning Center X Node */}
        {xNodeOpacity > 0.01 ? (
          <g transform={`translate(${TURNING_CENTER.x}, ${TURNING_CENTER.y})`} opacity={xNodeOpacity}>
            <polygon
              points="0,-13 11.26,-6.5 11.26,6.5 0,13 -11.26,6.5 -11.26,-6.5"
              fill="oklch(0.23 0 0 / 0.94)"
              stroke="oklch(0.94 0 0 / 0.88)"
              strokeWidth={1.3}
            />
            <circle cx={0} cy={0} r={4} fill="oklch(0.98 0 0)" filter="url(#slide12-luminous-glow)" />
            <text
              x={0}
              y={27}
              textAnchor="middle"
              stroke="oklch(0.15 0 0 / 0.94)"
              strokeWidth={4}
              strokeLinejoin="round"
              className="svg-label-halo fill-text-primary font-mono text-xs font-semibold"
            >
              X
            </text>
          </g>
        ) : null}

        {/* ================================================================
            STAGED DIMENSION CALIPERS: l = 2.6 m, k = 1.3 m, w = 1.7 m
           ================================================================ */}
        {/* l = 2.6 m along staged hero car */}
        {lCaliperDraw > 0.01 ? (
          <g opacity={lCaliperDraw}>
            <g stroke="oklch(0.84 0 0 / 0.55)" strokeWidth={1.1} strokeDasharray="3 3">
              <line x1={stagedCarLeftX} y1={stagedFrontAxleY} x2={644} y2={stagedFrontAxleY} />
              <line x1={stagedCarLeftX} y1={stagedRearAxleY} x2={644} y2={stagedRearAxleY} />
            </g>
            <line
              x1={650}
              y1={stagedFrontAxleY}
              x2={650}
              y2={stagedRearAxleY}
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.8}
              filter="url(#slide12-luminous-glow)"
            />
            <g stroke="oklch(0.96 0 0)" strokeWidth={1.3}>
              <line x1={646} y1={stagedFrontAxleY} x2={654} y2={stagedFrontAxleY} />
              <line x1={646} y1={stagedRearAxleY} x2={654} y2={stagedRearAxleY} />
            </g>
            <text
              x={639}
              y={(stagedFrontAxleY + stagedRearAxleY) * 0.5 + 4}
              textAnchor="end"
              stroke="oklch(0.15 0 0 / 0.94)"
              strokeWidth={4}
              strokeLinejoin="round"
              className="svg-label-halo fill-text-primary font-mono text-xs font-semibold tabular-nums"
            >
              l = 2.6 m
            </text>
          </g>
        ) : null}

        {/* k = 1.3 m along staged hero car */}
        {kCaliperDraw > 0.01 ? (
          <g opacity={kCaliperDraw}>
            <line
              x1={stagedCarLeftX}
              y1={stagedFrontBumperY}
              x2={644}
              y2={stagedFrontBumperY}
              stroke="oklch(0.84 0 0 / 0.55)"
              strokeWidth={1.1}
              strokeDasharray="3 3"
            />
            <line
              x1={650}
              y1={stagedFrontBumperY}
              x2={650}
              y2={stagedFrontAxleY}
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.8}
              filter="url(#slide12-luminous-glow)"
            />
            <line
              x1={646}
              y1={stagedFrontBumperY}
              x2={654}
              y2={stagedFrontBumperY}
              stroke="oklch(0.96 0 0)"
              strokeWidth={1.3}
            />
            <text
              x={639}
              y={(stagedFrontBumperY + stagedFrontAxleY) * 0.5 + 4}
              textAnchor="end"
              stroke="oklch(0.15 0 0 / 0.94)"
              strokeWidth={4}
              strokeLinejoin="round"
              className="svg-label-halo fill-text-primary font-mono text-xs font-semibold tabular-nums"
            >
              k = 1.3 m
            </text>
          </g>
        ) : null}

        {/* w = 1.7 m across rear bumper of front parked car */}
        {wCaliperDraw > 0.01 ? (
          <g opacity={wCaliperDraw * (1 - 0.45 * clearanceCallout)}>
            <g stroke="oklch(0.84 0 0 / 0.58)" strokeWidth={1.1} strokeDasharray="3 3">
              <line x1={KERB_X - FRONT_CAR_WIDTH_PX} y1={FRONT_CAR_REAR_Y} x2={KERB_X - FRONT_CAR_WIDTH_PX} y2={160} />
              <line x1={KERB_X} y1={FRONT_CAR_REAR_Y} x2={KERB_X} y2={160} />
            </g>
            <line
              x1={KERB_X - FRONT_CAR_WIDTH_PX}
              y1={155}
              x2={KERB_X}
              y2={155}
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.75}
              filter={wGlow > 0.2 ? "url(#slide12-luminous-glow)" : undefined}
            />
            <g stroke="oklch(0.96 0 0)" strokeWidth={1.3}>
              <line x1={KERB_X - FRONT_CAR_WIDTH_PX} y1={151} x2={KERB_X - FRONT_CAR_WIDTH_PX} y2={159} />
              <line x1={KERB_X} y1={151} x2={KERB_X} y2={159} />
            </g>
            <text
              x={FRONT_CAR_CENTER_X}
              y={173}
              textAnchor="middle"
              stroke="oklch(0.15 0 0 / 0.94)"
              strokeWidth={4}
              strokeLinejoin="round"
              className="svg-label-halo fill-text-primary font-mono text-xs font-semibold tabular-nums"
            >
              w = 1.7 m
            </text>
          </g>
        ) : null}

        {/* Single-Sweep Luminous Corner Path Trace */}
        {sweepTrail ? (
          <polyline
            points={sweepTrail}
            fill="none"
            stroke="oklch(0.98 0 0)"
            strokeWidth={2}
            opacity={sweepTrailOpacity}
            filter="url(#slide12-luminous-glow)"
          />
        ) : null}

        {/* ================================================================
            FINAL BAY CLEARANCE CALLOUT: CAR LENGTH L + 1.43 m
           ================================================================ */}
        {carLengthCallout > 0.01 ? (
          <g opacity={carLengthCallout}>
            <g stroke="oklch(0.78 0 0 / 0.55)" strokeWidth={1.1} strokeDasharray="3 3">
              <line x1={KERB_X} y1={HERO_FRONT_BUMPER_FINAL_Y} x2={830} y2={HERO_FRONT_BUMPER_FINAL_Y} />
              <line x1={KERB_X} y1={HERO_REAR_BUMPER_FINAL_Y} x2={830} y2={HERO_REAR_BUMPER_FINAL_Y} />
            </g>
            <line
              x1={824}
              y1={HERO_FRONT_BUMPER_FINAL_Y}
              x2={824}
              y2={HERO_REAR_BUMPER_FINAL_Y}
              stroke="oklch(0.75 0 0 / 0.72)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <g stroke="oklch(0.75 0 0 / 0.72)" strokeWidth={1.3}>
              <line x1={820} y1={HERO_FRONT_BUMPER_FINAL_Y} x2={828} y2={HERO_FRONT_BUMPER_FINAL_Y} />
              <line x1={820} y1={HERO_REAR_BUMPER_FINAL_Y} x2={828} y2={HERO_REAR_BUMPER_FINAL_Y} />
            </g>
            <text
              x={838}
              y={BAY_FINAL_CENTER_Y + 4}
              textAnchor="start"
              className="fill-text-secondary font-mono text-xs font-semibold"
            >
              L
            </text>
          </g>
        ) : null}

        {clearanceCallout > 0.01 ? (
          <g opacity={clearanceCallout}>
            <rect
              x={BAY_CENTER_X - HALF_CAR_WIDTH_PX}
              y={FRONT_CAR_REAR_Y}
              width={SLIDE_12_DIMENSIONS.width}
              height={CLEARANCE_PX}
              rx={3}
              fill="oklch(0.98 0 0 / 0.11)"
              stroke="oklch(0.98 0 0 / 0.75)"
              strokeWidth={1.2}
              strokeDasharray="3 3"
            />
            <line
              x1={KERB_X}
              y1={FRONT_CAR_REAR_Y}
              x2={830}
              y2={FRONT_CAR_REAR_Y}
              stroke="oklch(0.88 0 0 / 0.68)"
              strokeWidth={1.1}
              strokeDasharray="3 3"
            />
            <g stroke="oklch(0.99 0 0)" strokeWidth={2.4} filter="url(#slide12-luminous-glow)">
              <line x1={824} y1={FRONT_CAR_REAR_Y} x2={824} y2={HERO_FRONT_BUMPER_FINAL_Y} />
              <line x1={819} y1={FRONT_CAR_REAR_Y} x2={829} y2={FRONT_CAR_REAR_Y} strokeWidth={1.6} />
              <line x1={819} y1={HERO_FRONT_BUMPER_FINAL_Y} x2={829} y2={HERO_FRONT_BUMPER_FINAL_Y} strokeWidth={1.6} />
            </g>
            <g filter={finalPulse > 0.25 ? "url(#slide12-luminous-glow)" : undefined}>
              <rect
                x={838}
                y={(FRONT_CAR_REAR_Y + HERO_FRONT_BUMPER_FINAL_Y) * 0.5 - 15}
                width={82}
                height={30}
                rx={6}
                fill="oklch(0.22 0 0 / 0.94)"
                stroke="oklch(0.98 0 0 / 0.92)"
                strokeWidth={1.5}
              />
              <text
                x={879}
                y={(FRONT_CAR_REAR_Y + HERO_FRONT_BUMPER_FINAL_Y) * 0.5 + 5}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xs font-semibold tracking-mono tabular-nums"
              >
                + 1.43 m
              </text>
            </g>
          </g>
        ) : null}

        {/* Hero 2D Cut-Plane Car */}
        <g transform={`translate(${pose.centerX}, ${pose.centerY}) rotate(${pose.headingDeg}) scale(${CAR_SCALE})`}>
          <CutPlaneCar
            variant={CarSectionVariants.Hero}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={true}
            frontLeftSteerDeg={pose.frontLeftSteerDeg}
            frontRightSteerDeg={pose.frontRightSteerDeg}
            wheelRollDistance={pose.wheelRollDistance}
            isReversing={pose.isReversing}
            isBraking={pose.isBraking}
          />
        </g>

        {/* ================================================================
            LEFT SIDE: REAL-WORLD PARAMETER INPUT CHIPS (2x2 GRID)
           ================================================================ */}
        <MetricChip
          x={46}
          y={168}
          symbol={chip1RadiusMorph < 0.5 ? "Ø" : "r"}
          value={chip1RadiusMorph < 0.5 ? "10.8 m" : "5.4 m"}
          opacity={chip1Opacity}
          activeGlow={chip1Glow}
        />
        <MetricChip x={238} y={168} symbol="l" value="2.6 m" opacity={chip2Opacity} activeGlow={chip2Glow} />
        <MetricChip x={46} y={242} symbol="k" value="1.3 m" opacity={chip3Opacity} activeGlow={chip3Glow} />
        <MetricChip x={238} y={242} symbol="w" value="1.7 m" opacity={chip4Opacity} activeGlow={chip4Glow} />

        {/* ================================================================
            BOTTOM: NUMERICAL SUBSTITUTION & EVALUATION FORMULA CARD
           ================================================================ */}
        <g transform="translate(480, 530)" opacity={easeOutCubic(progressBetween(elapsedSeconds, 0.5, 1.3))}>
          <rect
            x={-(formulaPillWidth * 0.5)}
            y={-36}
            width={formulaPillWidth}
            height={72}
            rx={10}
            fill="oklch(0.21 0 0 / 0.94)"
            stroke={`oklch(0.95 0 0 / ${(0.84 + 0.14 * finalPulse).toFixed(2)})`}
            strokeWidth={1.5}
          />

          {/* Stage 1: Symbolic Master Formula */}
          {symbolicOpacity > 0.01 ? (
            <g transform="scale(0.84)" opacity={symbolicOpacity}>
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

              {/* (r^2 - l^2) */}
              <text x={-184} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
                (
              </text>
              <text
                x={-169}
                y={8}
                textAnchor="middle"
                filter={rVarPulse > 0.25 ? "url(#slide12-luminous-glow)" : undefined}
                className="fill-text-primary font-mono text-2xl font-semibold"
              >
                r
              </text>
              <text x={-157} y={-8} textAnchor="middle" className="fill-text-primary font-mono text-base font-semibold">
                2
              </text>
              <text x={-141} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
                −
              </text>
              <text
                x={-123}
                y={8}
                textAnchor="middle"
                filter={lVarPulse > 0.25 ? "url(#slide12-luminous-glow)" : undefined}
                className="fill-text-primary font-mono text-2xl font-semibold"
              >
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

              {/* (l + k)^2 */}
              <text x={-54} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
                (
              </text>
              <text
                x={-38}
                y={8}
                textAnchor="middle"
                filter={lVarPulse > 0.25 ? "url(#slide12-luminous-glow)" : undefined}
                className="fill-text-primary font-mono text-2xl font-semibold"
              >
                l
              </text>
              <text x={-20} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
                +
              </text>
              <text
                x={-2}
                y={8}
                textAnchor="middle"
                filter={kVarPulse > 0.25 ? "url(#slide12-luminous-glow)" : undefined}
                className="fill-text-primary font-mono text-2xl font-semibold"
              >
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

              {/* (sqrt(r^2 - l^2) - w)^2 */}
              <path
                d="M 68 -26 Q 59 -6 68 14"
                fill="none"
                stroke="oklch(0.84 0 0)"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <path
                d="M 74 0 L 78 0 L 82 9 L 92 -27 L 164 -27"
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={1.85}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x={100}
                y={8}
                textAnchor="middle"
                filter={rVarPulse > 0.25 ? "url(#slide12-luminous-glow)" : undefined}
                className="fill-text-primary font-mono text-2xl font-semibold"
              >
                r
              </text>
              <text x={112} y={-7} textAnchor="middle" className="fill-text-primary font-mono text-sm font-semibold">
                2
              </text>
              <text x={127} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
                −
              </text>
              <text
                x={143}
                y={8}
                textAnchor="middle"
                filter={lVarPulse > 0.25 ? "url(#slide12-luminous-glow)" : undefined}
                className="fill-text-primary font-mono text-2xl font-semibold"
              >
                l
              </text>
              <text x={155} y={-7} textAnchor="middle" className="fill-text-primary font-mono text-sm font-semibold">
                2
              </text>
              <text x={173} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
                −
              </text>
              <text
                x={190}
                y={8}
                textAnchor="middle"
                filter={wVarPulse > 0.25 ? "url(#slide12-luminous-glow)" : undefined}
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

              {/* - l - k */}
              <text x={252} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
                −
              </text>
              <text
                x={272}
                y={8}
                textAnchor="middle"
                filter={lVarPulse > 0.25 ? "url(#slide12-luminous-glow)" : undefined}
                className="fill-text-primary font-mono text-2xl font-semibold"
              >
                l
              </text>
              <text x={292} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
                −
              </text>
              <text
                x={312}
                y={8}
                textAnchor="middle"
                filter={kVarPulse > 0.25 ? "url(#slide12-luminous-glow)" : undefined}
                className="fill-text-primary font-mono text-2xl font-semibold"
              >
                k
              </text>
            </g>
          ) : null}

          {/* Stage 2: Populated Real-World Values */}
          {numericOpacity > 0.01 ? (
            <g transform="scale(0.82)" opacity={numericOpacity}>
              <text x={-378} y={7} textAnchor="middle" className="fill-text-primary font-mono text-xl font-semibold">
                |AH|
              </text>
              <text x={-338} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                =
              </text>
              <path
                d={OUTER_RADICAL_PATH}
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* (5.4^2 - 2.6^2) */}
              <text x={-286} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                (
              </text>
              <text
                x={-261}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                5.4
              </text>
              <text x={-237} y={-6} textAnchor="middle" className="fill-text-primary font-mono text-sm font-semibold">
                2
              </text>
              <text x={-221} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                −
              </text>
              <text
                x={-196}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                2.6
              </text>
              <text x={-172} y={-6} textAnchor="middle" className="fill-text-primary font-mono text-sm font-semibold">
                2
              </text>
              <text x={-158} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                )
              </text>

              <text x={-140} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                +
              </text>

              {/* (2.6 + 1.3)^2 */}
              <text x={-122} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                (
              </text>
              <text
                x={-97}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                2.6
              </text>
              <text x={-71} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                +
              </text>
              <text
                x={-45}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                1.3
              </text>
              <text x={-20} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                )
              </text>
              <text x={-9} y={-6} textAnchor="middle" className="fill-text-primary font-mono text-sm font-semibold">
                2
              </text>

              <text x={10} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                −
              </text>

              {/* (sqrt(5.4^2 - 2.6^2) - 1.7)^2 */}
              <text x={29} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                (
              </text>
              <path
                d={INNER_RADICAL_PATH}
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={1.65}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x={81}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                5.4
              </text>
              <text x={105} y={-5} textAnchor="middle" className="fill-text-primary font-mono text-xs font-semibold">
                2
              </text>
              <text x={122} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                −
              </text>
              <text
                x={147}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                2.6
              </text>
              <text x={171} y={-5} textAnchor="middle" className="fill-text-primary font-mono text-xs font-semibold">
                2
              </text>
              <text x={190} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                −
              </text>
              <text
                x={216}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                1.7
              </text>
              <text x={242} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                )
              </text>
              <text x={254} y={-7} textAnchor="middle" className="fill-text-primary font-mono text-sm font-semibold">
                2
              </text>

              {/* - 2.6 - 1.3 */}
              <text x={300} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                −
              </text>
              <text
                x={326}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                2.6
              </text>
              <text x={352} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-xl">
                −
              </text>
              <text
                x={378}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                1.3
              </text>
            </g>
          ) : null}

          {/* Stage 3: Intermediate Arithmetic Reduction */}
          {intermediateOpacity > 0.01 ? (
            <g opacity={intermediateOpacity}>
              <text x={-172} y={7} textAnchor="middle" className="fill-text-primary font-mono text-lg font-semibold">
                |AH|
              </text>
              <text x={-136} y={7} textAnchor="middle" className="fill-text-secondary font-mono text-lg">
                =
              </text>
              <path
                d="M -117 0 L -113 0 L -108 9 L -97 -19 L 122 -19"
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x={14}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-lg font-semibold tabular-nums"
              >
                22.40 + 15.21 − 9.20
              </text>
              <text
                x={165}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-lg font-semibold tabular-nums"
              >
                − 3.90
              </text>
            </g>
          ) : null}

          {/* Stage 4: Final Result |AH| = 1.43 m */}
          {finalCardOpacity > 0.01 ? (
            <g opacity={finalCardOpacity} filter={finalPulse > 0.2 ? "url(#slide12-luminous-glow)" : undefined}>
              <text
                x={-78}
                y={8}
                textAnchor="middle"
                className="fill-text-primary font-mono text-2xl font-semibold tracking-mono"
              >
                |AH|
              </text>
              <text x={-26} y={8} textAnchor="middle" className="fill-text-secondary font-mono text-2xl">
                =
              </text>
              <text
                x={62}
                y={8}
                textAnchor="middle"
                className="fill-text-primary font-mono text-2xl font-semibold tracking-mono tabular-nums"
              >
                1.43 m
              </text>
            </g>
          ) : null}
        </g>
      </svg>
    </div>
  );
}
