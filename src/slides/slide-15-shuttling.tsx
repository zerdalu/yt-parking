import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { RootR2MinusL2 } from "@/components/math-formula";
import {
  CarSectionVariants,
  computeAckermannAngles,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  type Point2D,
} from "@/simulation/car-simulator";
import { usePresentationStore } from "@/store/presentation-store";
import type { ReactElement } from "react";

// Act 1 & Act 3 RoadStage parameters
const ROAD_CAR_SCALE = 0.9;
const ROAD_BAY_X = 627;
const ROAD_CAR_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.width * 0.5 * ROAD_CAR_SCALE; // 34.2
const ROAD_CAR_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5 * ROAD_CAR_SCALE; // 75.6
const ROAD_HALF_WHEELBASE = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5 * ROAD_CAR_SCALE; // 46.8
const ROAD_KERB_X = ROAD_BAY_X + ROAD_CAR_HALF_W; // 661.2
const ROAD_KERB_STONE_X = 665;
const ROAD_PARKING_LINE_X = 588;
const ROAD_LANE_DIVIDER_X = 452;
const ROAD_ASPHALT_LEFT_X = 326;

const KERB_JOINT_Y = [56, 132, 208, 284, 360, 436] as const;
const PAVING_JOINT_Y = [76, 160, 244, 328, 412] as const;

// Act 2 Figure 4 Rear-Axle Midpoint Geometry
// Two parallel boundary lines separated by c, opposite circular arcs A -> B -> a of radius R_mid
const FIG4_CAR_SCALE = 0.78;
const FIG4_HALF_WHEELBASE = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5 * FIG4_CAR_SCALE; // 40.56
const FIG4_R_MID = 118; // sqrt(r^2 - l^2) - n/2
const FIG4_Y_TOP = 186;
const FIG4_Y_BOT = 322;
const FIG4_Y_MID = (FIG4_Y_TOP + FIG4_Y_BOT) * 0.5; // 254 (c = 136 -> c/2 = 68)
const FIG4_SIN_ALPHA = (FIG4_Y_MID - FIG4_Y_TOP) / FIG4_R_MID; // 68 / 118 = 0.57627
const FIG4_COS_ALPHA = Math.sqrt(1 - FIG4_SIN_ALPHA * FIG4_SIN_ALPHA); // 0.81726
const FIG4_ALPHA_DEG = (Math.asin(FIG4_SIN_ALPHA) * 180) / Math.PI; // 35.186 deg
const FIG4_PA = FIG4_R_MID * (1 - FIG4_COS_ALPHA); // 21.563 px

const POINT_A_FIG4: Point2D = { x: 450, y: FIG4_Y_TOP };
const CENTER_X_SMALL: Point2D = { x: POINT_A_FIG4.x + FIG4_R_MID, y: FIG4_Y_TOP }; // (568, 186)
const POINT_P_FIG4: Point2D = { x: POINT_A_FIG4.x + FIG4_PA, y: FIG4_Y_TOP }; // (471.56, 186)
const POINT_B_FIG4: Point2D = { x: POINT_P_FIG4.x, y: FIG4_Y_MID }; // (471.56, 254)
const POINT_a_FIG4: Point2D = { x: POINT_A_FIG4.x + 2 * FIG4_PA, y: FIG4_Y_BOT }; // (493.13, 322)
const CENTER_X_LARGE: Point2D = { x: POINT_a_FIG4.x - FIG4_R_MID, y: FIG4_Y_BOT }; // (375.13, 322)

const ARC_AB_PATH = `M ${POINT_A_FIG4.x} ${POINT_A_FIG4.y} A ${FIG4_R_MID} ${FIG4_R_MID} 0 0 0 ${POINT_B_FIG4.x.toFixed(2)} ${POINT_B_FIG4.y}`;
const ARC_Ba_PATH = `M ${POINT_B_FIG4.x.toFixed(2)} ${POINT_B_FIG4.y} A ${FIG4_R_MID} ${FIG4_R_MID} 0 0 1 ${POINT_a_FIG4.x.toFixed(2)} ${POINT_a_FIG4.y}`;
const SINGLE_ARC_LENGTH = FIG4_R_MID * ((FIG4_ALPHA_DEG * Math.PI) / 180);

// Act 3 Forward-Swing Hazard Ghost Car (showing front bumper overhanging pavement)
const FORWARD_HAZARD_CENTER_X = 618;
const FORWARD_HAZARD_CENTER_Y = 252;
const FORWARD_HAZARD_HEADING_DEG = 26;

interface ShuttlePose {
  readonly centerX: number;
  readonly centerY: number;
  readonly headingDeg: number;
  readonly steerDeg: number;
  readonly wheelRollDistance: number;
  readonly isReversing: boolean;
  readonly isBraking: boolean;
}

interface ShuttlePassSpec {
  readonly startTime: number;
  readonly endTime: number;
  readonly startX: number;
  readonly endX: number;
  readonly startY: number;
  readonly endY: number;
  readonly cumulativeRollStart: number;
}

const ACT1_PASSES: readonly ShuttlePassSpec[] = [
  // 4 shuttle passes in c < 1.43 m (0.0s - 7.6s), stepping rearAxleX: 584 -> 592 -> 600 -> 608 -> 615
  { startTime: 0.0, endTime: 1.85, startX: 584, endX: 592, startY: 274, endY: 332, cumulativeRollStart: 0 },
  { startTime: 1.95, endTime: 3.75, startX: 592, endX: 600, startY: 332, endY: 274, cumulativeRollStart: -60 },
  { startTime: 3.85, endTime: 5.65, startX: 600, endX: 608, startY: 274, endY: 332, cumulativeRollStart: -2 },
  { startTime: 5.75, endTime: 7.55, startX: 608, endX: 615, startY: 332, endY: 278, cumulativeRollStart: -60 },
  // 3 tighter shuttle passes after bay squeezes (7.8s - 13.8s), stepping rearAxleX: 615 -> 619 -> 623 -> 627
  { startTime: 7.8, endTime: 9.65, startX: 615, endX: 619, startY: 278, endY: 320, cumulativeRollStart: -6 },
  { startTime: 9.75, endTime: 11.6, startX: 619, endX: 623, startY: 320, endY: 280, cumulativeRollStart: -49 },
  { startTime: 11.7, endTime: 13.7, startX: 623, endX: 627, startY: 280, endY: 318, cumulativeRollStart: -9 },
];

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

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Exact non-holonomic Figure-4 S-curve pass connecting (startX, startY, heading=0) to (endX, endY, heading=0)
 * using two tangent circular arcs of radius R = (pa^2 + halfDy^2) / (2 * pa).
 */
