import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { RootR2MinusL2 } from "@/components/math-formula";
import {
  CarSectionVariants,
  computeAckermannAngles,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  type Point2D,
  type VehicleDimensions,
} from "@/simulation/car-simulator";
import {
  buildShuttleMidpointTrail,
  computeSSweepMetrics,
  degToRad,
  easeInOutCubic,
  easeInOutSine,
  easeOutCubic,
  localPointToWorld,
  progressBetween,
  pulseEnvelope,
  pulseFactor,
  radToDeg,
  sampleRealisticSSweep,
  sampleShuttlePassSequence,
  sampleStraightSegment,
  type ShortVehiclePose,
  type ShuttlePassDefinition,
  TravelDirections,
} from "@/simulation/short-kinematics";
import { usePresentationStore } from "@/store/presentation-store";
import { useMemo, type ReactElement } from "react";

// Act 1 RoadStage parameters (540x960 portrait safe zone)
const ROAD_CAR_SCALE = 0.72;
const ROAD_DIMENSIONS: VehicleDimensions = {
  width: DEFAULT_VEHICLE_DIMENSIONS.width * ROAD_CAR_SCALE, // 54.72 px
  length: DEFAULT_VEHICLE_DIMENSIONS.length * ROAD_CAR_SCALE, // 120.96 px
  wheelbase: DEFAULT_VEHICLE_DIMENSIONS.wheelbase * ROAD_CAR_SCALE, // 74.88 px
  frontOverhang: DEFAULT_VEHICLE_DIMENSIONS.frontOverhang * ROAD_CAR_SCALE, // 23.04 px
  rearOverhang: DEFAULT_VEHICLE_DIMENSIONS.rearOverhang * ROAD_CAR_SCALE, // 23.04 px
  trackHalfWidth: DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth * ROAD_CAR_SCALE, // 22.32 px
};

const ROAD_CAR_HALF_W = ROAD_DIMENSIONS.width * 0.5; // 27.36
const ROAD_CAR_HALF_L = ROAD_DIMENSIONS.length * 0.5; // 60.48
const ROAD_HALF_WHEELBASE = ROAD_DIMENSIONS.wheelbase * 0.5; // 37.44

const ROAD_BAY_X = 358;
const ROAD_KERB_X = ROAD_BAY_X + ROAD_CAR_HALF_W; // 385.36
const ROAD_KERB_STONE_X = 394; // +8.64 px concrete gutter ensures zero kerb mount during forward passes
const ROAD_PARKING_LINE_X = 324;
const ROAD_LANE_DIVIDER_X = 216;
const ROAD_ASPHALT_LEFT_X = 108;

// Act 1 hero initial centered pose (centerY = 358 -> front 297.52, rear 418.48; +3.54 px clean 1 cm hairlines on both sides!)
const ACT1_HERO_START_X = 342.0;
const ACT1_CENTERED_REAR_Y = 358 + ROAD_HALF_WHEELBASE; // 395.44
const ACT1_SHUTTLE_TOP_REAR_Y = 377; // front bumper 279.08 (+6.6 px clear of relieved front car 272.48)
const ACT1_SHUTTLE_BOT_REAR_Y = 414; // rear bumper 437.04 (+6.5 px clear of relieved rear car 443.52)
const ACT1_STAGE_ROLL_PX = ACT1_CENTERED_REAR_Y - ACT1_SHUTTLE_TOP_REAR_Y; // +18.44 px forward

// Act 1 exact Ackermann passes (R = 110 px -> 34.25 deg lock, ending on a REVERSE pass inside kerb)
const ACT1_TURN_RADIUS = 110;
const ACT1_LONG_DY = ACT1_SHUTTLE_BOT_REAR_Y - ACT1_SHUTTLE_TOP_REAR_Y; // 37 px
const ACT1_SHORT_DY = 30;
const ACT1_LONG_METRICS = computeSSweepMetrics(ACT1_TURN_RADIUS, ACT1_LONG_DY, ROAD_DIMENSIONS.wheelbase); // deltaX = 3.134 px
const ACT1_SHORT_METRICS = computeSSweepMetrics(ACT1_TURN_RADIUS, ACT1_SHORT_DY, ROAD_DIMENSIONS.wheelbase); // deltaX = 2.055 px

const ACT1_PASSES: readonly ShuttlePassDefinition[] = [
  {
    startTime: 7.6,
    endTime: 8.95,
    startRearX: ACT1_HERO_START_X,
    startRearY: ACT1_SHUTTLE_TOP_REAR_Y,
    dirY: TravelDirections.Reverse,
    turnRadius: ACT1_TURN_RADIUS,
    deltaYAbs: ACT1_LONG_DY,
    rollBaseWorldPx: ACT1_STAGE_ROLL_PX,
  },
  {
    startTime: 8.99,
    endTime: 10.34,
    startRearX: ACT1_HERO_START_X + ACT1_LONG_METRICS.deltaX,
    startRearY: ACT1_SHUTTLE_BOT_REAR_Y,
    dirY: TravelDirections.Forward,
    turnRadius: ACT1_TURN_RADIUS,
    deltaYAbs: ACT1_LONG_DY,
    rollBaseWorldPx: ACT1_STAGE_ROLL_PX - ACT1_LONG_METRICS.totalArcLength,
  },
  {
    startTime: 10.38,
    endTime: 11.73,
    startRearX: ACT1_HERO_START_X + 2 * ACT1_LONG_METRICS.deltaX,
    startRearY: ACT1_SHUTTLE_TOP_REAR_Y,
    dirY: TravelDirections.Reverse,
    turnRadius: ACT1_TURN_RADIUS,
    deltaYAbs: ACT1_LONG_DY,
    rollBaseWorldPx: ACT1_STAGE_ROLL_PX,
  },
  {
    startTime: 11.77,
    endTime: 13.1,
    startRearX: ACT1_HERO_START_X + 3 * ACT1_LONG_METRICS.deltaX,
    startRearY: ACT1_SHUTTLE_BOT_REAR_Y,
    dirY: TravelDirections.Forward,
    turnRadius: ACT1_TURN_RADIUS,
    deltaYAbs: ACT1_SHORT_DY,
    rollBaseWorldPx: ACT1_STAGE_ROLL_PX - ACT1_LONG_METRICS.totalArcLength,
  },
  {
    startTime: 13.14,
    endTime: 14.55,
    startRearX: ACT1_HERO_START_X + 3 * ACT1_LONG_METRICS.deltaX + ACT1_SHORT_METRICS.deltaX,
    startRearY: ACT1_SHUTTLE_BOT_REAR_Y - ACT1_SHORT_DY,
    dirY: TravelDirections.Reverse,
    turnRadius: ACT1_TURN_RADIUS,
    deltaYAbs: ACT1_SHORT_DY,
    rollBaseWorldPx: ACT1_STAGE_ROLL_PX - ACT1_LONG_METRICS.totalArcLength + ACT1_SHORT_METRICS.totalArcLength,
  },
];

// Act 2 Figure 4 Rear-Axle Midpoint Geometry (y = 278..430 inside portrait safe zone)
const FIG4_CAR_SCALE = 0.68;
const FIG4_WHEELBASE = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * FIG4_CAR_SCALE; // 70.72
const FIG4_HALF_WHEELBASE = FIG4_WHEELBASE * 0.5; // 35.36
const FIG4_R_MID = 112;
const FIG4_STEER_LOCK_DEG = radToDeg(Math.atan2(FIG4_WHEELBASE, FIG4_R_MID)); // 32.266 deg exact Ackermann lock
const FIG4_Y_TOP = 278;
const FIG4_Y_BOT = 430;
const FIG4_Y_MID = (FIG4_Y_TOP + FIG4_Y_BOT) * 0.5; // 354
const FIG4_SIN_ALPHA = (FIG4_Y_MID - FIG4_Y_TOP) / FIG4_R_MID; // 76 / 112 = 0.67857
const FIG4_COS_ALPHA = Math.sqrt(1 - FIG4_SIN_ALPHA * FIG4_SIN_ALPHA); // 0.73453
const FIG4_ALPHA_DEG = radToDeg(Math.asin(FIG4_SIN_ALPHA)); // 42.732 deg
const FIG4_PA = FIG4_R_MID * (1 - FIG4_COS_ALPHA); // 29.732 px