function sampleShuttlePass(seconds: number, pass: ShuttlePassSpec): ShuttlePose {
  const u = easeInOutCubic(progressBetween(seconds, pass.startTime, pass.endTime));
  const deltaX = pass.endX - pass.startX;
  const deltaY = pass.endY - pass.startY;
  const dirY = deltaY >= 0 ? 1 : -1; // +1 = reverse (+Y), -1 = forward (-Y)
  const pa = deltaX * 0.5;
  const halfDy = Math.abs(deltaY) * 0.5;

  // Exact radius R of each circular arc so 2 * R * (1 - cos(alpha)) = deltaX and 2 * R * sin(alpha) = |deltaY|
  const radius = (pa * pa + halfDy * halfDy) / (2 * Math.max(0.5, pa));
  const alphaRad = Math.asin(Math.min(1, halfDy / radius));

  const isFirstArc = u <= 0.5;
  const w = isFirstArc ? 2 * u : 2 * (1 - u);
  const phiRad = alphaRad * w;

  const rearAxleX = isFirstArc
    ? pass.startX + radius * (1 - Math.cos(phiRad))
    : pass.endX - radius * (1 - Math.cos(phiRad));
  const rearAxleY = isFirstArc
    ? pass.startY + dirY * radius * Math.sin(phiRad)
    : pass.endY - dirY * radius * Math.sin(phiRad);

  const headingRad = -dirY * phiRad;
  const headingDeg = radToDeg(headingRad);
  const centerX = rearAxleX + ROAD_HALF_WHEELBASE * Math.sin(headingRad);
  const centerY = rearAxleY - ROAD_HALF_WHEELBASE * Math.cos(headingRad);

  const steerLockDeg = Math.min(34, radToDeg(Math.atan2(ROAD_HALF_WHEELBASE * 2, radius)));
  const entryRamp = easeInOutCubic(progressBetween(u, 0, 0.14));
  const midSwitch = easeInOutCubic(progressBetween(u, 0.4, 0.6));
  const exitRamp = 1 - easeInOutCubic(progressBetween(u, 0.86, 1.0));
  const steerDeg = steerLockDeg * entryRamp * (1 - 2 * midSwitch) * exitRamp;

  const arcLen = 2 * radius * alphaRad;
  const rolled = -dirY * arcLen * u;
  const isMoving = u > 0.01 && u < 0.99;

  return {
    centerX,
    centerY,
    headingDeg,
    steerDeg,
    wheelRollDistance: (pass.cumulativeRollStart + rolled) / ROAD_CAR_SCALE,
    isReversing: isMoving && dirY > 0,
    isBraking: !isMoving || u > 0.88,
  };
}

function computeAct1ShuttlePose(seconds: number): ShuttlePose {
  for (let i = 0; i < ACT1_PASSES.length; i++) {
    const pass = ACT1_PASSES[i];
    if (!pass) {
      continue;
    }
    if (seconds <= pass.endTime) {
      return sampleShuttlePass(seconds, pass);
    }
    const nextPass = ACT1_PASSES[i + 1];
    if (nextPass && seconds < nextPass.startTime) {
      return sampleShuttlePass(pass.endTime, pass);
    }
  }
  const lastPass = ACT1_PASSES[ACT1_PASSES.length - 1];
  if (lastPass) {
    return sampleShuttlePass(lastPass.endTime, lastPass);
  }
  return {
    centerX: ROAD_BAY_X,
    centerY: 271.2,
    headingDeg: 0,
    steerDeg: 0,
    wheelRollDistance: 0,
    isReversing: false,
    isBraking: true,
  };
}

function computeFig4Pose(seconds: number): {
  readonly centerX: number;
  readonly centerY: number;
  readonly headingDeg: number;
  readonly steerDeg: number;
  readonly midpoint: Point2D;
  readonly wheelRollDistance: number;
  readonly isReversing: boolean;
} {
  if (seconds < 18.2) {
    return {
      centerX: POINT_A_FIG4.x,
      centerY: POINT_A_FIG4.y - FIG4_HALF_WHEELBASE,
      headingDeg: 0,
      steerDeg: 0,
      midpoint: POINT_A_FIG4,
      wheelRollDistance: 0,
      isReversing: false,
    };
  }
  if (seconds < 20.5) {
    const u = easeInOutCubic(progressBetween(seconds, 18.2, 20.5));
    const headingDeg = -FIG4_ALPHA_DEG * u;
    const hRad = degToRad(headingDeg);
    const mx = CENTER_X_SMALL.x - FIG4_R_MID * Math.cos(hRad);
    const my = CENTER_X_SMALL.y - FIG4_R_MID * Math.sin(hRad);
    const steerRamp = easeInOutCubic(progressBetween(seconds, 18.2, 18.6));
    return {
      centerX: mx + FIG4_HALF_WHEELBASE * Math.sin(hRad),
      centerY: my - FIG4_HALF_WHEELBASE * Math.cos(hRad),
      headingDeg,
      steerDeg: 34 * steerRamp,
      midpoint: { x: mx, y: my },
      wheelRollDistance: (-SINGLE_ARC_LENGTH * u) / FIG4_CAR_SCALE,
      isReversing: true,
    };
  }
  if (seconds < 22.8) {
    const u = easeInOutCubic(progressBetween(seconds, 20.5, 22.8));
    const headingDeg = -FIG4_ALPHA_DEG * (1 - u);
    const hRad = degToRad(headingDeg);
    const mx = CENTER_X_LARGE.x + FIG4_R_MID * Math.cos(hRad);
    const my = CENTER_X_LARGE.y + FIG4_R_MID * Math.sin(hRad);
    const counterRamp = easeInOutCubic(progressBetween(seconds, 20.5, 20.9));
    const exitRamp = 1 - easeInOutCubic(progressBetween(seconds, 22.4, 22.8));
    return {
      centerX: mx + FIG4_HALF_WHEELBASE * Math.sin(hRad),
      centerY: my - FIG4_HALF_WHEELBASE * Math.cos(hRad),
      headingDeg,
      steerDeg: 34 * (1 - 2 * counterRamp) * exitRamp,
      midpoint: { x: mx, y: my },
      wheelRollDistance: (-SINGLE_ARC_LENGTH * (1 + u)) / FIG4_CAR_SCALE,
      isReversing: true,
    };
  }
  return {
    centerX: POINT_a_FIG4.x,
    centerY: POINT_a_FIG4.y - FIG4_HALF_WHEELBASE,
    headingDeg: 0,
    steerDeg: 0,
    midpoint: POINT_a_FIG4,
    wheelRollDistance: (-2 * SINGLE_ARC_LENGTH) / FIG4_CAR_SCALE,
    isReversing: false,
  };
}