const POINT_A_FIG4: Point2D = { x: 242, y: FIG4_Y_TOP };
const CENTER_X_SMALL: Point2D = { x: POINT_A_FIG4.x + FIG4_R_MID, y: FIG4_Y_TOP }; // (354, 278)
const POINT_P_FIG4: Point2D = { x: POINT_A_FIG4.x + FIG4_PA, y: FIG4_Y_TOP }; // (271.73, 278)
const POINT_B_FIG4: Point2D = { x: POINT_P_FIG4.x, y: FIG4_Y_MID }; // (271.73, 354)
const POINT_a_FIG4: Point2D = { x: POINT_A_FIG4.x + 2 * FIG4_PA, y: FIG4_Y_BOT }; // (301.46, 430)
const CENTER_X_LARGE: Point2D = { x: POINT_a_FIG4.x - FIG4_R_MID, y: FIG4_Y_BOT }; // (189.46, 430)

const ARC_AB_PATH = `M ${POINT_A_FIG4.x} ${POINT_A_FIG4.y} A ${FIG4_R_MID} ${FIG4_R_MID} 0 0 0 ${POINT_B_FIG4.x.toFixed(2)} ${POINT_B_FIG4.y}`;
const ARC_Ba_PATH = `M ${POINT_B_FIG4.x.toFixed(2)} ${POINT_B_FIG4.y} A ${FIG4_R_MID} ${FIG4_R_MID} 0 0 1 ${POINT_a_FIG4.x.toFixed(2)} ${POINT_a_FIG4.y}`;
const SINGLE_ARC_LENGTH = FIG4_R_MID * degToRad(FIG4_ALPHA_DEG);

// Act 3 Side-by-Side Framed Split Comparison (REVERSE · CLEAR vs. FORWARD · PAVEMENT)
const SPLIT_TOP_Y = 166;
const SPLIT_WIDTH = 198;
const SPLIT_HEIGHT = 390;
const SPLIT_LEFT_X = 38;
const SPLIT_RIGHT_X = 254;

const SPLIT_CAR_SCALE = 0.6;
const SPLIT_DIMENSIONS: VehicleDimensions = {
  width: DEFAULT_VEHICLE_DIMENSIONS.width * SPLIT_CAR_SCALE, // 45.60 px
  length: DEFAULT_VEHICLE_DIMENSIONS.length * SPLIT_CAR_SCALE, // 100.80 px
  wheelbase: DEFAULT_VEHICLE_DIMENSIONS.wheelbase * SPLIT_CAR_SCALE, // 62.40 px
  frontOverhang: DEFAULT_VEHICLE_DIMENSIONS.frontOverhang * SPLIT_CAR_SCALE, // 19.20 px
  rearOverhang: DEFAULT_VEHICLE_DIMENSIONS.rearOverhang * SPLIT_CAR_SCALE, // 19.20 px
  trackHalfWidth: DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth * SPLIT_CAR_SCALE, // 18.60 px
};

const SPLIT_BAY_X = 117; // Parked car right edge = 139.80
const SPLIT_KERB_STONE_X = 143; // Kerbstone 143..149, pavement 149..198
const SPLIT_PARKING_LINE_X = 88;
const SPLIT_FRONT_PARKED_Y = 64; // rear bumper = 114.40
const SPLIT_REAR_PARKED_Y = 324; // front bumper = 273.60

// Identical Ackermann turning radius & stroke in BOTH split panels:
// Reverse swings corner A LEFT (clear of kerb); Forward swings corner A +13.6 px RIGHT over concrete pavement!
const SPLIT_TURN_RADIUS = 92; // steerLock = 34.15 deg
const SPLIT_DY = 46; // alpha = 14.48 deg
const SPLIT_METRICS = computeSSweepMetrics(SPLIT_TURN_RADIUS, SPLIT_DY, SPLIT_DIMENSIONS.wheelbase); // deltaX = 5.843 px
const SPLIT_START_X = SPLIT_BAY_X - SPLIT_METRICS.deltaX; // 111.157
const SPLIT_TOP_REAR_Y = 202; // front bumper = 120.40 (+6.0 px clear of front car 114.40)
const SPLIT_BOT_REAR_Y = SPLIT_TOP_REAR_Y + SPLIT_DY; // 248 -> rear bumper = 267.20 (+6.4 px clear of rear car 273.60)

const KERB_JOINT_Y = [180, 236, 292, 348, 404, 460, 516] as const;
const PAVING_JOINT_Y = [194, 258, 322, 386, 450, 514] as const;
const SPLIT_KERB_JOINT_Y = [32, 92, 152, 212, 272, 332] as const;
const GRID_X = [60, 120, 180, 240, 300, 360, 420, 480] as const;
const GRID_Y = [180, 240, 300, 360, 420, 480, 540] as const;

function computeAct1Pose(seconds: number): ShortVehiclePose {
  if (seconds < 6.8) {
    return sampleStraightSegment(
      0,
      ACT1_HERO_START_X,
      ACT1_CENTERED_REAR_Y,
      ACT1_SHUTTLE_TOP_REAR_Y,
      ROAD_CAR_SCALE,
      ROAD_DIMENSIONS,
      0,
      1,
    );
  }
  if (seconds < 7.6) {
    const u = progressBetween(seconds, 6.8, 7.56);
    return sampleStraightSegment(
      u,
      ACT1_HERO_START_X,
      ACT1_CENTERED_REAR_Y,
      ACT1_SHUTTLE_TOP_REAR_Y,
      ROAD_CAR_SCALE,
      ROAD_DIMENSIONS,
      0,
      1,
    );
  }
  return sampleShuttlePassSequence(seconds, ACT1_PASSES, ROAD_CAR_SCALE, ROAD_DIMENSIONS, 1);
}

function computeActivePassNumber(seconds: number): number {
  for (let i = 0; i < ACT1_PASSES.length; i++) {
    const pass = ACT1_PASSES[i];
    if (pass && seconds <= pass.endTime) {
      return i + 1;
    }
  }
  return ACT1_PASSES.length;
}

interface Fig4Pose {
  readonly centerX: number;
  readonly centerY: number;
  readonly headingDeg: number;
  readonly steerDeg: number;
  readonly midpoint: Point2D;
  readonly wheelRollDistance: number;
  readonly isReversing: boolean;
  readonly isBraking: boolean;
}

function computeFig4Pose(seconds: number): Fig4Pose {
  // Poised at A before turning steering wheel
  if (seconds < 19.25) {
    return {
      centerX: POINT_A_FIG4.x,
      centerY: POINT_A_FIG4.y - FIG4_HALF_WHEELBASE,
      headingDeg: 0,
      steerDeg: 0,
      midpoint: POINT_A_FIG4,
      wheelRollDistance: 0,
      isReversing: false,
      isBraking: true,
    };
  }
  // Stationary wheel turn at A: 0 -> +full lock
  if (seconds < 19.65) {
    const u = easeInOutCubic(progressBetween(seconds, 19.25, 19.65));
    return {
      centerX: POINT_A_FIG4.x,
      centerY: POINT_A_FIG4.y - FIG4_HALF_WHEELBASE,
      headingDeg: 0,
      steerDeg: FIG4_STEER_LOCK_DEG * u,
      midpoint: POINT_A_FIG4,
      wheelRollDistance: 0,
      isReversing: false,
      isBraking: true,
    };
  }
  // Exact circular reverse arc A -> B around center x
  if (seconds < 21.65) {
    const rawU = progressBetween(seconds, 19.65, 21.65);
    const u = easeInOutSine(rawU);
    const headingDeg = -FIG4_ALPHA_DEG * u;
    const hRad = degToRad(headingDeg);
    const mx = CENTER_X_SMALL.x - FIG4_R_MID * Math.cos(hRad);
    const my = CENTER_X_SMALL.y - FIG4_R_MID * Math.sin(hRad);
    return {
      centerX: mx + FIG4_HALF_WHEELBASE * Math.sin(hRad),
      centerY: my - FIG4_HALF_WHEELBASE * Math.cos(hRad),
      headingDeg,
      steerDeg: FIG4_STEER_LOCK_DEG,
      midpoint: { x: mx, y: my },
      wheelRollDistance: (-SINGLE_ARC_LENGTH * u) / FIG4_CAR_SCALE,
      isReversing: true,
      isBraking: rawU > 0.85,
    };
  }
  // Stationary inflection wheel reversal at B: +lock -> -lock
  if (seconds < 22.05) {
    const u = easeInOutCubic(progressBetween(seconds, 21.65, 22.05));
    const hRad = degToRad(-FIG4_ALPHA_DEG);
    return {
      centerX: POINT_B_FIG4.x + FIG4_HALF_WHEELBASE * Math.sin(hRad),
      centerY: POINT_B_FIG4.y - FIG4_HALF_WHEELBASE * Math.cos(hRad),
      headingDeg: -FIG4_ALPHA_DEG,
      steerDeg: FIG4_STEER_LOCK_DEG * (1 - 2 * u),
      midpoint: POINT_B_FIG4,
      wheelRollDistance: -SINGLE_ARC_LENGTH / FIG4_CAR_SCALE,
      isReversing: true,
      isBraking: true,
    };
  }
  // Exact circular reverse arc B -> a around center X
  if (seconds < 24.05) {
    const rawU = progressBetween(seconds, 22.05, 24.05);
    const u = easeInOutSine(rawU);
    const headingDeg = -FIG4_ALPHA_DEG * (1 - u);
    const hRad = degToRad(headingDeg);
    const mx = CENTER_X_LARGE.x + FIG4_R_MID * Math.cos(hRad);
    const my = CENTER_X_LARGE.y + FIG4_R_MID * Math.sin(hRad);
    return {
      centerX: mx + FIG4_HALF_WHEELBASE * Math.sin(hRad),
      centerY: my - FIG4_HALF_WHEELBASE * Math.cos(hRad),
      headingDeg,
      steerDeg: -FIG4_STEER_LOCK_DEG,
      midpoint: { x: mx, y: my },
      wheelRollDistance: (-SINGLE_ARC_LENGTH * (1 + u)) / FIG4_CAR_SCALE,
      isReversing: true,
      isBraking: rawU > 0.85,
    };
  }
  // Stationary wheel straighten at a: -lock -> 0
  const straighten = easeInOutCubic(progressBetween(seconds, 24.05, 24.4));
  return {
    centerX: POINT_a_FIG4.x,
    centerY: POINT_a_FIG4.y - FIG4_HALF_WHEELBASE,
    headingDeg: 0,
    steerDeg: -FIG4_STEER_LOCK_DEG * (1 - straighten),
    midpoint: POINT_a_FIG4,
    wheelRollDistance: (-2 * SINGLE_ARC_LENGTH) / FIG4_CAR_SCALE,
    isReversing: false,
    isBraking: true,
  };
}