/**
 * Exact non-holonomic circular-arc reverse finish around turning center X on the left (R = 156 px).
 */
function computeAct3FinishPose(seconds: number): ShuttlePose {
  const radius = 156;
  const startHeadingDeg = -22;
  const targetRearAxleX = ROAD_BAY_X; // 627
  const targetRearAxleY = 304;
  const turnCenterX = targetRearAxleX - radius; // 471

  const u = easeInOutCubic(progressBetween(seconds, 26.8, 29.4));
  const headingDeg = startHeadingDeg * (1 - u);
  const headingRad = degToRad(headingDeg);

  const rearAxleX = turnCenterX + radius * Math.cos(headingRad);
  const rearAxleY = targetRearAxleY + radius * Math.sin(headingRad);
  const centerX = rearAxleX + ROAD_HALF_WHEELBASE * Math.sin(headingRad);
  const centerY = rearAxleY - ROAD_HALF_WHEELBASE * Math.cos(headingRad);

  const straighten = easeInOutCubic(progressBetween(seconds, 28.9, 29.4));
  const steerDeg = -31 * (1 - straighten);
  const arcTravel = radius * degToRad(Math.abs(startHeadingDeg)) * u;

  return {
    centerX,
    centerY,
    headingDeg,
    steerDeg,
    wheelRollDistance: -arcTravel / ROAD_CAR_SCALE,
    isReversing: seconds >= 26.8 && seconds < 29.35,
    isBraking: seconds >= 29.0,
  };
}

interface Fig4PointNodeProps {
  readonly point: Point2D;
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly textAnchor: "start" | "middle" | "end";
  readonly opacity: number;
  readonly pulse: number;
}

function Fig4PointNode({
  point,
  label,
  labelX,
  labelY,
  textAnchor,
  opacity,
  pulse,
}: Fig4PointNodeProps): ReactElement | null {
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
        r={3.5 + 1.7 * pulse}
        fill="oklch(0.98 0 0)"
        filter={pulse > 0.1 ? "url(#slide15-luminous-glow)" : undefined}
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor={textAnchor}
        stroke="oklch(0.15 0 0 / 0.94)"
        strokeWidth={4.5}
        strokeLinejoin="round"
        className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
      >
        {label}
      </text>
    </g>
  );
}

export function Slide15Shuttling(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  // Act 1 (0.00s - 14.50s) | Act 2 Figure 4 (14.40s - 26.50s) | Act 3 Reversing Finish (26.40s - 33.00s)
  const act1Opacity =
    easeOutCubic(progressBetween(elapsedSeconds, 0.0, 0.9)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 14.0, 14.7)));
  const act2Opacity =
    easeOutCubic(progressBetween(elapsedSeconds, 14.4, 15.1)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 26.0, 26.7)));
  const act3Opacity = easeOutCubic(progressBetween(elapsedSeconds, 26.3, 27.0));

  // Act 1 Bay Tightening
  const squeezeProgress = easeInOutCubic(progressBetween(elapsedSeconds, 7.6, 9.2));
  const frontParkedCenterY = 88 + 10 * squeezeProgress; // 88 -> 98
  const rearParkedCenterY = 426.4 - 10 * squeezeProgress; // 426.4 -> 416.4
  const frontRearBumperY = frontParkedCenterY + ROAD_CAR_HALF_L; // 163.6 -> 173.6
  const rearFrontBumperY = rearParkedCenterY - ROAD_CAR_HALF_L; // 350.8 -> 340.8
  const act1Pose = computeAct1ShuttlePose(elapsedSeconds);
  const act1Ack = computeAckermannAngles(act1Pose.steerDeg, DEFAULT_VEHICLE_DIMENSIONS);

  // Act 2 Figure 4 Choreography
  const fig4Pose = computeFig4Pose(elapsedSeconds);
  const fig4Ack = computeAckermannAngles(fig4Pose.steerDeg, DEFAULT_VEHICLE_DIMENSIONS);
  const arc1Draw = easeInOutCubic(progressBetween(elapsedSeconds, 18.2, 20.5));
  const arc2Draw = easeInOutCubic(progressBetween(elapsedSeconds, 20.5, 22.8));
  const smallCenterOpacity = easeOutCubic(progressBetween(elapsedSeconds, 17.6, 18.4));
  const largeCenterOpacity = easeOutCubic(progressBetween(elapsedSeconds, 19.9, 20.7));
  const dropPerpDraw = easeInOutCubic(progressBetween(elapsedSeconds, 22.6, 23.6));
  const paStepReveal = easeOutCubic(progressBetween(elapsedSeconds, 23.3, 24.3));
  const twoPaGlow = pulseEnvelope(elapsedSeconds, 24.0, 24.6, 25.8, 26.4);

  const pulseA = pulseFactor(elapsedSeconds, 24.8, 0.7);
  const pulseB = pulseFactor(elapsedSeconds, 20.5, 0.7);
  const pulseP = pulseFactor(elapsedSeconds, 24.5, 0.7);

  // Act 3 Finish by Reversing vs Forward Swing Over Pavement
  const act3Pose = computeAct3FinishPose(elapsedSeconds);
  const act3Ack = computeAckermannAngles(act3Pose.steerDeg, DEFAULT_VEHICLE_DIMENSIONS);
  const forwardHazardOpacity = easeOutCubic(progressBetween(elapsedSeconds, 28.6, 29.5)) * 0.85;
  const forwardSwingGlow = pulseEnvelope(elapsedSeconds, 29.1, 29.7, 31.4, 32.5);

  const hazRad = degToRad(FORWARD_HAZARD_HEADING_DEG);
  const hazFrontRightCorner: Point2D = {
    x: FORWARD_HAZARD_CENTER_X + ROAD_CAR_HALF_W * Math.cos(hazRad) - -ROAD_CAR_HALF_L * Math.sin(hazRad),
    y: FORWARD_HAZARD_CENTER_Y + ROAD_CAR_HALF_W * Math.sin(hazRad) + -ROAD_CAR_HALF_L * Math.cos(hazRad),
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Minimal Slide Title */}
      <div className="pointer-events-none absolute top-8 left-10 z-10 flex flex-col gap-1">
        <span className="font-mono text-xs tracking-mono text-text-muted tabular-nums">15</span>
        <h1 className="font-display text-2xl font-heading tracking-heading text-text-primary">
          Shuttling To and Fro in Tight Spaces
        </h1>
      </div>

      <svg viewBox="0 0 960 620" className="h-full w-full max-w-6xl p-4 select-none">
        <title>
          Multi-point shuttling inside tight spaces and Blackburn Figure 4 rear-axle midpoint S-curve A to B to a with
          2|PA| inward gain
        </title>
        <defs>
          <radialGradient id="slide15-ambient-glow" cx="50%" cy="48%" r="54%">
            <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.5)" />
            <stop offset="62%" stopColor="oklch(0.2 0 0 / 0.2)" />
            <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
          </radialGradient>

          <filter id="slide15-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="slide15-road-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" stopOpacity={0} />
            <stop offset="9%" stopColor="white" stopOpacity={1} />
            <stop offset="88%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="black" stopOpacity={0} />
          </linearGradient>

          <mask id="slide15-road-fade-mask">
            <rect x={0} y={0} width={960} height={540} fill="url(#slide15-road-fade-grad)" />
          </mask>

          <linearGradient id="slide15-asphalt-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.145 0 0)" />
            <stop offset="20%" stopColor="oklch(0.165 0 0)" />
            <stop offset="52%" stopColor="oklch(0.175 0 0)" />
            <stop offset="100%" stopColor="oklch(0.145 0 0)" />
          </linearGradient>

          <linearGradient id="slide15-sidewalk-right-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.88)" />
            <stop offset="55%" stopColor="oklch(0.19 0 0 / 0.42)" />
            <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
          </linearGradient>

          <linearGradient id="slide15-sidewalk-left-grad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.21 0 0 / 0.8)" />
            <stop offset="55%" stopColor="oklch(0.18 0 0 / 0.35)" />
            <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
          </linearGradient>

          <CutPlaneCarDefs />
        </defs>

        {/* Soft Ambient Radial Glow */}
        <circle cx={480} cy={305} r={315} fill="url(#slide15-ambient-glow)" />

        {/* ================================================================
            ACT 1 (0s - 14.5s): TIGHT-GAP MULTI-POINT SHUTTLING
           ================================================================ */}
        {act1Opacity > 0.01 ? (
          <g opacity={act1Opacity}>
            <g mask="url(#slide15-road-fade-mask)">
              <rect
                x={ROAD_ASPHALT_LEFT_X - 105}
                y={0}
                width={99}
                height={540}
                fill="url(#slide15-sidewalk-left-grad)"
              />
              <rect x={ROAD_ASPHALT_LEFT_X - 6} y={0} width={6} height={540} fill="oklch(0.27 0 0)" />
              <line
                x1={ROAD_ASPHALT_LEFT_X}
                y1={0}
                x2={ROAD_ASPHALT_LEFT_X}
                y2={540}
                stroke="oklch(0.54 0 0 / 0.45)"
                strokeWidth={1.25}
              />

              <rect x={ROAD_KERB_STONE_X + 8} y={0} width={150} height={540} fill="url(#slide15-sidewalk-right-grad)" />
              <g stroke="oklch(0.32 0 0 / 0.34)" strokeWidth={1}>
                {PAVING_JOINT_Y.map((y) => (
                  <line key={`a1-pave-${y}`} x1={ROAD_KERB_STONE_X + 8} y1={y} x2={ROAD_KERB_STONE_X + 140} y2={y} />
                ))}
              </g>

              <rect
                x={ROAD_ASPHALT_LEFT_X}
                y={0}
                width={ROAD_KERB_STONE_X - ROAD_ASPHALT_LEFT_X}
                height={540}
                fill="url(#slide15-asphalt-grad)"
              />

              <rect x={ROAD_KERB_STONE_X} y={0} width={8} height={540} fill="oklch(0.29 0 0)" />
              <line
                x1={ROAD_KERB_STONE_X}
                y1={0}
                x2={ROAD_KERB_STONE_X}
                y2={540}
                stroke="oklch(0.72 0 0 / 0.65)"
                strokeWidth={1.5}
              />
              <g stroke="oklch(0.44 0 0 / 0.65)" strokeWidth={1}>
                {KERB_JOINT_Y.map((y) => (
                  <line key={`a1-kerb-${y}`} x1={ROAD_KERB_STONE_X} y1={y} x2={ROAD_KERB_STONE_X + 8} y2={y} />
                ))}
              </g>

              <line
                x1={ROAD_PARKING_LINE_X}
                y1={0}
                x2={ROAD_PARKING_LINE_X}
                y2={540}
                stroke="oklch(0.62 0 0 / 0.34)"
                strokeWidth={1.2}
                strokeDasharray="8 10"
              />
              <line
                x1={ROAD_LANE_DIVIDER_X}
                y1={8}
                x2={ROAD_LANE_DIVIDER_X}
                y2={532}
                stroke="oklch(0.74 0 0 / 0.4)"
                strokeWidth={1.7}
                strokeDasharray="22 18"
              />

              {/* Front & Rear Parked Cars */}
              <g transform={`translate(${ROAD_BAY_X}, ${frontParkedCenterY}) scale(${ROAD_CAR_SCALE})`}>
                <CutPlaneCar
                  variant={CarSectionVariants.Parked}
                  kerbSide={KerbSides.Right}
                  showBoundingBox={false}
                  showVertexLabels={false}
                  showAxlePlaneLines={false}
                />
              </g>
              <g transform={`translate(${ROAD_BAY_X}, ${rearParkedCenterY}) scale(${ROAD_CAR_SCALE})`}>
                <CutPlaneCar
                  variant={CarSectionVariants.Parked}
                  kerbSide={KerbSides.Right}
                  showBoundingBox={false}
                  showVertexLabels={false}
                  showAxlePlaneLines={false}
                />
              </g>
            </g>

            {/* Tight Extra-Space Bracket: c < 1.43 m */}
            <g stroke="oklch(0.84 0 0 / 0.62)" strokeWidth={1.1} strokeDasharray="3 3">
              <line x1={ROAD_KERB_X} y1={frontRearBumperY} x2={702} y2={frontRearBumperY} />
              <line x1={ROAD_KERB_X} y1={rearFrontBumperY} x2={702} y2={rearFrontBumperY} />
            </g>
            <g stroke="oklch(0.95 0 0 / 0.85)" strokeWidth={1.6}>
              <line x1={694} y1={frontRearBumperY} x2={694} y2={frontRearBumperY + 28} />
              <line x1={690} y1={frontRearBumperY} x2={698} y2={frontRearBumperY} />
            </g>
            <rect
              x={704}
              y={frontRearBumperY - 6}
              width={98}
              height={30}
              rx={6}
              fill="oklch(0.22 0 0 / 0.92)"
              stroke="oklch(0.94 0 0 / 0.8)"
              strokeWidth={1.3}
            />
            <text
              x={753}
              y={frontRearBumperY + 13}
              textAnchor="middle"
              className="fill-text-primary text-xs font-semibold"
            >
              {squeezeProgress < 0.5 ? (
                <>
                  <tspan className="font-math text-sm italic">c</tspan>
                  <tspan className="fill-text-secondary font-math font-normal"> &lt; </tspan>
                  <tspan className="font-mono tabular-nums">1.43 m</tspan>
                </>
              ) : (
                <>
                  <tspan className="font-math text-sm italic">c</tspan>
                  <tspan className="fill-text-secondary font-math font-normal"> &gt; </tspan>
                  <tspan className="font-mono tabular-nums">0</tspan>
                </>
              )}
            </text>

            {/* Hero Car Shuttling Along True Non-Holonomic S-Curves */}
            <g
              transform={`translate(${act1Pose.centerX}, ${act1Pose.centerY}) rotate(${act1Pose.headingDeg}) scale(${ROAD_CAR_SCALE})`}
            >
              <CutPlaneCar
                variant={CarSectionVariants.Hero}
                kerbSide={KerbSides.Right}
                showBoundingBox={false}
                showVertexLabels={false}
                showAxlePlaneLines={true}
                frontLeftSteerDeg={act1Ack.frontLeftSteerDeg}
                frontRightSteerDeg={act1Ack.frontRightSteerDeg}
                wheelRollDistance={act1Pose.wheelRollDistance}
                isReversing={act1Pose.isReversing}
                isBraking={act1Pose.isBraking}
              />
            </g>
          </g>
        ) : null}

        {/* ================================================================
            ACT 2 (14.4s - 26.5s): FIGURE 4 GEOMETRY (A -> B -> a, 2|PA|)
           ================================================================ */}
        {act2Opacity > 0.01 ? (
          <g opacity={act2Opacity}>
            {/* Kerb Line on Right */}
            <line
              x1={636}
              y1={96}
              x2={636}
              y2={420}
              stroke="oklch(0.76 0 0 / 0.34)"
              strokeWidth={1.3}
              strokeDasharray="4 5"
            />

            {/* Two Parallel Horizontal Boundary Lines Separated by c */}
            <g stroke="oklch(0.86 0 0 / 0.65)" strokeWidth={1.35}>
              <line x1={326} y1={FIG4_Y_TOP} x2={636} y2={FIG4_Y_TOP} />
              <line x1={326} y1={FIG4_Y_BOT} x2={636} y2={FIG4_Y_BOT} />
            </g>

            {/* Right-Side Boundary Gap c Caliper */}
            <g>
              <g stroke="oklch(0.84 0 0 / 0.55)" strokeWidth={1.1} strokeDasharray="3 3">
                <line x1={636} y1={FIG4_Y_TOP} x2={668} y2={FIG4_Y_TOP} />
                <line x1={636} y1={FIG4_Y_BOT} x2={668} y2={FIG4_Y_BOT} />
              </g>
              <line x1={662} y1={FIG4_Y_TOP} x2={662} y2={FIG4_Y_BOT} stroke="oklch(0.95 0 0)" strokeWidth={1.6} />
              <g stroke="oklch(0.95 0 0)" strokeWidth={1.35}>
                <line x1={658} y1={FIG4_Y_TOP} x2={666} y2={FIG4_Y_TOP} />
                <line x1={658} y1={FIG4_Y_BOT} x2={666} y2={FIG4_Y_BOT} />
              </g>
              <text
                x={676}
                y={FIG4_Y_MID + 5}
                textAnchor="start"
                className="fill-text-primary font-math text-base font-semibold italic"
              >
                c
              </text>
            </g>

            {/* Translucent Cut-Plane Car Following Midpoint Path A -> B -> a */}
            <g
              transform={`translate(${fig4Pose.centerX}, ${fig4Pose.centerY}) rotate(${fig4Pose.headingDeg}) scale(${FIG4_CAR_SCALE})`}
              opacity={0.34}
            >
              <CutPlaneCar
                variant={CarSectionVariants.Hero}
                kerbSide={KerbSides.Right}
                showBoundingBox={false}
                showVertexLabels={false}
                showAxlePlaneLines={true}
                frontLeftSteerDeg={fig4Ack.frontLeftSteerDeg}
                frontRightSteerDeg={fig4Ack.frontRightSteerDeg}
                wheelRollDistance={fig4Pose.wheelRollDistance}
                isReversing={fig4Pose.isReversing}
              />
            </g>

            {/* Turning Center x (Right) Radii & Arc AB */}
            {smallCenterOpacity > 0.01 ? (
              <g opacity={smallCenterOpacity}>
                <g stroke="oklch(0.84 0 0 / 0.45)" strokeWidth={1.2} strokeDasharray="4 4">
                  <line x1={CENTER_X_SMALL.x} y1={CENTER_X_SMALL.y} x2={POINT_A_FIG4.x} y2={POINT_A_FIG4.y} />
                  <line x1={CENTER_X_SMALL.x} y1={CENTER_X_SMALL.y} x2={POINT_B_FIG4.x} y2={POINT_B_FIG4.y} />
                </g>
                <text
                  x={526}
                  y={230}
                  textAnchor="start"
                  className="fill-text-secondary font-math text-sm font-semibold italic"
                >
                  R
                </text>
                <g transform={`translate(${CENTER_X_SMALL.x}, ${CENTER_X_SMALL.y})`}>
                  <circle cx={0} cy={0} r={4} fill="oklch(0.98 0 0)" />
                  <text
                    x={12}
                    y={5}
                    textAnchor="start"
                    stroke="oklch(0.15 0 0 / 0.94)"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
                  >
                    x
                  </text>
                </g>
              </g>
            ) : null}

            {/* Turning Center X (Left) Radii & Arc Ba */}
            {largeCenterOpacity > 0.01 ? (
              <g opacity={largeCenterOpacity}>
                <g stroke="oklch(0.84 0 0 / 0.45)" strokeWidth={1.2} strokeDasharray="4 4">
                  <line x1={CENTER_X_LARGE.x} y1={CENTER_X_LARGE.y} x2={POINT_B_FIG4.x} y2={POINT_B_FIG4.y} />
                  <line x1={CENTER_X_LARGE.x} y1={CENTER_X_LARGE.y} x2={POINT_a_FIG4.x} y2={POINT_a_FIG4.y} />
                </g>
                <g transform={`translate(${CENTER_X_LARGE.x}, ${CENTER_X_LARGE.y})`}>
                  <polygon
                    points="0,-13 11.26,-6.5 11.26,6.5 0,13 -11.26,6.5 -11.26,-6.5"
                    fill="oklch(0.24 0 0 / 0.94)"
                    stroke="oklch(0.94 0 0 / 0.9)"
                    strokeWidth={1.3}
                  />
                  <circle cx={0} cy={0} r={4} fill="oklch(0.98 0 0)" />
                  <text
                    x={-18}
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
              </g>
            ) : null}

            {/* Luminous Opposite Circular Arcs A -> B and B -> a */}
            {arc1Draw > 0.01 ? (
              <path
                d={ARC_AB_PATH}
                fill="none"
                stroke="oklch(0.99 0 0)"
                strokeWidth={2.5}
                strokeDasharray={SINGLE_ARC_LENGTH}
                strokeDashoffset={SINGLE_ARC_LENGTH * (1 - arc1Draw)}
                filter="url(#slide15-luminous-glow)"
              />
            ) : null}

            {arc2Draw > 0.01 ? (
              <path
                d={ARC_Ba_PATH}
                fill="none"
                stroke="oklch(0.99 0 0)"
                strokeWidth={2.5}
                strokeDasharray={SINGLE_ARC_LENGTH}
                strokeDashoffset={SINGLE_ARC_LENGTH * (1 - arc2Draw)}
                filter="url(#slide15-luminous-glow)"
              />
            ) : null}

            {/* Perpendicular B -> P & Right-Angle Marker at P */}
            {dropPerpDraw > 0.01 ? (
              <g opacity={dropPerpDraw}>
                <line
                  x1={POINT_B_FIG4.x}
                  y1={POINT_B_FIG4.y}
                  x2={POINT_P_FIG4.x}
                  y2={POINT_P_FIG4.y}
                  stroke="oklch(0.94 0 0 / 0.85)"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <path
                  d={`M ${POINT_P_FIG4.x + 10} ${POINT_P_FIG4.y} L ${POINT_P_FIG4.x + 10} ${POINT_P_FIG4.y + 10} L ${POINT_P_FIG4.x} ${POINT_P_FIG4.y + 10}`}
                  fill="none"
                  stroke="oklch(0.92 0 0 / 0.85)"
                  strokeWidth={1.2}
                />
              </g>
            ) : null}

            {/* Top |PA| & Bottom 2|PA| Inward Step Calipers */}
            {paStepReveal > 0.01 ? (
              <g opacity={paStepReveal}>
                {/* Top |PA| bracket */}
                <path
                  d={`M ${POINT_A_FIG4.x} ${FIG4_Y_TOP - 22} L ${POINT_A_FIG4.x} ${FIG4_Y_TOP - 29} L ${POINT_P_FIG4.x} ${FIG4_Y_TOP - 29} L ${POINT_P_FIG4.x} ${FIG4_Y_TOP - 22}`}
                  fill="none"
                  stroke="oklch(0.95 0 0)"
                  strokeWidth={1.45}
                />
                <text
                  x={(POINT_A_FIG4.x + POINT_P_FIG4.x) * 0.5}
                  y={FIG4_Y_TOP - 37}
                  textAnchor="middle"
                  className="fill-text-primary font-math text-sm font-semibold"
                >
                  |PA|
                </text>

                {/* Vertical projection lines down to 2|PA| bracket */}
                <g stroke="oklch(0.84 0 0 / 0.52)" strokeWidth={1.1} strokeDasharray="3 3">
                  <line x1={POINT_A_FIG4.x} y1={FIG4_Y_TOP} x2={POINT_A_FIG4.x} y2={366} />
                  <line x1={POINT_a_FIG4.x} y1={FIG4_Y_BOT} x2={POINT_a_FIG4.x} y2={366} />
                </g>

                <g filter={twoPaGlow > 0.2 ? "url(#slide15-luminous-glow)" : undefined}>
                  <path
                    d={`M ${POINT_A_FIG4.x} 354 L ${POINT_A_FIG4.x} 362 L ${POINT_a_FIG4.x} 362 L ${POINT_a_FIG4.x} 354`}
                    fill="none"
                    stroke="oklch(0.99 0 0)"
                    strokeWidth={1.9}
                  />
                  <text
                    x={(POINT_A_FIG4.x + POINT_a_FIG4.x) * 0.5}
                    y={383}
                    textAnchor="middle"
                    className="fill-text-primary font-math text-base font-semibold"
                  >
                    <tspan className="font-mono tabular-nums">2</tspan>
                    <tspan>|PA|</tspan>
                  </text>
                </g>
              </g>
            ) : null}

            {/* Live Rear-Axle Midpoint Tracker Dot */}
            <circle
              cx={fig4Pose.midpoint.x}
              cy={fig4Pose.midpoint.y}
              r={4.8}
              fill="oklch(0.99 0 0)"
              filter="url(#slide15-luminous-glow)"
            />

            {/* Figure 4 Vertices: A, P, B, a */}
            <Fig4PointNode
              point={POINT_A_FIG4}
              label="A"
              labelX={POINT_A_FIG4.x - 10}
              labelY={POINT_A_FIG4.y - 8}
              textAnchor="end"
              opacity={1}
              pulse={pulseA}
            />
            <Fig4PointNode
              point={POINT_P_FIG4}
              label="P"
              labelX={POINT_P_FIG4.x + 8}
              labelY={POINT_P_FIG4.y - 8}
              textAnchor="start"
              opacity={dropPerpDraw}
              pulse={pulseP}
            />
            <Fig4PointNode
              point={POINT_B_FIG4}
              label="B"
              labelX={POINT_B_FIG4.x + 12}
              labelY={POINT_B_FIG4.y + 4}
              textAnchor="start"
              opacity={arc1Draw > 0.9 ? 1 : 0.35}
              pulse={pulseB}
            />
            <Fig4PointNode
              point={POINT_a_FIG4}
              label="a"
              labelX={POINT_a_FIG4.x + 12}
              labelY={POINT_a_FIG4.y - 8}
              textAnchor="start"
              opacity={arc2Draw > 0.9 ? 1 : 0.35}
              pulse={twoPaGlow}
            />

            {/* Bottom Figure 4 Equation Pill */}
            <g transform="translate(480, 514)">
              <rect
                x={-194}
                y={-26}
                width={388}
                height={50}
                rx={8}
                fill="oklch(0.21 0 0 / 0.94)"
                stroke="oklch(0.95 0 0 / 0.85)"
                strokeWidth={1.4}
              />

              {/* Left Formula: Δx = 2|PA| */}
              <text
                x={-108}
                y={5}
                textAnchor="middle"
                filter={twoPaGlow > 0.2 ? "url(#slide15-luminous-glow)" : undefined}
                className="fill-text-primary font-math text-base font-semibold"
              >
                <tspan>Δ</tspan>
                <tspan className="italic">x</tspan>
                <tspan className="fill-text-secondary font-normal"> = </tspan>
                <tspan className="font-mono tabular-nums">2</tspan>
                <tspan>|PA|</tspan>
              </text>

              {/* Structural Divider */}
              <line x1={-40} y1={-14} x2={-40} y2={14} stroke="oklch(0.55 0 0 / 0.65)" strokeWidth={1.2} />

              {/* Right Formula: R = √(r² − l²) − n / 2 */}
              <text
                x={-18}
                y={5}
                textAnchor="middle"
                className="fill-text-primary font-math text-base font-semibold italic"
              >
                R
              </text>
              <text x={0} y={5} textAnchor="middle" className="fill-text-secondary font-math text-base">
                =
              </text>
              <g className="text-text-primary">
                <RootR2MinusL2 x={50} y={3} scale={1.06} />
              </g>
              <text x={128} y={5} textAnchor="middle" className="font-math text-base font-semibold">
                <tspan className="fill-text-secondary font-normal">− </tspan>
                <tspan className="fill-text-primary italic">n</tspan>
                <tspan className="fill-text-secondary font-normal"> / </tspan>
                <tspan className="fill-text-primary font-mono tabular-nums">2</tspan>
              </text>
            </g>
          </g>
        ) : null}

        {/* ================================================================
            ACT 3 (26.4s - 33.0s): FINISH BY REVERSING VS FORWARD OVER PAVEMENT
           ================================================================ */}
        {act3Opacity > 0.01 ? (
          <g opacity={act3Opacity}>
            <g mask="url(#slide15-road-fade-mask)">
              <rect
                x={ROAD_ASPHALT_LEFT_X - 105}
                y={0}
                width={99}
                height={540}
                fill="url(#slide15-sidewalk-left-grad)"
              />
              <rect x={ROAD_ASPHALT_LEFT_X - 6} y={0} width={6} height={540} fill="oklch(0.27 0 0)" />
              <line
                x1={ROAD_ASPHALT_LEFT_X}
                y1={0}
                x2={ROAD_ASPHALT_LEFT_X}
                y2={540}
                stroke="oklch(0.54 0 0 / 0.45)"
                strokeWidth={1.25}
              />

              <rect x={ROAD_KERB_STONE_X + 8} y={0} width={150} height={540} fill="url(#slide15-sidewalk-right-grad)" />
              <g stroke="oklch(0.32 0 0 / 0.34)" strokeWidth={1}>
                {PAVING_JOINT_Y.map((y) => (
                  <line key={`a3-pave-${y}`} x1={ROAD_KERB_STONE_X + 8} y1={y} x2={ROAD_KERB_STONE_X + 140} y2={y} />
                ))}
              </g>

              <rect
                x={ROAD_ASPHALT_LEFT_X}
                y={0}
                width={ROAD_KERB_STONE_X - ROAD_ASPHALT_LEFT_X}
                height={540}
                fill="url(#slide15-asphalt-grad)"
              />

              <rect x={ROAD_KERB_STONE_X} y={0} width={8} height={540} fill="oklch(0.29 0 0)" />
              <line
                x1={ROAD_KERB_STONE_X}
                y1={0}
                x2={ROAD_KERB_STONE_X}
                y2={540}
                stroke="oklch(0.72 0 0 / 0.65)"
                strokeWidth={1.5}
              />
              <g stroke="oklch(0.44 0 0 / 0.65)" strokeWidth={1}>
                {KERB_JOINT_Y.map((y) => (
                  <line key={`a3-kerb-${y}`} x1={ROAD_KERB_STONE_X} y1={y} x2={ROAD_KERB_STONE_X + 8} y2={y} />
                ))}
              </g>

              <line
                x1={ROAD_PARKING_LINE_X}
                y1={0}
                x2={ROAD_PARKING_LINE_X}
                y2={540}
                stroke="oklch(0.62 0 0 / 0.34)"
                strokeWidth={1.2}
                strokeDasharray="8 10"
              />
              <line
                x1={ROAD_LANE_DIVIDER_X}
                y1={8}
                x2={ROAD_LANE_DIVIDER_X}
                y2={532}
                stroke="oklch(0.74 0 0 / 0.4)"
                strokeWidth={1.7}
                strokeDasharray="22 18"
              />

              {/* Front & Rear Parked Cars */}
              <g transform={`translate(${ROAD_BAY_X}, 88) scale(${ROAD_CAR_SCALE})`}>
                <CutPlaneCar
                  variant={CarSectionVariants.Parked}
                  kerbSide={KerbSides.Right}
                  showBoundingBox={false}
                  showVertexLabels={false}
                  showAxlePlaneLines={false}
                />
              </g>
              <g transform={`translate(${ROAD_BAY_X}, 426.4) scale(${ROAD_CAR_SCALE})`}>
                <CutPlaneCar
                  variant={CarSectionVariants.Parked}
                  kerbSide={KerbSides.Right}
                  showBoundingBox={false}
                  showVertexLabels={false}
                  showAxlePlaneLines={false}
                />
              </g>
            </g>

            {/* Contrasting Forward-Finish Hazard Ghost Swinging Front Bumper Over Pavement */}
            {forwardHazardOpacity > 0.01 ? (
              <g opacity={forwardHazardOpacity}>
                <g
                  transform={`translate(${FORWARD_HAZARD_CENTER_X}, ${FORWARD_HAZARD_CENTER_Y}) rotate(${FORWARD_HAZARD_HEADING_DEG}) scale(${ROAD_CAR_SCALE})`}
                  opacity={0.42}
                >
                  <CutPlaneCar
                    variant={CarSectionVariants.Ghost}
                    kerbSide={KerbSides.Right}
                    showBoundingBox={false}
                    showVertexLabels={false}
                    showAxlePlaneLines={false}
                  />
                </g>

                {/* Overhang Highlight Over Pavement Sidewalk */}
                <path
                  d={`M ${ROAD_KERB_STONE_X} ${hazFrontRightCorner.y - 16} Q ${hazFrontRightCorner.x + 8} ${hazFrontRightCorner.y}, ${ROAD_KERB_STONE_X} ${hazFrontRightCorner.y + 18}`}
                  fill="oklch(0.7 0.16 25 / 0.2)"
                  stroke="oklch(0.84 0.16 25)"
                  strokeWidth={1.75}
                  strokeDasharray="4 3"
                  opacity={0.45 + 0.55 * forwardSwingGlow}
                />
                <circle
                  cx={hazFrontRightCorner.x}
                  cy={hazFrontRightCorner.y}
                  r={10}
                  fill="oklch(0.7 0.16 25 / 0.22)"
                  stroke="oklch(0.86 0.16 25)"
                  strokeWidth={1.6}
                  opacity={0.5 + 0.5 * forwardSwingGlow}
                />
                <circle cx={hazFrontRightCorner.x} cy={hazFrontRightCorner.y} r={4} fill="oklch(0.86 0.16 25)" />
              </g>
            ) : null}

            {/* Solid Hero Car Finishing Safely by Reversing Along Circular Arc Inside the Kerb */}
            <g
              transform={`translate(${act3Pose.centerX}, ${act3Pose.centerY}) rotate(${act3Pose.headingDeg}) scale(${ROAD_CAR_SCALE})`}
            >
              <CutPlaneCar
                variant={CarSectionVariants.Hero}
                kerbSide={KerbSides.Right}
                showBoundingBox={false}
                showVertexLabels={false}
                showAxlePlaneLines={true}
                frontLeftSteerDeg={act3Ack.frontLeftSteerDeg}
                frontRightSteerDeg={act3Ack.frontRightSteerDeg}
                wheelRollDistance={act3Pose.wheelRollDistance}
                isReversing={act3Pose.isReversing}
                isBraking={act3Pose.isBraking}
              />
            </g>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