function buildSplitCornerATrail(
  uMax: number,
  dirY: typeof TravelDirections.Reverse | typeof TravelDirections.Forward,
  endAtInflection: boolean,
): { readonly polyline: string; readonly overhangPath: string } {
  if (uMax <= 0.01) {
    return { polyline: "", overhangPath: "" };
  }
  const startRearY = dirY === TravelDirections.Reverse ? SPLIT_TOP_REAR_Y : SPLIT_BOT_REAR_Y;
  const points: string[] = [];
  const overhangPts: Point2D[] = [];
  const steps = 42;

  for (let i = 0; i <= steps; i++) {
    const u = (uMax * i) / steps;
    const pose = sampleRealisticSSweep(u, {
      startRearX: SPLIT_START_X,
      startRearY,
      dirY,
      turnRadius: SPLIT_TURN_RADIUS,
      deltaYAbs: SPLIT_DY,
      carScale: SPLIT_CAR_SCALE,
      dimensions: SPLIT_DIMENSIONS,
      rollBaseWorldPx: 0,
      endAtInflection,
    });
    const cornerA = localPointToWorld(pose.centerX, pose.centerY, pose.headingDeg, 38, -84, SPLIT_CAR_SCALE);
    points.push(`${cornerA.x.toFixed(1)},${cornerA.y.toFixed(1)}`);
    if (cornerA.x >= SPLIT_KERB_STONE_X) {
      overhangPts.push(cornerA);
    }
  }

  let overhangPath = "";
  const firstOver = overhangPts[0];
  const lastOver = overhangPts[overhangPts.length - 1];
  if (firstOver && lastOver && overhangPts.length >= 2) {
    const segs = overhangPts.map((pt) => `L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");
    overhangPath = `M ${SPLIT_KERB_STONE_X} ${firstOver.y.toFixed(1)} ${segs} L ${SPLIT_KERB_STONE_X} ${lastOver.y.toFixed(1)} Z`;
  }

  return {
    polyline: points.join(" "),
    overhangPath,
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
        r={3.5 + 1.6 * pulse}
        fill="oklch(0.99 0 0)"
        filter={pulse > 0.1 ? "url(#short03-luminous-glow)" : undefined}
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor={textAnchor}
        stroke="oklch(0.15 0 0 / 0.94)"
        strokeWidth={4}
        strokeLinejoin="round"
        className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
      >
        {label}
      </text>
    </g>
  );
}

interface SplitRoadViewportProps {
  readonly panelX: number;
  readonly clipId: string;
  readonly label: string;
  readonly tone: "clear" | "danger";
  readonly activeGlow: number;
  readonly pose: ShortVehiclePose;
  readonly trailPolyline: string;
  readonly overhangPath: string;
  readonly cornerA: Point2D;
  readonly showCornerReticle: boolean;
}

function SplitRoadViewport({
  panelX,
  clipId,
  label,
  tone,
  activeGlow,
  pose,
  trailPolyline,
  overhangPath,
  cornerA,
  showCornerReticle,
}: SplitRoadViewportProps): ReactElement {
  const isClear = tone === "clear";
  const accentStroke = isClear ? "oklch(0.8 0.13 155)" : "oklch(0.84 0.16 25)";
  const accentSoftStroke = isClear ? "oklch(0.8 0.13 155 / 0.3)" : "oklch(0.84 0.16 25 / 0.3)";
  const borderStroke = isClear
    ? `oklch(0.78 0.12 155 / ${(0.34 + 0.56 * activeGlow).toFixed(2)})`
    : `oklch(0.82 0.16 25 / ${(0.34 + 0.58 * activeGlow).toFixed(2)})`;

  return (
    <g transform={`translate(${panelX}, ${SPLIT_TOP_Y})`}>
      <g clipPath={`url(#${clipId})`}>
        {/* Asphalt & Sidewalk Background */}
        <rect x={0} y={0} width={SPLIT_KERB_STONE_X} height={SPLIT_HEIGHT} fill="url(#short03-asphalt-grad)" />
        <rect x={SPLIT_KERB_STONE_X - 5} y={0} width={5} height={SPLIT_HEIGHT} fill="oklch(0.11 0 0 / 0.5)" />

        {/* Pavement / Sidewalk */}
        <rect
          x={SPLIT_KERB_STONE_X + 6}
          y={0}
          width={SPLIT_WIDTH - (SPLIT_KERB_STONE_X + 6)}
          height={SPLIT_HEIGHT}
          fill="oklch(0.21 0 0 / 0.9)"
        />
        <g stroke="oklch(0.32 0 0 / 0.36)" strokeWidth={1}>
          {SPLIT_KERB_JOINT_Y.map((ky) => (
            <line key={`${clipId}-pv-${ky}`} x1={SPLIT_KERB_STONE_X + 6} y1={ky} x2={SPLIT_WIDTH} y2={ky} />
          ))}
        </g>

        {/* Concrete Kerbstone */}
        <rect x={SPLIT_KERB_STONE_X} y={0} width={6} height={SPLIT_HEIGHT} fill="oklch(0.3 0 0)" />
        <line
          x1={SPLIT_KERB_STONE_X}
          y1={0}
          x2={SPLIT_KERB_STONE_X}
          y2={SPLIT_HEIGHT}
          stroke={isClear ? "oklch(0.74 0 0 / 0.72)" : `oklch(0.84 0.16 25 / ${(0.55 + 0.45 * activeGlow).toFixed(2)})`}
          strokeWidth={1.4}
        />
        <g stroke="oklch(0.45 0 0 / 0.65)" strokeWidth={1}>
          {SPLIT_KERB_JOINT_Y.map((ky) => (
            <line key={`${clipId}-kb-${ky}`} x1={SPLIT_KERB_STONE_X} y1={ky} x2={SPLIT_KERB_STONE_X + 6} y2={ky} />
          ))}
        </g>

        {/* Bay Line */}
        <line
          x1={SPLIT_PARKING_LINE_X}
          y1={0}
          x2={SPLIT_PARKING_LINE_X}
          y2={SPLIT_HEIGHT}
          stroke="oklch(0.62 0 0 / 0.34)"
          strokeWidth={1.1}
          strokeDasharray="6 8"
        />

        {/* Parked Cars (Layer 3) */}
        <g transform={`translate(${SPLIT_BAY_X}, ${SPLIT_FRONT_PARKED_Y}) scale(${SPLIT_CAR_SCALE})`}>
          <CutPlaneCar
            variant={CarSectionVariants.Parked}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={false}
          />
        </g>
        <g transform={`translate(${SPLIT_BAY_X}, ${SPLIT_REAR_PARKED_Y}) scale(${SPLIT_CAR_SCALE})`}>
          <CutPlaneCar
            variant={CarSectionVariants.Parked}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={false}
          />
        </g>

        {/* Moving Hero Car (Layer 4) */}
        <g
          transform={`translate(${pose.centerX}, ${pose.centerY}) rotate(${pose.headingDeg}) scale(${SPLIT_CAR_SCALE})`}
        >
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

        {/* ============================================================
            INFORMATIC GRAPHICS STRICTLY ABOVE CARS INSIDE PANEL
           ============================================================ */}
        {/* Crimson Swept Pavement-Overhang Lobe (Right Panel Only) */}
        {overhangPath ? (
          <path
            d={overhangPath}
            fill="oklch(0.7 0.16 25 / 0.32)"
            stroke="oklch(0.86 0.16 25)"
            strokeWidth={1.5}
            strokeDasharray="3 2.5"
          />
        ) : null}

        {/* Luminous Corner A Swept Trajectory Ribbon */}
        {trailPolyline ? (
          <g>
            <polyline
              points={trailPolyline}
              fill="none"
              stroke={accentSoftStroke}
              strokeWidth={4.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={trailPolyline}
              fill="none"
              stroke={accentStroke}
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#short03-luminous-glow)"
            />
          </g>
        ) : null}

        {/* Live Front-Right Bumper Corner A Reticle */}
        {showCornerReticle ? (
          <g transform={`translate(${cornerA.x}, ${cornerA.y})`}>
            <circle
              cx={0}
              cy={0}
              r={7 + 4 * activeGlow}
              fill={isClear ? "oklch(0.78 0.12 155 / 0.14)" : "oklch(0.7 0.16 25 / 0.24)"}
              stroke={accentStroke}
              strokeWidth={1.5}
            />
            <circle cx={0} cy={0} r={3.2} fill={accentStroke} filter="url(#short03-luminous-glow)" />
          </g>
        ) : null}

        {/* Minimal Panel Top Label Pill */}
        <g transform="translate(10, 10)">
          <rect
            x={0}
            y={0}
            width={88}
            height={24}
            rx={5}
            fill="oklch(0.18 0 0 / 0.92)"
            stroke={borderStroke}
            strokeWidth={1.1}
          />
          <circle cx={13} cy={12} r={3.2} fill={accentStroke} />
          <text
            x={23}
            y={16}
            className={
              isClear
                ? "fill-status-success-text font-mono text-xs font-semibold tracking-mono"
                : "fill-status-danger-text font-mono text-xs font-semibold tracking-mono"
            }
          >
            {label}
          </text>
        </g>
      </g>

      {/* Crisp Architectural Panel Frame */}
      <rect
        x={0}
        y={0}
        width={SPLIT_WIDTH}
        height={SPLIT_HEIGHT}
        rx={10}
        fill="none"
        stroke={borderStroke}
        strokeWidth={1.35 + 0.45 * activeGlow}
      />
    </g>
  );
}

export function Short03TightShuttling(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  // Act 1 (0.00s - 15.05s) | Act 2 Figure 4 (14.85s - 28.05s) | Act 3 Split Reverse vs Forward (27.85s - 36.50s)
  const act1Opacity = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 14.6, 15.1));
  const act2Opacity =
    easeOutCubic(progressBetween(elapsedSeconds, 14.85, 15.4)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 27.6, 28.15)));
  const act3Opacity = easeOutCubic(progressBetween(elapsedSeconds, 27.85, 28.45));

  // Act 1 Gap Squeezes to clean 3.54 px hairlines ("1 cm") at 1.2s - 3.6s, then relieves smoothly at 6.8s - 7.55s
  const squeezeTight = easeInOutCubic(progressBetween(elapsedSeconds, 1.2, 3.6));
  const shuttleRelief = easeInOutCubic(progressBetween(elapsedSeconds, 6.8, 7.55));
  const frontParkedCenterY = 210 + 23.5 * squeezeTight - 21.5 * shuttleRelief; // 210 -> 233.5 -> 212 (rear: 270.48 -> 293.98 -> 272.48)
  const rearParkedCenterY = 506 - 23.5 * squeezeTight + 21.5 * shuttleRelief; // 506 -> 482.5 -> 504 (front: 445.52 -> 422.02 -> 443.52)
  const frontRearBumperY = frontParkedCenterY + ROAD_CAR_HALF_L;
  const rearFrontBumperY = rearParkedCenterY - ROAD_CAR_HALF_L;

  const act1Pose = computeAct1Pose(elapsedSeconds);
  const activePass = computeActivePassNumber(elapsedSeconds);
  const gapBadgeGlow = pulseEnvelope(elapsedSeconds, 2.4, 3.2, 6.6, 7.25);
  const hairlineGlow = pulseEnvelope(elapsedSeconds, 2.2, 3.4, 6.5, 7.1);

  const act1MidpointTrail = useMemo(() => {
    if (elapsedSeconds < 7.6 || elapsedSeconds >= 15.1) {
      return "";
    }
    return buildShuttleMidpointTrail(
      7.6,
      Math.min(elapsedSeconds, 14.55),
      ACT1_PASSES,
      ROAD_CAR_SCALE,
      ROAD_DIMENSIONS,
    );
  }, [elapsedSeconds]);
  const act1TrailOpacity = easeOutCubic(progressBetween(elapsedSeconds, 7.6, 7.95));

  // Act 2 Figure 4 Choreography (14.85s - 28.05s)
  const fig4Pose = computeFig4Pose(elapsedSeconds);
  const fig4Ack = computeAckermannAngles(fig4Pose.steerDeg, DEFAULT_VEHICLE_DIMENSIONS);
  const arc1Draw = easeInOutSine(progressBetween(elapsedSeconds, 19.65, 21.65));
  const arc2Draw = easeInOutSine(progressBetween(elapsedSeconds, 22.05, 24.05));
  const smallCenterOpacity = easeOutCubic(progressBetween(elapsedSeconds, 18.8, 19.55));
  const largeCenterOpacity = easeOutCubic(progressBetween(elapsedSeconds, 21.35, 22.0));
  const dropPerpDraw = easeInOutCubic(progressBetween(elapsedSeconds, 24.15, 24.9));
  const paStepReveal = easeOutCubic(progressBetween(elapsedSeconds, 24.65, 25.5));
  const twoPaGlow = pulseEnvelope(elapsedSeconds, 25.1, 25.8, 27.3, 27.9);
  const midpointFocusPulse = pulseEnvelope(elapsedSeconds, 17.2, 17.8, 19.1, 19.65);

  const pulseA = Math.max(pulseFactor(elapsedSeconds, 18.1, 0.7), midpointFocusPulse * 0.75);
  const pulseB = pulseFactor(elapsedSeconds, 21.85, 0.65);
  const pulseP = pulseFactor(elapsedSeconds, 25.4, 0.7);

  // Act 3 Split Comparison Poses & Exact Swept Corner A Trails
  const reverseU = progressBetween(elapsedSeconds, 30.15, 32.85);
  const forwardU = progressBetween(elapsedSeconds, 32.65, 34.45);

  const leftReversePose = sampleRealisticSSweep(reverseU, {
    startRearX: SPLIT_START_X,
    startRearY: SPLIT_TOP_REAR_Y,
    dirY: TravelDirections.Reverse,
    turnRadius: SPLIT_TURN_RADIUS,
    deltaYAbs: SPLIT_DY,
    carScale: SPLIT_CAR_SCALE,
    dimensions: SPLIT_DIMENSIONS,
    rollBaseWorldPx: 0,
  });

  const rightForwardPose = sampleRealisticSSweep(forwardU, {
    startRearX: SPLIT_START_X,
    startRearY: SPLIT_BOT_REAR_Y,
    dirY: TravelDirections.Forward,
    turnRadius: SPLIT_TURN_RADIUS,
    deltaYAbs: SPLIT_DY,
    carScale: SPLIT_CAR_SCALE,
    dimensions: SPLIT_DIMENSIONS,
    rollBaseWorldPx: 0,
    endAtInflection: true,
  });

  const leftCornerA = localPointToWorld(
    leftReversePose.centerX,
    leftReversePose.centerY,
    leftReversePose.headingDeg,
    38,
    -84,
    SPLIT_CAR_SCALE,
  );
  const rightCornerA = localPointToWorld(
    rightForwardPose.centerX,
    rightForwardPose.centerY,
    rightForwardPose.headingDeg,
    38,
    -84,
    SPLIT_CAR_SCALE,
  );

  const leftTrail = useMemo(() => buildSplitCornerATrail(reverseU, TravelDirections.Reverse, false), [reverseU]);
  const rightTrail = useMemo(() => buildSplitCornerATrail(forwardU, TravelDirections.Forward, true), [forwardU]);

  const leftClearGlow = easeOutCubic(progressBetween(elapsedSeconds, 30.6, 32.6));
  const rightDangerGlow = easeOutCubic(progressBetween(elapsedSeconds, 33.1, 34.3));

  // Synchronized Safe-Zone Status Pill & Bottom Rule Card
  let statusText = "EXTRA SPACE: c = 1 cm";
  let statusAlert = false;
  if (elapsedSeconds >= 5.65 && elapsedSeconds < 14.9) {
    statusText = elapsedSeconds < 7.55 ? "MATHEMATICALLY: YES" : "c > 0  ·  ALWAYS PARKABLE";
  } else if (elapsedSeconds >= 14.9 && elapsedSeconds < 28.0) {
    statusText = "REAR-AXLE MIDPOINT S-CURVES";
  } else if (elapsedSeconds >= 28.0) {
    statusText = "ALWAYS FINISH BY REVERSING";
    statusAlert = elapsedSeconds >= 33.0;
  }

  return (
    <svg viewBox="0 0 540 960" className="h-full w-full select-none">
      <title>Portrait Short 03: Parking in a 1 cm extra gap and finishing in reverse</title>
      <defs>
        <radialGradient id="short03-ambient-glow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.52)" />
          <stop offset="60%" stopColor="oklch(0.2 0 0 / 0.2)" />
          <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
        </radialGradient>

        <radialGradient id="short03-grid-fade" cx="50%" cy="46%" r="52%">
          <stop offset="0%" stopColor="white" stopOpacity={0.9} />
          <stop offset="72%" stopColor="white" stopOpacity={0.28} />
          <stop offset="100%" stopColor="black" stopOpacity={0} />
        </radialGradient>

        <mask id="short03-grid-mask">
          <rect x={0} y={156} width={540} height={414} fill="url(#short03-grid-fade)" />
        </mask>

        <filter id="short03-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="short03-card-shadow" x="-15%" y="-30%" width="130%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="oklch(0 0 0)" floodOpacity="0.48" />
        </filter>

        <linearGradient id="short03-road-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="black" stopOpacity={0} />
          <stop offset="8%" stopColor="white" stopOpacity={1} />
          <stop offset="88%" stopColor="white" stopOpacity={1} />
          <stop offset="100%" stopColor="black" stopOpacity={0} />
        </linearGradient>

        <mask id="short03-road-fade-mask">
          <rect x={0} y={160} width={540} height={408} fill="url(#short03-road-fade-grad)" />
        </mask>

        <linearGradient id="short03-asphalt-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.145 0 0)" />
          <stop offset="22%" stopColor="oklch(0.165 0 0)" />
          <stop offset="56%" stopColor="oklch(0.178 0 0)" />
          <stop offset="100%" stopColor="oklch(0.145 0 0)" />
        </linearGradient>

        <linearGradient id="short03-sidewalk-right-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.88)" />
          <stop offset="55%" stopColor="oklch(0.19 0 0 / 0.4)" />
          <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
        </linearGradient>

        <linearGradient id="short03-sidewalk-left-grad" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.2 0 0 / 0.65)" />
          <stop offset="55%" stopColor="oklch(0.17 0 0 / 0.25)" />
          <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
        </linearGradient>

        <clipPath id="short03-split-left-clip">
          <rect x={0} y={0} width={SPLIT_WIDTH} height={SPLIT_HEIGHT} rx={10} />
        </clipPath>

        <clipPath id="short03-split-right-clip">
          <rect x={0} y={0} width={SPLIT_WIDTH} height={SPLIT_HEIGHT} rx={10} />
        </clipPath>

        <CutPlaneCarDefs />
      </defs>

      {/* ================================================================
          LAYER 1: AMBIENT STAGE GLOW & ARCHITECTURAL BLUEPRINT GRID
         ================================================================ */}
      <circle cx={270} cy={380} r={275} fill="url(#short03-ambient-glow)" />

      <g mask="url(#short03-grid-mask)" stroke="oklch(0.75 0 0 / 0.08)" strokeWidth={0.85}>
        {GRID_X.map((gx) => (
          <line key={`gx-${gx}`} x1={gx} y1={160} x2={gx} y2={568} />
        ))}
        {GRID_Y.map((gy) => (
          <line key={`gy-${gy}`} x1={30} y1={gy} x2={510} y2={gy} />
        ))}
      </g>

      {/* ================================================================
          ACT 1 (0.00s - 15.10s): COLLISION-FREE 1 cm SQUEEZE & 5-PASS SHUTTLE
         ================================================================ */}
      {act1Opacity > 0.01 ? (
        <g opacity={act1Opacity}>
          {/* Layer 2-3: Road Stage & Parked Cars */}
          <g mask="url(#short03-road-fade-mask)">
            <rect x={44} y={160} width={60} height={408} fill="url(#short03-sidewalk-left-grad)" />
            <rect x={ROAD_ASPHALT_LEFT_X - 4} y={160} width={4} height={408} fill="oklch(0.26 0 0)" />
            <line
              x1={ROAD_ASPHALT_LEFT_X}
              y1={160}
              x2={ROAD_ASPHALT_LEFT_X}
              y2={568}
              stroke="oklch(0.54 0 0 / 0.42)"
              strokeWidth={1.15}
            />

            <rect x={ROAD_KERB_STONE_X + 7} y={160} width={114} height={408} fill="url(#short03-sidewalk-right-grad)" />
            <g stroke="oklch(0.32 0 0 / 0.34)" strokeWidth={1}>
              {PAVING_JOINT_Y.map((y) => (
                <line key={`a1-pave-${y}`} x1={ROAD_KERB_STONE_X + 7} y1={y} x2={ROAD_KERB_STONE_X + 110} y2={y} />
              ))}
            </g>

            <rect
              x={ROAD_ASPHALT_LEFT_X}
              y={160}
              width={ROAD_KERB_STONE_X - ROAD_ASPHALT_LEFT_X}
              height={408}
              fill="url(#short03-asphalt-grad)"
            />
            <rect x={ROAD_ASPHALT_LEFT_X} y={160} width={6} height={408} fill="oklch(0.11 0 0 / 0.5)" />
            <rect x={ROAD_KERB_STONE_X - 6} y={160} width={6} height={408} fill="oklch(0.11 0 0 / 0.55)" />

            <rect x={ROAD_KERB_STONE_X} y={160} width={7} height={408} fill="oklch(0.29 0 0)" />
            <line
              x1={ROAD_KERB_STONE_X}
              y1={160}
              x2={ROAD_KERB_STONE_X}
              y2={568}
              stroke="oklch(0.72 0 0 / 0.65)"
              strokeWidth={1.4}
            />
            <g stroke="oklch(0.44 0 0 / 0.65)" strokeWidth={1}>
              {KERB_JOINT_Y.map((y) => (
                <line key={`a1-kerb-${y}`} x1={ROAD_KERB_STONE_X} y1={y} x2={ROAD_KERB_STONE_X + 7} y2={y} />
              ))}
            </g>

            <line
              x1={ROAD_PARKING_LINE_X}
              y1={160}
              x2={ROAD_PARKING_LINE_X}
              y2={568}
              stroke="oklch(0.62 0 0 / 0.34)"
              strokeWidth={1.15}
              strokeDasharray="7 9"
            />
            <line
              x1={ROAD_LANE_DIVIDER_X}
              y1={168}
              x2={ROAD_LANE_DIVIDER_X}
              y2={560}
              stroke="oklch(0.74 0 0 / 0.4)"
              strokeWidth={1.55}
              strokeDasharray="18 15"
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

          {/* Layer 4: Hero Car Shuttling Along Exact Non-Holonomic Ackermann S-Curves */}
          <g
            transform={`translate(${act1Pose.centerX}, ${act1Pose.centerY}) rotate(${act1Pose.headingDeg}) scale(${ROAD_CAR_SCALE})`}
          >
            <CutPlaneCar
              variant={CarSectionVariants.Hero}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={true}
              frontLeftSteerDeg={act1Pose.frontLeftSteerDeg}
              frontRightSteerDeg={act1Pose.frontRightSteerDeg}
              wheelRollDistance={act1Pose.wheelRollDistance}
              isReversing={act1Pose.isReversing}
              isBraking={act1Pose.isBraking}
            />
          </g>

          {/* Layer 5: ALL Act 1 Informatic Graphics Strictly Above Cars */}
          {/* Razor-Tight Front & Rear Hairline Clearance Glow during "1 cm" Hook */}
          {hairlineGlow > 0.02 ? (
            <g opacity={hairlineGlow} filter="url(#short03-luminous-glow)">
              <rect
                x={ACT1_HERO_START_X - ROAD_CAR_HALF_W}
                y={frontRearBumperY}
                width={ROAD_DIMENSIONS.width}
                height={Math.max(2, act1Pose.centerY - ROAD_CAR_HALF_L - frontRearBumperY)}
                fill="oklch(0.98 0 0 / 0.24)"
              />
              <rect
                x={ACT1_HERO_START_X - ROAD_CAR_HALF_W}
                y={act1Pose.centerY + ROAD_CAR_HALF_L}
                width={ROAD_DIMENSIONS.width}
                height={Math.max(2, rearFrontBumperY - (act1Pose.centerY + ROAD_CAR_HALF_L))}
                fill="oklch(0.98 0 0 / 0.24)"
              />
            </g>
          ) : null}

          {/* Luminous Live Rear-Axle Midpoint S-Trail */}
          {act1MidpointTrail ? (
            <g opacity={act1TrailOpacity}>
              <polyline
                points={act1MidpointTrail}
                fill="none"
                stroke="oklch(0.98 0 0 / 0.26)"
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={act1MidpointTrail}
                fill="none"
                stroke="oklch(0.99 0 0 / 0.94)"
                strokeWidth={1.85}
                strokeDasharray="4 3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#short03-luminous-glow)"
              />
              <circle
                cx={act1Pose.rearAxleX}
                cy={act1Pose.rearAxleY}
                r={3.8}
                fill="oklch(0.99 0 0)"
                filter="url(#short03-luminous-glow)"
              />
            </g>
          ) : null}

          {/* Extra Space Bracket Highlight (c = 1 cm -> c > 0) */}
          <g stroke="oklch(0.88 0 0 / 0.68)" strokeWidth={1.1} strokeDasharray="3 3">
            <line x1={ROAD_KERB_X} y1={frontRearBumperY} x2={414} y2={frontRearBumperY} />
            <line x1={ROAD_KERB_X} y1={rearFrontBumperY} x2={414} y2={rearFrontBumperY} />
          </g>
          <g
            stroke="oklch(0.99 0 0)"
            strokeWidth={1.75}
            filter={gapBadgeGlow > 0.2 ? "url(#short03-luminous-glow)" : undefined}
          >
            <line x1={408} y1={frontRearBumperY} x2={408} y2={rearFrontBumperY} strokeOpacity={0.35} />
            <line x1={408} y1={frontRearBumperY} x2={408} y2={frontRearBumperY + 24} />
            <line x1={404} y1={frontRearBumperY} x2={412} y2={frontRearBumperY} />
            <line x1={404} y1={rearFrontBumperY} x2={412} y2={rearFrontBumperY} />
          </g>
          <g filter={gapBadgeGlow > 0.2 ? "url(#short03-luminous-glow)" : undefined}>
            <rect
              x={418}
              y={frontRearBumperY - 6}
              width={86}
              height={30}
              rx={6}
              fill="oklch(0.2 0 0 / 0.96)"
              stroke="oklch(0.96 0 0 / 0.9)"
              strokeWidth={1.35}
            />
            <text
              x={461}
              y={frontRearBumperY + 13}
              textAnchor="middle"
              className="fill-text-primary text-xs font-semibold tabular-nums"
            >
              {elapsedSeconds < 7.1 ? (
                <>
                  <tspan className="font-math text-sm italic">c</tspan>
                  <tspan className="fill-text-secondary font-math font-normal"> = </tspan>
                  <tspan className="font-mono">1 cm</tspan>
                </>
              ) : (
                <>
                  <tspan className="font-math text-sm italic">c</tspan>
                  <tspan className="fill-text-secondary font-math font-normal"> &gt; </tspan>
                  <tspan className="font-mono">0</tspan>
                </>
              )}
            </text>
          </g>
        </g>
      ) : null}

      {/* ================================================================
          ACT 2 (14.85s - 28.15s): FIGURE 4 S-CURVE GEOMETRY (A -> B -> a)
         ================================================================ */}
      {act2Opacity > 0.01 ? (
        <g opacity={act2Opacity}>
          {/* Layer 4: Translucent Cut-Plane Car Tracing Midpoint Path A -> B -> a (Rendered Strictly Below Geometry) */}
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
              isBraking={fig4Pose.isBraking}
            />
          </g>

          {/* Layer 5: ALL Figure 4 Geometric Lines, Arcs, Centers, Calipers & Labels Above Car */}
          {/* Kerb Line on Right */}
          <line
            x1={426}
            y1={182}
            x2={426}
            y2={472}
            stroke="oklch(0.76 0 0 / 0.36)"
            strokeWidth={1.3}
            strokeDasharray="4 5"
          />

          {/* Two Parallel Horizontal Boundary Lines Separated by c */}
          <g stroke="oklch(0.88 0 0 / 0.72)" strokeWidth={1.35}>
            <line x1={120} y1={FIG4_Y_TOP} x2={426} y2={FIG4_Y_TOP} />
            <line x1={120} y1={FIG4_Y_BOT} x2={426} y2={FIG4_Y_BOT} />
          </g>

          {/* Right-Side Boundary Gap c Caliper */}
          <g>
            <g stroke="oklch(0.86 0 0 / 0.58)" strokeWidth={1.1} strokeDasharray="3 3">
              <line x1={426} y1={FIG4_Y_TOP} x2={456} y2={FIG4_Y_TOP} />
              <line x1={426} y1={FIG4_Y_BOT} x2={456} y2={FIG4_Y_BOT} />
            </g>
            <line x1={450} y1={FIG4_Y_TOP} x2={450} y2={FIG4_Y_BOT} stroke="oklch(0.96 0 0)" strokeWidth={1.55} />
            <g stroke="oklch(0.96 0 0)" strokeWidth={1.3}>
              <line x1={446} y1={FIG4_Y_TOP} x2={454} y2={FIG4_Y_TOP} />
              <line x1={446} y1={FIG4_Y_BOT} x2={454} y2={FIG4_Y_BOT} />
            </g>
            <text
              x={463}
              y={FIG4_Y_MID + 5}
              textAnchor="start"
              className="fill-text-primary font-math text-base font-semibold italic"
            >
              c
            </text>
          </g>

          {/* Turning Center x (Right) Radii */}
          {smallCenterOpacity > 0.01 ? (
            <g opacity={smallCenterOpacity}>
              <g stroke="oklch(0.86 0 0 / 0.48)" strokeWidth={1.2} strokeDasharray="4 4">
                <line x1={CENTER_X_SMALL.x} y1={CENTER_X_SMALL.y} x2={POINT_A_FIG4.x} y2={POINT_A_FIG4.y} />
                <line x1={CENTER_X_SMALL.x} y1={CENTER_X_SMALL.y} x2={POINT_B_FIG4.x} y2={POINT_B_FIG4.y} />
              </g>
              <text
                x={320}
                y={328}
                textAnchor="start"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={3.5}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-secondary font-math text-sm font-semibold italic"
              >
                R
              </text>
              <g transform={`translate(${CENTER_X_SMALL.x}, ${CENTER_X_SMALL.y})`}>
                <circle cx={0} cy={0} r={3.8} fill="oklch(0.99 0 0)" />
                <text
                  x={11}
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

          {/* Turning Center X (Left) Radii */}
          {largeCenterOpacity > 0.01 ? (
            <g opacity={largeCenterOpacity}>
              <g stroke="oklch(0.86 0 0 / 0.48)" strokeWidth={1.2} strokeDasharray="4 4">
                <line x1={CENTER_X_LARGE.x} y1={CENTER_X_LARGE.y} x2={POINT_B_FIG4.x} y2={POINT_B_FIG4.y} />
                <line x1={CENTER_X_LARGE.x} y1={CENTER_X_LARGE.y} x2={POINT_a_FIG4.x} y2={POINT_a_FIG4.y} />
              </g>
              <g transform={`translate(${CENTER_X_LARGE.x}, ${CENTER_X_LARGE.y})`}>
                <polygon
                  points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6"
                  fill="oklch(0.22 0 0 / 0.96)"
                  stroke="oklch(0.94 0 0 / 0.9)"
                  strokeWidth={1.3}
                />
                <circle cx={0} cy={0} r={3.8} fill="oklch(0.99 0 0)" />
                <text
                  x={-16}
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

          {/* Luminous Layered Opposite Circular Arcs A -> B and B -> a */}
          {arc1Draw > 0.01 ? (
            <g>
              <path
                d={ARC_AB_PATH}
                fill="none"
                stroke="oklch(0.98 0 0 / 0.28)"
                strokeWidth={5.6}
                strokeDasharray={SINGLE_ARC_LENGTH}
                strokeDashoffset={SINGLE_ARC_LENGTH * (1 - arc1Draw)}
              />
              <path
                d={ARC_AB_PATH}
                fill="none"
                stroke="oklch(0.99 0 0)"
                strokeWidth={2.5}
                strokeDasharray={SINGLE_ARC_LENGTH}
                strokeDashoffset={SINGLE_ARC_LENGTH * (1 - arc1Draw)}
                filter="url(#short03-luminous-glow)"
              />
            </g>
          ) : null}

          {arc2Draw > 0.01 ? (
            <g>
              <path
                d={ARC_Ba_PATH}
                fill="none"
                stroke="oklch(0.98 0 0 / 0.28)"
                strokeWidth={5.6}
                strokeDasharray={SINGLE_ARC_LENGTH}
                strokeDashoffset={SINGLE_ARC_LENGTH * (1 - arc2Draw)}
              />
              <path
                d={ARC_Ba_PATH}
                fill="none"
                stroke="oklch(0.99 0 0)"
                strokeWidth={2.5}
                strokeDasharray={SINGLE_ARC_LENGTH}
                strokeDashoffset={SINGLE_ARC_LENGTH * (1 - arc2Draw)}
                filter="url(#short03-luminous-glow)"
              />
            </g>
          ) : null}

          {/* Perpendicular B -> P & Right-Angle Marker at P */}
          {dropPerpDraw > 0.01 ? (
            <g opacity={dropPerpDraw}>
              <line
                x1={POINT_B_FIG4.x}
                y1={POINT_B_FIG4.y}
                x2={POINT_P_FIG4.x}
                y2={POINT_P_FIG4.y}
                stroke="oklch(0.95 0 0 / 0.88)"
                strokeWidth={1.55}
                strokeDasharray="3 3"
              />
              <path
                d={`M ${POINT_P_FIG4.x + 10} ${POINT_P_FIG4.y} L ${POINT_P_FIG4.x + 10} ${POINT_P_FIG4.y + 10} L ${POINT_P_FIG4.x} ${POINT_P_FIG4.y + 10}`}
                fill="none"
                stroke="oklch(0.94 0 0 / 0.88)"
                strokeWidth={1.25}
              />
            </g>
          ) : null}

          {/* Top |PA| & Bottom 2|PA| Inward Step Calipers */}
          {paStepReveal > 0.01 ? (
            <g opacity={paStepReveal}>
              <path
                d={`M ${POINT_A_FIG4.x} ${FIG4_Y_TOP - 20} L ${POINT_A_FIG4.x} ${FIG4_Y_TOP - 27} L ${POINT_P_FIG4.x} ${FIG4_Y_TOP - 27} L ${POINT_P_FIG4.x} ${FIG4_Y_TOP - 20}`}
                fill="none"
                stroke="oklch(0.96 0 0)"
                strokeWidth={1.5}
              />
              <text
                x={(POINT_A_FIG4.x + POINT_P_FIG4.x) * 0.5}
                y={FIG4_Y_TOP - 35}
                textAnchor="middle"
                className="fill-text-primary font-math text-sm font-semibold"
              >
                |PA|
              </text>

              <g stroke="oklch(0.86 0 0 / 0.55)" strokeWidth={1.1} strokeDasharray="3 3">
                <line x1={POINT_A_FIG4.x} y1={FIG4_Y_TOP} x2={POINT_A_FIG4.x} y2={474} />
                <line x1={POINT_a_FIG4.x} y1={FIG4_Y_BOT} x2={POINT_a_FIG4.x} y2={474} />
              </g>

              <g filter={twoPaGlow > 0.2 ? "url(#short03-luminous-glow)" : undefined}>
                <path
                  d={`M ${POINT_A_FIG4.x} 464 L ${POINT_A_FIG4.x} 471 L ${POINT_a_FIG4.x} 471 L ${POINT_a_FIG4.x} 464`}
                  fill="none"
                  stroke="oklch(0.99 0 0)"
                  strokeWidth={1.95}
                />
                <text
                  x={(POINT_A_FIG4.x + POINT_a_FIG4.x) * 0.5}
                  y={491}
                  textAnchor="middle"
                  className="fill-text-primary font-math text-base font-semibold"
                >
                  <tspan className="font-mono tabular-nums">2</tspan>
                  <tspan>|PA|</tspan>
                </text>
              </g>
            </g>
          ) : null}

          {/* Live Rear-Axle Midpoint Crosshair Reticle */}
          <g transform={`translate(${fig4Pose.midpoint.x}, ${fig4Pose.midpoint.y})`}>
            {midpointFocusPulse > 0.04 ? (
              <g opacity={midpointFocusPulse} stroke="oklch(0.99 0 0)" strokeWidth={1.2}>
                <circle cx={0} cy={0} r={11 + 6 * midpointFocusPulse} fill="none" />
                <line x1={-16} y1={0} x2={-7} y2={0} />
                <line x1={7} y1={0} x2={16} y2={0} />
                <line x1={0} y1={-16} x2={0} y2={-7} />
                <line x1={0} y1={7} x2={0} y2={16} />
              </g>
            ) : null}
            <circle cx={0} cy={0} r={4.6} fill="oklch(0.99 0 0)" filter="url(#short03-luminous-glow)" />
          </g>

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
            labelX={POINT_B_FIG4.x + 11}
            labelY={POINT_B_FIG4.y + 4}
            textAnchor="start"
            opacity={arc1Draw > 0.9 ? 1 : 0.35}
            pulse={pulseB}
          />
          <Fig4PointNode
            point={POINT_a_FIG4}
            label="a"
            labelX={POINT_a_FIG4.x + 11}
            labelY={POINT_a_FIG4.y - 8}
            textAnchor="start"
            opacity={arc2Draw > 0.9 ? 1 : 0.35}
            pulse={twoPaGlow}
          />
        </g>
      ) : null}

      {/* ================================================================
          ACT 3 (27.85s - 36.50s): SIDE-BY-SIDE SPLIT COMPARISON
          LEFT: REVERSE · CLEAR  |  RIGHT: FORWARD · PAVEMENT
         ================================================================ */}
      {act3Opacity > 0.01 ? (
        <g opacity={act3Opacity}>
          <SplitRoadViewport
            panelX={SPLIT_LEFT_X}
            clipId="short03-split-left-clip"
            label="REVERSE"
            tone="clear"
            activeGlow={leftClearGlow}
            pose={leftReversePose}
            trailPolyline={leftTrail.polyline}
            overhangPath=""
            cornerA={leftCornerA}
            showCornerReticle={reverseU > 0.04}
          />

          <SplitRoadViewport
            panelX={SPLIT_RIGHT_X}
            clipId="short03-split-right-clip"
            label="FORWARD"
            tone="danger"
            activeGlow={rightDangerGlow}
            pose={rightForwardPose}
            trailPolyline={rightTrail.polyline}
            overhangPath={rightTrail.overhangPath}
            cornerA={rightCornerA}
            showCornerReticle={forwardU > 0.04}
          />
        </g>
      ) : null}

      {/* ================================================================
          TOP SAFE-ZONE TITLE HEADER (y = 108..154)
         ================================================================ */}
      <g>
        <text x={36} y={120} className="fill-text-muted font-mono text-xs tracking-mono tabular-nums">
          03 · THE ZERO-GAP LIMIT
        </text>
        <text x={36} y={147} className="fill-text-primary font-display text-xl font-heading tracking-heading">
          Park in a 1 cm Extra Gap?
        </text>
      </g>

      {/* ================================================================
          LOWER SAFE-ZONE STATUS PILL & RULE/FORMULA CARD (y = 584..714)
         ================================================================ */}
      <g transform="translate(242, 605)" filter="url(#short03-card-shadow)">
        <rect
          x={-204}
          y={-21}
          width={408}
          height={42}
          rx={8}
          fill="oklch(0.2 0 0 / 0.95)"
          stroke={statusAlert ? "oklch(0.84 0.16 25 / 0.85)" : "oklch(0.94 0 0 / 0.65)"}
          strokeWidth={1.3}
        />
        <text
          x={0}
          y={5}
          textAnchor="middle"
          className={
            statusAlert
              ? "fill-status-danger-text font-mono text-xs font-semibold tracking-mono"
              : "fill-text-primary font-mono text-xs font-semibold tracking-mono"
          }
        >
          {statusText}
        </text>
      </g>

      <g transform="translate(242, 679)" filter="url(#short03-card-shadow)">
        <rect
          x={-204}
          y={-32}
          width={408}
          height={64}
          rx={10}
          fill="oklch(0.2 0 0 / 0.96)"
          stroke="oklch(0.95 0 0 / 0.84)"
          strokeWidth={1.45}
        />

        {elapsedSeconds < 14.9 ? (
          <g>
            <text
              x={0}
              y={6}
              textAnchor="middle"
              className="fill-text-primary font-mono text-sm font-semibold tracking-mono tabular-nums"
            >
              {elapsedSeconds < 7.6 ? "ANY GAP c > 0 IS PARKABLE" : `SHUTTLE PASS ${activePass} · INCHING TO KERB`}
            </text>
          </g>
        ) : elapsedSeconds < 28.0 ? (
          <g>
            <text
              x={-114}
              y={5}
              textAnchor="middle"
              filter={twoPaGlow > 0.2 ? "url(#short03-luminous-glow)" : undefined}
              className="fill-text-primary font-math text-lg font-semibold"
            >
              <tspan>Δ</tspan>
              <tspan className="italic">x</tspan>
              <tspan className="fill-text-secondary font-normal"> = </tspan>
              <tspan className="font-mono tabular-nums">2</tspan>
              <tspan>|PA|</tspan>
            </text>

            <line x1={-40} y1={-15} x2={-40} y2={15} stroke="oklch(0.55 0 0 / 0.65)" strokeWidth={1.2} />

            <text
              x={-16}
              y={5}
              textAnchor="middle"
              className="fill-text-primary font-math text-lg font-semibold italic"
            >
              R
            </text>
            <text x={4} y={5} textAnchor="middle" className="fill-text-secondary font-math text-lg">
              =
            </text>
            <g className="text-text-primary">
              <RootR2MinusL2 x={56} y={3} scale={1.08} />
            </g>
            <text x={138} y={5} textAnchor="middle" className="font-math text-lg font-semibold">
              <tspan className="fill-text-secondary font-normal">− </tspan>
              <tspan className="fill-text-primary italic">n</tspan>
              <tspan className="fill-text-secondary font-normal"> / </tspan>
              <tspan className="fill-text-primary font-mono tabular-nums">2</tspan>
            </text>
          </g>
        ) : (
          <g>
            <text
              x={-98}
              y={5}
              textAnchor="middle"
              className="fill-status-success-text font-mono text-sm font-semibold tracking-mono"
            >
              REVERSE · CLEAR
            </text>
            <line x1={0} y1={-15} x2={0} y2={15} stroke="oklch(0.55 0 0 / 0.65)" strokeWidth={1.2} />
            <text
              x={98}
              y={5}
              textAnchor="middle"
              className="fill-status-danger-text font-mono text-sm font-semibold tracking-mono"
            >
              FORWARD · PAVEMENT
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}
