import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { MasterFormula } from "@/components/math-formula";
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
  easeOutCubic,
  localPointToWorld,
  progressBetween,
  pulseEnvelope,
  pulseFactor,
  sampleRealisticSSweep,
  sampleShuttlePassSequence,
  sampleStraightSegment,
  type ShortVehiclePose,
  type ShuttlePassDefinition,
  TravelDirections,
} from "@/simulation/short-kinematics";
import { usePresentationStore } from "@/store/presentation-store";
import { useMemo, type ReactElement } from "react";

// Scale: 26.0 px = 1.0 m (tuned so turning center X + full circles fit cleanly inside 540x960 safe zone)
const PX_PER_METER = 26;
const CAR_SCALE = PX_PER_METER / 40; // 0.65

const SHORT_01_DIMENSIONS: VehicleDimensions = {
  width: DEFAULT_VEHICLE_DIMENSIONS.width * CAR_SCALE, // 49.40 px (1.90 m)
  length: DEFAULT_VEHICLE_DIMENSIONS.length * CAR_SCALE, // 109.20 px (4.20 m)
  wheelbase: DEFAULT_VEHICLE_DIMENSIONS.wheelbase * CAR_SCALE, // 67.60 px (2.60 m)
  frontOverhang: DEFAULT_VEHICLE_DIMENSIONS.frontOverhang * CAR_SCALE, // 20.80 px
  rearOverhang: DEFAULT_VEHICLE_DIMENSIONS.rearOverhang * CAR_SCALE, // 20.80 px
  trackHalfWidth: DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth * CAR_SCALE, // 20.15 px
};

const HALF_CAR_W = SHORT_01_DIMENSIONS.width * 0.5; // 24.70
const HALF_CAR_L = SHORT_01_DIMENSIONS.length * 0.5; // 54.60
const HALF_WHEELBASE = SHORT_01_DIMENSIONS.wheelbase * 0.5; // 33.80
const TRACK_HALF_W = SHORT_01_DIMENSIONS.trackHalfWidth; // 20.15

// Real-world Blackburn parameters: r = 5.4 m, l = 2.6 m, k = 1.3 m, w = 1.7 m -> |AH| = 1.43 m
const R_PX = 5.4 * PX_PER_METER; // 140.40 px
const FX_PX = Math.sqrt(R_PX * R_PX - SHORT_01_DIMENSIONS.wheelbase * SHORT_01_DIMENSIONS.wheelbase); // 123.054 px
const R_TURN_PX = FX_PX - TRACK_HALF_W; // 102.904 px
const FULL_LOCK_DEG = (Math.atan2(SHORT_01_DIMENSIONS.wheelbase, R_TURN_PX) * 180) / Math.PI; // 33.301 deg

// Portrait road geometry (y: 160..558, keeping formulas below y: 562..728 well above YouTube Shorts bottom UI)
const BAY_CENTER_X = 364;
const BAY_STOP_CENTER_Y = 374;
const HOOK_GHOST_CENTER_Y = 362;

const KERB_X = BAY_CENTER_X + HALF_CAR_W; // 388.70
const KERB_STONE_X = 394; // +5.30 px concrete gutter clears rear overhang during Arc 2
const PARKING_LINE_X = 336;
const LANE_DIVIDER_X = 226;
const ASPHALT_LEFT_X = 114;

const HERO_FRONT_BUMPER_STOP_Y = BAY_STOP_CENTER_Y - HALF_CAR_L; // 319.40
const STOP_FRONT_AXLE_Y = BAY_STOP_CENTER_Y - HALF_WHEELBASE; // 340.20
const STOP_REAR_AXLE_Y = BAY_STOP_CENTER_Y + HALF_WHEELBASE; // 407.80
const HOOK_CENTERED_REAR_AXLE_Y = HOOK_GHOST_CENTER_Y + HALF_WHEELBASE; // 395.80

// Exact turning center X for full-lock reverse arc into (364, 374)
const TURNING_CENTER: Point2D = {
  x: BAY_CENTER_X - R_TURN_PX, // 261.096
  y: STOP_REAR_AXLE_Y, // 407.80
};

const TARGET_E: Point2D = {
  x: BAY_CENTER_X + TRACK_HALF_W, // 384.15
  y: STOP_FRONT_AXLE_Y, // 340.20
};

const TARGET_F: Point2D = {
  x: BAY_CENTER_X + TRACK_HALF_W, // 384.15
  y: STOP_REAR_AXLE_Y, // 407.80
};

const TARGET_FRONT_LEFT: Point2D = {
  x: BAY_CENTER_X - TRACK_HALF_W, // 343.85
  y: STOP_FRONT_AXLE_Y, // 340.20
};

const TARGET_A: Point2D = {
  x: KERB_X, // 388.70
  y: HERO_FRONT_BUMPER_STOP_Y, // 319.40
};

// Exact outer sweeping circle radius of Hero front-right corner A(388.70, 319.40) around X
const R_AX_PX = Math.hypot(KERB_X - TURNING_CENTER.x, HERO_FRONT_BUMPER_STOP_Y - TURNING_CENTER.y); // 155.233 px

// Front parked car (width w = 1.7 m = 44.20 px aligned to kerb, +2.60 px outside R_AX so A grazes G cleanly with zero collision)
const FRONT_CAR_WIDTH_PX = 1.7 * PX_PER_METER; // 44.20 px
const FRONT_CAR_SCALE = FRONT_CAR_WIDTH_PX / DEFAULT_VEHICLE_DIMENSIONS.width; // 0.5816
const FRONT_CAR_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5 * FRONT_CAR_SCALE; // 48.853 px
const FRONT_CAR_CENTER_X = KERB_X - FRONT_CAR_WIDTH_PX * 0.5; // 366.60
const FRONT_CAR_REAR_BASE_Y = 273.8; // Corner G at (344.50, 273.80): dist(G, X) = 157.84 px > R_AX = 155.23 px
const FRONT_CAR_CENTER_BASE_Y = FRONT_CAR_REAR_BASE_Y - FRONT_CAR_HALF_L; // 224.947
const POINT_G_BASE: Point2D = { x: KERB_X - FRONT_CAR_WIDTH_PX, y: FRONT_CAR_REAR_BASE_Y };

const REAR_CAR_CENTER_Y = 491; // front bumper at 436.40 (+7.80 px behind Hero stop rear bumper 428.60)
const REAR_CAR_FRONT_Y = REAR_CAR_CENTER_Y - HALF_CAR_L; // 436.40

// Exact symmetric S-sweep from northbound driving lane (theta = 43.5 deg) into (364, 407.80)
const SWEEP_INFLECT_RAD = degToRad(43.5);
const SWEEP_DELTA_X = 2 * R_TURN_PX * (1 - Math.cos(SWEEP_INFLECT_RAD)); // 56.521 px
const SWEEP_DELTA_Y = 2 * R_TURN_PX * Math.sin(SWEEP_INFLECT_RAD); // 141.668 px
const LANE_STAGE_REAR_X = BAY_CENTER_X - SWEEP_DELTA_X; // 307.479 (+12.3 px clear of front car, +7.1 px clear of rear car)
const LANE_STAGE_REAR_Y = STOP_REAR_AXLE_Y - SWEEP_DELTA_Y; // 266.132
const LANE_APPROACH_START_REAR_Y = 420;
const APPROACH_ROLL_WORLD_PX = LANE_APPROACH_START_REAR_Y - LANE_STAGE_REAR_Y;
const SWEEP_METRICS = computeSSweepMetrics(R_TURN_PX, SWEEP_DELTA_Y, SHORT_01_DIMENSIONS.wheelbase);

// Beat 2 (7.82s - 13.42s): 4 exact Ackermann shuttling passes at R = R_TURN_PX (zero collision, zero kerb mount)
const BEAT2_DELTA_Y = 40;
const BEAT2_METRICS = computeSSweepMetrics(R_TURN_PX, BEAT2_DELTA_Y, SHORT_01_DIMENSIONS.wheelbase); // deltaX = 3.925 px/pass
const BEAT2_START_X = 338.0;
const BEAT2_TOP_REAR_Y = 369; // front bumper = 280.60 (+6.8 px clear of 273.80)
const BEAT2_BOT_REAR_Y = BEAT2_TOP_REAR_Y + BEAT2_DELTA_Y; // 409 -> rear bumper = 429.80 (+6.6 px clear of 436.40)

const BEAT2_SHUFFLE_PASSES: readonly ShuttlePassDefinition[] = [
  {
    startTime: 7.82,
    endTime: 9.18,
    startRearX: BEAT2_START_X,
    startRearY: BEAT2_TOP_REAR_Y,
    dirY: TravelDirections.Reverse,
    turnRadius: R_TURN_PX,
    deltaYAbs: BEAT2_DELTA_Y,
    rollBaseWorldPx: 0,
  },
  {
    startTime: 9.22,
    endTime: 10.58,
    startRearX: BEAT2_START_X + BEAT2_METRICS.deltaX,
    startRearY: BEAT2_BOT_REAR_Y,
    dirY: TravelDirections.Forward,
    turnRadius: R_TURN_PX,
    deltaYAbs: BEAT2_DELTA_Y,
    rollBaseWorldPx: -BEAT2_METRICS.totalArcLength,
  },
  {
    startTime: 10.62,
    endTime: 11.98,
    startRearX: BEAT2_START_X + 2 * BEAT2_METRICS.deltaX,
    startRearY: BEAT2_TOP_REAR_Y,
    dirY: TravelDirections.Reverse,
    turnRadius: R_TURN_PX,
    deltaYAbs: BEAT2_DELTA_Y,
    rollBaseWorldPx: 0,
  },
  {
    startTime: 12.02,
    endTime: 13.42,
    startRearX: BEAT2_START_X + 3 * BEAT2_METRICS.deltaX,
    startRearY: BEAT2_BOT_REAR_Y,
    dirY: TravelDirections.Forward,
    turnRadius: R_TURN_PX,
    deltaYAbs: BEAT2_DELTA_Y,
    rollBaseWorldPx: -BEAT2_METRICS.totalArcLength,
  },
];

// Beat 6 (39.18s - 42.34s): 3 tight Ackermann passes inside squeezed bay (frontRear = 291.80, rearFront = 436.40)
const BEAT6_SQUEEZE_PX = 18;
const BEAT6_DELTA_Y = 24;
const BEAT6_METRICS = computeSSweepMetrics(R_TURN_PX, BEAT6_DELTA_Y, SHORT_01_DIMENSIONS.wheelbase); // deltaX = 1.404 px/pass
const BEAT6_START_X = 353.5;
const BEAT6_TOP_REAR_Y = 386; // front bumper = 297.60 (+5.8 px clear of 291.80)
const BEAT6_BOT_REAR_Y = BEAT6_TOP_REAR_Y + BEAT6_DELTA_Y; // 410 -> rear bumper = 430.80 (+5.6 px clear of 436.40)

const BEAT6_SHUFFLE_PASSES: readonly ShuttlePassDefinition[] = [
  {
    startTime: 39.18,
    endTime: 40.22,
    startRearX: BEAT6_START_X,
    startRearY: BEAT6_TOP_REAR_Y,
    dirY: TravelDirections.Reverse,
    turnRadius: R_TURN_PX,
    deltaYAbs: BEAT6_DELTA_Y,
    rollBaseWorldPx: 0,
  },
  {
    startTime: 40.26,
    endTime: 41.3,
    startRearX: BEAT6_START_X + BEAT6_METRICS.deltaX,
    startRearY: BEAT6_BOT_REAR_Y,
    dirY: TravelDirections.Forward,
    turnRadius: R_TURN_PX,
    deltaYAbs: BEAT6_DELTA_Y,
    rollBaseWorldPx: -BEAT6_METRICS.totalArcLength,
  },
  {
    startTime: 41.34,
    endTime: 42.34,
    startRearX: BEAT6_START_X + 2 * BEAT6_METRICS.deltaX,
    startRearY: BEAT6_TOP_REAR_Y,
    dirY: TravelDirections.Reverse,
    turnRadius: R_TURN_PX,
    deltaYAbs: BEAT6_DELTA_Y,
    rollBaseWorldPx: 0,
  },
];

const KERB_JOINT_Y = [180, 236, 292, 348, 404, 460, 516] as const;
const PAVING_JOINT_Y = [194, 258, 322, 386, 450, 514] as const;
const GRID_X = [60, 120, 180, 240, 300, 360, 420, 480] as const;
const GRID_Y = [180, 240, 300, 360, 420, 480, 540] as const;

const NUMERIC_OUTER_RADICAL_PATH = "M -316 0 L -311 0 L -305 11 L -292 -35 L 272 -35 L 272 -29";
const NUMERIC_INNER_RADICAL_PATH = "M 36 0 L 40 0 L 44 9 L 53 -23 L 182 -23 L 182 -18";

const HAZARD_CYCLE_SECONDS = 0.68;

function computeShort01Pose(seconds: number): ShortVehiclePose {
  // Beat 1 (0.00s - 7.50s): Pull up northbound lane -> brief stop -> realistic Ackermann S-sweep -> forward center
  if (seconds < 7.5) {
    const fadeOut = 1 - easeInOutCubic(progressBetween(seconds, 7.22, 7.5));
    if (seconds < 2.95) {
      const u = progressBetween(seconds, 0.0, 2.95);
      return sampleStraightSegment(
        u,
        LANE_STAGE_REAR_X,
        LANE_APPROACH_START_REAR_Y,
        LANE_STAGE_REAR_Y,
        CAR_SCALE,
        SHORT_01_DIMENSIONS,
        0,
        1,
      );
    }
    if (seconds < 3.55) {
      return sampleStraightSegment(
        1,
        LANE_STAGE_REAR_X,
        LANE_APPROACH_START_REAR_Y,
        LANE_STAGE_REAR_Y,
        CAR_SCALE,
        SHORT_01_DIMENSIONS,
        0,
        1,
      );
    }
    if (seconds < 6.85) {
      const u = progressBetween(seconds, 3.55, 6.85);
      return sampleRealisticSSweep(u, {
        startRearX: LANE_STAGE_REAR_X,
        startRearY: LANE_STAGE_REAR_Y,
        dirY: TravelDirections.Reverse,
        turnRadius: R_TURN_PX,
        deltaYAbs: SWEEP_DELTA_Y,
        carScale: CAR_SCALE,
        dimensions: SHORT_01_DIMENSIONS,
        rollBaseWorldPx: APPROACH_ROLL_WORLD_PX,
        opacity: fadeOut,
      });
    }
    const pullU = progressBetween(seconds, 6.85, 7.25);
    return sampleStraightSegment(
      pullU,
      BAY_CENTER_X,
      STOP_REAR_AXLE_Y,
      HOOK_CENTERED_REAR_AXLE_Y,
      CAR_SCALE,
      SHORT_01_DIMENSIONS,
      APPROACH_ROLL_WORLD_PX - SWEEP_METRICS.totalArcLength,
      fadeOut,
    );
  }

  // Beat 2 (7.50s - 13.85s): Stranded mid-bay multi-point Ackermann shuffling toward kerb
  if (seconds < 13.85) {
    const fadeIn = easeOutCubic(progressBetween(seconds, 7.52, 7.8));
    const fadeOut = 1 - easeInOutCubic(progressBetween(seconds, 13.52, 13.85));
    return sampleShuttlePassSequence(seconds, BEAT2_SHUFFLE_PASSES, CAR_SCALE, SHORT_01_DIMENSIONS, fadeIn * fadeOut);
  }

  // Beats 3-4 (13.85s - 30.15s): Stationary geometric reference pose in bay with smoothly engaging full-lock Ackermann wheels
  if (seconds < 30.15) {
    const fadeIn = easeOutCubic(progressBetween(seconds, 13.88, 14.28));
    const fadeOut = 1 - easeInOutCubic(progressBetween(seconds, 29.82, 30.15));
    const lockRamp = easeInOutCubic(progressBetween(seconds, 14.15, 14.85));
    const ack = computeAckermannAngles(-FULL_LOCK_DEG * lockRamp, SHORT_01_DIMENSIONS);
    return {
      centerX: BAY_CENTER_X,
      centerY: BAY_STOP_CENTER_Y,
      headingDeg: 0,
      frontLeftSteerDeg: ack.frontLeftSteerDeg,
      frontRightSteerDeg: ack.frontRightSteerDeg,
      wheelRollDistance: 0,
      rearAxleX: BAY_CENTER_X,
      rearAxleY: STOP_REAR_AXLE_Y,
      isReversing: false,
      isBraking: true,
      opacity: fadeIn * fadeOut,
    };
  }

  // Beat 5 (30.15s - 38.90s): Clean single-sweep park landing at exact Figure 2 stop pose (364, 374) with + 1.43 m ahead
  if (seconds < 38.9) {
    const fadeIn = easeOutCubic(progressBetween(seconds, 30.18, 30.48));
    const fadeOut = 1 - easeInOutCubic(progressBetween(seconds, 38.58, 38.9));
    const u = progressBetween(seconds, 30.5, 34.1);
    return sampleRealisticSSweep(u, {
      startRearX: LANE_STAGE_REAR_X,
      startRearY: LANE_STAGE_REAR_Y,
      dirY: TravelDirections.Reverse,
      turnRadius: R_TURN_PX,
      deltaYAbs: SWEEP_DELTA_Y,
      carScale: CAR_SCALE,
      dimensions: SHORT_01_DIMENSIONS,
      rollBaseWorldPx: 0,
      opacity: fadeIn * fadeOut,
    });
  }

  // Beat 6 (38.90s - 42.50s): Tightened gap forces 3 tight Ackermann shuttling passes
  const fadeIn = easeOutCubic(progressBetween(seconds, 38.92, 39.16));
  return sampleShuttlePassSequence(seconds, BEAT6_SHUFFLE_PASSES, CAR_SCALE, SHORT_01_DIMENSIONS, fadeIn);
}

function buildSweepCornerATrail(startTime: number, currentTime: number, endTime: number): string {
  if (currentTime < startTime) {
    return "";
  }
  const endT = Math.min(currentTime, endTime);
  const points: string[] = [];

  for (let t = startTime; t <= endT; t += 0.04) {
    const u = progressBetween(t, startTime, endTime);
    const pose = sampleRealisticSSweep(u, {
      startRearX: LANE_STAGE_REAR_X,
      startRearY: LANE_STAGE_REAR_Y,
      dirY: TravelDirections.Reverse,
      turnRadius: R_TURN_PX,
      deltaYAbs: SWEEP_DELTA_Y,
      carScale: CAR_SCALE,
      dimensions: SHORT_01_DIMENSIONS,
      rollBaseWorldPx: 0,
    });
    const cornerA = localPointToWorld(pose.centerX, pose.centerY, pose.headingDeg, 38, -84, CAR_SCALE);
    points.push(`${cornerA.x.toFixed(1)},${cornerA.y.toFixed(1)}`);
  }

  const endU = progressBetween(endT, startTime, endTime);
  const endPose = sampleRealisticSSweep(endU, {
    startRearX: LANE_STAGE_REAR_X,
    startRearY: LANE_STAGE_REAR_Y,
    dirY: TravelDirections.Reverse,
    turnRadius: R_TURN_PX,
    deltaYAbs: SWEEP_DELTA_Y,
    carScale: CAR_SCALE,
    dimensions: SHORT_01_DIMENSIONS,
    rollBaseWorldPx: 0,
  });
  const endCornerA = localPointToWorld(endPose.centerX, endPose.centerY, endPose.headingDeg, 38, -84, CAR_SCALE);
  points.push(`${endCornerA.x.toFixed(1)},${endCornerA.y.toFixed(1)}`);

  return points.join(" ");
}

interface PortraitMetricChipProps {
  readonly x: number;
  readonly y: number;
  readonly symbol: string;
  readonly value: string;
  readonly opacity: number;
  readonly activeGlow: number;
}

function PortraitMetricChip({
  x,
  y,
  symbol,
  value,
  opacity,
  activeGlow,
}: PortraitMetricChipProps): ReactElement | null {
  if (opacity <= 0.01) {
    return null;
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={opacity}
      filter={activeGlow > 0.25 ? "url(#short01-luminous-glow)" : undefined}
    >
      <rect
        x={0}
        y={0}
        width={196}
        height={42}
        rx={7}
        fill={activeGlow > 0.2 ? "oklch(0.25 0 0 / 0.96)" : "oklch(0.2 0 0 / 0.94)"}
        stroke={`oklch(0.95 0 0 / ${(0.42 + 0.54 * activeGlow).toFixed(2)})`}
        strokeWidth={1.25 + 0.55 * activeGlow}
      />
      <text x={20} y={27} textAnchor="start" className="fill-text-secondary font-math text-lg font-semibold italic">
        {symbol}
      </text>
      <text x={44} y={27} textAnchor="middle" className="fill-text-muted font-math text-base">
        =
      </text>
      <text
        x={176}
        y={27}
        textAnchor="end"
        className="fill-text-primary font-mono text-base font-semibold tracking-mono tabular-nums"
      >
        {value}
      </text>
    </g>
  );
}

export function Short01MinimumSpace(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);

  const pose = computeShort01Pose(elapsedSeconds);
  const liveCornerA = localPointToWorld(pose.centerX, pose.centerY, pose.headingDeg, 38, -84, CAR_SCALE);
  const isHazardActive =
    (elapsedSeconds >= 2.6 && elapsedSeconds < 13.7) || (elapsedSeconds >= 30.3 && elapsedSeconds < 42.4);
  const isHazardLit = isHazardActive && elapsedSeconds % HAZARD_CYCLE_SECONDS < HAZARD_CYCLE_SECONDS * 0.52;

  // Beat 1 Hook (0.00s - 7.50s): "+ ?" extra space & car length L
  const hookOverlayOpacity = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 7.18, 7.5));
  const hookGapHighlight = pulseEnvelope(elapsedSeconds, 0.2, 0.65, 2.2, 3.6);
  const hookCarLengthHighlight = easeOutCubic(progressBetween(elapsedSeconds, 2.0, 2.7)) * hookOverlayOpacity;
  const hookGhostOpacity = (1 - easeInOutCubic(progressBetween(elapsedSeconds, 5.5, 6.75))) * 0.42 * hookOverlayOpacity;
  const hookSweepTrail = useMemo(() => {
    if (elapsedSeconds < 3.55 || elapsedSeconds >= 7.5) {
      return "";
    }
    return buildSweepCornerATrail(3.55, elapsedSeconds, 6.85);
  }, [elapsedSeconds]);
  const hookGrazePulse = pulseFactor(elapsedSeconds, 6.0, 0.48) * hookOverlayOpacity;

  // Beat 2 Shuffle Trail (7.82s - 13.85s)
  const beat2Trail = useMemo(() => {
    if (elapsedSeconds < 7.82 || elapsedSeconds >= 13.85) {
      return "";
    }
    return buildShuttleMidpointTrail(
      7.82,
      Math.min(elapsedSeconds, 13.42),
      BEAT2_SHUFFLE_PASSES,
      CAR_SCALE,
      SHORT_01_DIMENSIONS,
    );
  }, [elapsedSeconds]);
  const beat2TrailOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 7.82, 8.15)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 13.52, 13.85)));

  // Beats 3-4 Geometric Blueprint & 4 Inputs (14.10s - 30.15s)
  const geometryLayerOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 14.1, 14.9)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 33.6, 34.5)));
  const circleDraw = easeInOutCubic(progressBetween(elapsedSeconds, 14.4, 16.5));
  const ackermannRaysOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 14.6, 15.4)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 29.7, 30.15)));
  const xNodeOpacity = easeOutCubic(progressBetween(elapsedSeconds, 14.15, 14.8));
  const xPulse = pulseFactor(elapsedSeconds, 16.8, 0.7);

  const rRayDraw = easeInOutCubic(progressBetween(elapsedSeconds, 18.4, 20.1));
  const rGlow = pulseEnvelope(elapsedSeconds, 18.6, 19.2, 21.1, 21.6);

  const lkFadeOut = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 29.75, 30.2));
  const lCaliperDraw = easeInOutCubic(progressBetween(elapsedSeconds, 21.65, 22.85)) * lkFadeOut;
  const lGlow = pulseEnvelope(elapsedSeconds, 21.7, 22.1, 23.5, 24.0);

  const kCaliperDraw = easeInOutCubic(progressBetween(elapsedSeconds, 23.95, 25.15)) * lkFadeOut;
  const kGlow = pulseEnvelope(elapsedSeconds, 24.0, 24.4, 26.2, 26.7);

  const wCaliperDraw = easeInOutCubic(progressBetween(elapsedSeconds, 26.6, 28.0)) * lkFadeOut;
  const wGlow = pulseEnvelope(elapsedSeconds, 26.7, 27.6, 29.6, 30.2);

  // 2x2 Parameter Chips (18.8s - 42.5s; dim subtly during final shuffle warning)
  const chipFadeDim = 1 - 0.35 * easeInOutCubic(progressBetween(elapsedSeconds, 38.6, 39.6));
  const chip1Opacity = easeOutCubic(progressBetween(elapsedSeconds, 18.8, 19.5)) * chipFadeDim;
  const chip2Opacity = easeOutCubic(progressBetween(elapsedSeconds, 21.7, 22.3)) * chipFadeDim;
  const chip3Opacity = easeOutCubic(progressBetween(elapsedSeconds, 24.0, 24.6)) * chipFadeDim;
  const chip4Opacity = easeOutCubic(progressBetween(elapsedSeconds, 26.7, 27.3)) * chipFadeDim;

  // Beat 5 Single-Sweep & 1.43 m Payoff (30.15s - 38.90s)
  const beat5SweepTrail = useMemo(() => {
    if (elapsedSeconds < 30.5 || elapsedSeconds >= 38.9) {
      return "";
    }
    return buildSweepCornerATrail(30.5, elapsedSeconds, 34.1);
  }, [elapsedSeconds]);
  const beat5SweepTrailOpacity =
    elapsedSeconds < 30.5 ? 0 : 1 - easeInOutCubic(progressBetween(elapsedSeconds, 38.25, 38.9));
  const beat5GrazePulse = pulseFactor(elapsedSeconds, 33.2, 0.55) * beat5SweepTrailOpacity;

  const beat5GhostOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 30.2, 30.7)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 33.0, 34.0))) *
    0.34;

  // Front parked car nudges down 18 px in Beat 6 (38.0s - 39.0s) to tighten space below 1.43 m
  const squeezeOffset = BEAT6_SQUEEZE_PX * easeInOutCubic(progressBetween(elapsedSeconds, 38.0, 39.0));
  const frontCarCenterY = FRONT_CAR_CENTER_BASE_Y + squeezeOffset;
  const frontCarRearY = FRONT_CAR_REAR_BASE_Y + squeezeOffset;

  const beat5ClearanceReveal = easeOutCubic(progressBetween(elapsedSeconds, 33.25, 34.05));
  const beat5ClearancePulse = pulseEnvelope(elapsedSeconds, 33.3, 33.9, 36.2, 37.5);
  const isTightWarning = elapsedSeconds >= 38.35;

  // Beat 6 Shuffle Trail (39.18s - 42.50s)
  const beat6Trail = useMemo(() => {
    if (elapsedSeconds < 39.18) {
      return "";
    }
    return buildShuttleMidpointTrail(39.18, elapsedSeconds, BEAT6_SHUFFLE_PASSES, CAR_SCALE, SHORT_01_DIMENSIONS);
  }, [elapsedSeconds]);
  const beat6TrailOpacity = easeOutCubic(progressBetween(elapsedSeconds, 39.18, 39.5));

  // Bottom Formula Card (15.4s - 42.5s)
  const formulaCardEnter = easeOutCubic(progressBetween(elapsedSeconds, 15.4, 16.3));
  const symbolicOpacity = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 30.5, 31.0));
  const numericOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 30.8, 31.3)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 32.0, 32.5)));
  const intermediateOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 32.2, 32.6)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 33.1, 33.5)));
  const finalResultOpacity = easeOutCubic(progressBetween(elapsedSeconds, 33.25, 33.75));
  const feetSubtextOpacity = easeOutCubic(progressBetween(elapsedSeconds, 36.3, 36.9));
  const finalPulse = pulseEnvelope(elapsedSeconds, 33.3, 34.0, 36.8, 37.8);

  const toNumeric = easeInOutCubic(progressBetween(elapsedSeconds, 30.5, 31.1));
  const toIntermediate = easeInOutCubic(progressBetween(elapsedSeconds, 32.0, 32.5));
  const toFinal = easeInOutCubic(progressBetween(elapsedSeconds, 33.1, 33.6));
  const formulaPillWidth = 404 + 24 * toNumeric - 92 * toIntermediate - 66 * toFinal;

  const hookBottomCardOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 0.15, 0.55)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 13.4, 14.0)));

  const activeGrazePulse = Math.max(hookGrazePulse, beat5GrazePulse);

  return (
    <svg viewBox="0 0 540 960" className="h-full w-full select-none">
      <title>Portrait Short 01: How much extra space do you need to parallel park in one smooth sweep</title>
      <defs>
        <radialGradient id="short01-ambient-glow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.52)" />
          <stop offset="60%" stopColor="oklch(0.2 0 0 / 0.2)" />
          <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
        </radialGradient>

        <radialGradient id="short01-grid-fade" cx="50%" cy="46%" r="52%">
          <stop offset="0%" stopColor="white" stopOpacity={0.9} />
          <stop offset="72%" stopColor="white" stopOpacity={0.28} />
          <stop offset="100%" stopColor="black" stopOpacity={0} />
        </radialGradient>

        <mask id="short01-grid-mask">
          <rect x={0} y={156} width={540} height={406} fill="url(#short01-grid-fade)" />
        </mask>

        <filter id="short01-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="short01-card-shadow" x="-15%" y="-30%" width="130%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="oklch(0 0 0)" floodOpacity="0.48" />
        </filter>

        <linearGradient id="short01-road-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="black" stopOpacity={0} />
          <stop offset="8%" stopColor="white" stopOpacity={1} />
          <stop offset="88%" stopColor="white" stopOpacity={1} />
          <stop offset="100%" stopColor="black" stopOpacity={0} />
        </linearGradient>

        <mask id="short01-road-fade-mask">
          <rect x={0} y={160} width={540} height={398} fill="url(#short01-road-fade-grad)" />
        </mask>

        <linearGradient id="short01-asphalt-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.145 0 0)" />
          <stop offset="22%" stopColor="oklch(0.165 0 0)" />
          <stop offset="56%" stopColor="oklch(0.178 0 0)" />
          <stop offset="100%" stopColor="oklch(0.145 0 0)" />
        </linearGradient>

        <linearGradient id="short01-sidewalk-right-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.88)" />
          <stop offset="55%" stopColor="oklch(0.19 0 0 / 0.4)" />
          <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
        </linearGradient>

        <linearGradient id="short01-sidewalk-left-grad" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.2 0 0 / 0.65)" />
          <stop offset="55%" stopColor="oklch(0.17 0 0 / 0.25)" />
          <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
        </linearGradient>

        <CutPlaneCarDefs />
      </defs>

      {/* ================================================================
          LAYER 1: AMBIENT STAGE GLOW & ARCHITECTURAL BLUEPRINT GRID
         ================================================================ */}
      <circle cx={270} cy={380} r={275} fill="url(#short01-ambient-glow)" />

      <g mask="url(#short01-grid-mask)" stroke="oklch(0.75 0 0 / 0.08)" strokeWidth={0.85}>
        {GRID_X.map((gx) => (
          <line key={`gx-${gx}`} x1={gx} y1={160} x2={gx} y2={558} />
        ))}
        {GRID_Y.map((gy) => (
          <line key={`gy-${gy}`} x1={30} y1={gy} x2={510} y2={gy} />
        ))}
      </g>

      {/* ================================================================
          LAYER 2: ARCHITECTURAL VERTICAL ROAD STAGE (y = 160..558)
         ================================================================ */}
      <g mask="url(#short01-road-fade-mask)">
        {/* Left Shoulder */}
        <rect x={44} y={160} width={66} height={398} fill="url(#short01-sidewalk-left-grad)" />
        <rect x={ASPHALT_LEFT_X - 4} y={160} width={4} height={398} fill="oklch(0.26 0 0)" />
        <line
          x1={ASPHALT_LEFT_X}
          y1={160}
          x2={ASPHALT_LEFT_X}
          y2={558}
          stroke="oklch(0.54 0 0 / 0.42)"
          strokeWidth={1.15}
        />

        {/* Right Sidewalk */}
        <rect x={KERB_STONE_X + 7} y={160} width={116} height={398} fill="url(#short01-sidewalk-right-grad)" />
        <g stroke="oklch(0.32 0 0 / 0.34)" strokeWidth={1}>
          {PAVING_JOINT_Y.map((y) => (
            <line key={`pave-${y}`} x1={KERB_STONE_X + 7} y1={y} x2={KERB_STONE_X + 112} y2={y} />
          ))}
        </g>

        {/* Main Asphalt Surface */}
        <rect
          x={ASPHALT_LEFT_X}
          y={160}
          width={KERB_STONE_X - ASPHALT_LEFT_X}
          height={398}
          fill="url(#short01-asphalt-grad)"
        />
        <rect x={ASPHALT_LEFT_X} y={160} width={6} height={398} fill="oklch(0.11 0 0 / 0.5)" />
        <rect x={KERB_STONE_X - 6} y={160} width={6} height={398} fill="oklch(0.11 0 0 / 0.55)" />

        {/* Concrete Kerb */}
        <rect x={KERB_STONE_X} y={160} width={7} height={398} fill="oklch(0.29 0 0)" />
        <line x1={KERB_STONE_X} y1={160} x2={KERB_STONE_X} y2={558} stroke="oklch(0.72 0 0 / 0.65)" strokeWidth={1.4} />
        <g stroke="oklch(0.44 0 0 / 0.65)" strokeWidth={1}>
          {KERB_JOINT_Y.map((y) => (
            <line key={`kerb-${y}`} x1={KERB_STONE_X} y1={y} x2={KERB_STONE_X + 7} y2={y} />
          ))}
        </g>

        {/* Parking Bay Line & Lane Divider */}
        <line
          x1={PARKING_LINE_X}
          y1={160}
          x2={PARKING_LINE_X}
          y2={558}
          stroke="oklch(0.62 0 0 / 0.34)"
          strokeWidth={1.15}
          strokeDasharray="7 9"
        />
        <g stroke="oklch(0.66 0 0 / 0.45)" strokeWidth={1.2}>
          <line x1={PARKING_LINE_X} y1={frontCarRearY} x2={PARKING_LINE_X + 10} y2={frontCarRearY} />
          <line x1={PARKING_LINE_X} y1={REAR_CAR_FRONT_Y} x2={PARKING_LINE_X + 10} y2={REAR_CAR_FRONT_Y} />
        </g>
        <line
          x1={LANE_DIVIDER_X}
          y1={168}
          x2={LANE_DIVIDER_X}
          y2={550}
          stroke="oklch(0.74 0 0 / 0.4)"
          strokeWidth={1.55}
          strokeDasharray="18 15"
        />

        {/* Subtle Flow Arrow in Right Lane */}
        <g
          transform="translate(281, 514)"
          fill="none"
          stroke="oklch(0.74 0 0 / 0.24)"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1={0} y1={12} x2={0} y2={-11} />
          <polyline points="-6,-4 0,-12 6,-4" />
        </g>

        {/* ================================================================
            LAYER 3: PARKED CARS & GHOST TARGET OUTLINES
           ================================================================ */}
        {/* Front Parked Car (Width w = 1.7 m) */}
        <g transform={`translate(${FRONT_CAR_CENTER_X}, ${frontCarCenterY}) scale(${FRONT_CAR_SCALE})`}>
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

      {/* Ghost Target Bay Outlines (Rendered below Hero Car) */}
      {hookOverlayOpacity > 0.01 && hookGhostOpacity > 0.01 ? (
        <g
          transform={`translate(${BAY_CENTER_X}, ${HOOK_GHOST_CENTER_Y}) scale(${CAR_SCALE})`}
          opacity={hookGhostOpacity}
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

      {beat5GhostOpacity > 0.01 ? (
        <g
          transform={`translate(${BAY_CENTER_X}, ${BAY_STOP_CENTER_Y}) scale(${CAR_SCALE})`}
          opacity={beat5GhostOpacity}
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
          LAYER 4: HERO 2D CUT-PLANE SPORTS COUPE
         ================================================================ */}
      <g
        transform={`translate(${pose.centerX}, ${pose.centerY}) rotate(${pose.headingDeg}) scale(${CAR_SCALE})`}
        opacity={pose.opacity}
      >
        <CutPlaneCar
          variant={CarSectionVariants.Hero}
          kerbSide={KerbSides.Right}
          showBoundingBox={false}
          showVertexLabels={false}
          showAxlePlaneLines={elapsedSeconds >= 14.1}
          frontLeftSteerDeg={pose.frontLeftSteerDeg}
          frontRightSteerDeg={pose.frontRightSteerDeg}
          wheelRollDistance={pose.wheelRollDistance}
          isHazardLit={isHazardLit}
          isReversing={pose.isReversing}
          isBraking={pose.isBraking}
        />
      </g>

      {/* ================================================================
          LAYER 5: ALL INFORMATIC GRAPHICS, LINES, CIRCLES & OVERLAYS
          (STRICTLY ABOVE ALL VEHICLES & ROAD ELEMENTS)
         ================================================================ */}

      {/* Beat 1 Hook Overlay (0.00s - 7.50s): Extra Space + ? & Car Length L */}
      {hookOverlayOpacity > 0.01 ? (
        <g opacity={hookOverlayOpacity}>
          {/* Front & Rear Extra Clearance Bands */}
          <g opacity={0.55 + 0.45 * hookGapHighlight}>
            <rect
              x={BAY_CENTER_X - HALF_CAR_W}
              y={FRONT_CAR_REAR_BASE_Y}
              width={SHORT_01_DIMENSIONS.width}
              height={HOOK_GHOST_CENTER_Y - HALF_CAR_L - FRONT_CAR_REAR_BASE_Y}
              rx={3}
              fill="oklch(0.96 0 0 / 0.1)"
              stroke="oklch(0.96 0 0 / 0.58)"
              strokeWidth={1.05}
              strokeDasharray="3 3"
            />
            <text
              x={BAY_CENTER_X}
              y={295}
              textAnchor="middle"
              className="fill-text-primary font-mono text-xs font-bold"
            >
              +
            </text>

            <rect
              x={BAY_CENTER_X - HALF_CAR_W}
              y={HOOK_GHOST_CENTER_Y + HALF_CAR_L}
              width={SHORT_01_DIMENSIONS.width}
              height={REAR_CAR_FRONT_Y - (HOOK_GHOST_CENTER_Y + HALF_CAR_L)}
              rx={3}
              fill="oklch(0.96 0 0 / 0.1)"
              stroke="oklch(0.96 0 0 / 0.58)"
              strokeWidth={1.05}
              strokeDasharray="3 3"
            />
            <text
              x={BAY_CENTER_X}
              y={430}
              textAnchor="middle"
              className="fill-text-primary font-mono text-xs font-bold"
            >
              +
            </text>

            {/* Right Caliper Fork -> + ? */}
            <g stroke="oklch(0.98 0 0)" strokeWidth={1.9} filter="url(#short01-luminous-glow)">
              <line x1={410} y1={FRONT_CAR_REAR_BASE_Y} x2={410} y2={HOOK_GHOST_CENTER_Y - HALF_CAR_L} />
              <line x1={410} y1={HOOK_GHOST_CENTER_Y + HALF_CAR_L} x2={410} y2={REAR_CAR_FRONT_Y} />
            </g>
            <path
              d="M 412 290 L 434 290 L 434 426 L 412 426 M 434 358 L 448 358"
              fill="none"
              stroke="oklch(0.92 0 0 / 0.85)"
              strokeWidth={1.3}
              strokeLinejoin="round"
            />
            <rect
              x={448}
              y={343.5}
              width={46}
              height={29}
              rx={6}
              fill="oklch(0.2 0 0 / 0.96)"
              stroke="oklch(0.98 0 0 / 0.9)"
              strokeWidth={1.4}
            />
            <text
              x={471}
              y={362.5}
              textAnchor="middle"
              className="fill-text-primary font-mono text-sm font-semibold tracking-mono"
            >
              + ?
            </text>
          </g>

          {/* Car's Own Length Span L */}
          {hookCarLengthHighlight > 0.01 ? (
            <g opacity={hookCarLengthHighlight}>
              <line
                x1={410}
                y1={HOOK_GHOST_CENTER_Y - HALF_CAR_L + 3}
                x2={410}
                y2={HOOK_GHOST_CENTER_Y + HALF_CAR_L - 3}
                stroke="oklch(0.8 0 0 / 0.78)"
                strokeWidth={1.4}
                strokeDasharray="3 4"
              />
              <text
                x={420}
                y={HOOK_GHOST_CENTER_Y + 4}
                textAnchor="start"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={3.5}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-secondary font-math text-sm font-semibold italic"
              >
                L
              </text>
            </g>
          ) : null}

          {/* Layered Luminous Corner A Sweep Ribbon + Live Tracking Reticle */}
          {hookSweepTrail ? (
            <g>
              <polyline
                points={hookSweepTrail}
                fill="none"
                stroke="oklch(0.98 0 0 / 0.3)"
                strokeWidth={5.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={hookSweepTrail}
                fill="none"
                stroke="oklch(0.99 0 0)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#short01-luminous-glow)"
              />
              {elapsedSeconds < 6.9 ? (
                <g transform={`translate(${liveCornerA.x}, ${liveCornerA.y})`}>
                  <circle cx={0} cy={0} r={6.5} fill="none" stroke="oklch(0.98 0 0 / 0.65)" strokeWidth={1.2} />
                  <circle cx={0} cy={0} r={3} fill="oklch(0.99 0 0)" filter="url(#short01-luminous-glow)" />
                </g>
              ) : null}
            </g>
          ) : null}
        </g>
      ) : null}

      {/* Beat 2 Luminous Dashed Rear-Axle Midpoint Shuffle Trace */}
      {beat2Trail ? (
        <g opacity={beat2TrailOpacity}>
          <polyline
            points={beat2Trail}
            fill="none"
            stroke="oklch(0.98 0 0 / 0.22)"
            strokeWidth={4.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={beat2Trail}
            fill="none"
            stroke="oklch(0.96 0 0 / 0.92)"
            strokeWidth={1.75}
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={pose.rearAxleX}
            cy={pose.rearAxleY}
            r={3.5}
            fill="oklch(0.99 0 0)"
            filter="url(#short01-luminous-glow)"
          />
        </g>
      ) : null}

      {/* Beats 3-4: Blackburn Concentric Geometry, Ackermann Rays & Turning Center X */}
      {geometryLayerOpacity > 0.01 ? (
        <g opacity={geometryLayerOpacity}>
          {/* Concentric Turning Circles Centered at X */}
          {circleDraw > 0.01 ? (
            <g fill="none">
              <circle
                cx={TURNING_CENTER.x}
                cy={TURNING_CENTER.y}
                r={R_AX_PX}
                stroke="oklch(0.96 0 0 / 0.56)"
                strokeWidth={1.45}
                strokeDasharray={2 * Math.PI * R_AX_PX}
                strokeDashoffset={2 * Math.PI * R_AX_PX * (1 - circleDraw)}
              />
              <circle
                cx={TURNING_CENTER.x}
                cy={TURNING_CENTER.y}
                r={R_PX}
                stroke="oklch(0.86 0 0 / 0.42)"
                strokeWidth={1.2}
                strokeDasharray="5 5"
                opacity={circleDraw}
              />
              <circle
                cx={TURNING_CENTER.x}
                cy={TURNING_CENTER.y}
                r={FX_PX}
                stroke="oklch(0.76 0 0 / 0.3)"
                strokeWidth={1.1}
                strokeDasharray="3 5"
                opacity={circleDraw}
              />
            </g>
          ) : null}

          {/* Converging Ackermann Axle Normal Rays into Turning Center X */}
          {ackermannRaysOpacity > 0.01 ? (
            <g
              opacity={ackermannRaysOpacity}
              stroke="oklch(0.92 0 0 / 0.52)"
              strokeWidth={1.15}
              strokeDasharray="3.5 4"
            >
              <line x1={TURNING_CENTER.x} y1={TURNING_CENTER.y} x2={TARGET_F.x} y2={TARGET_F.y} />
              <line x1={TURNING_CENTER.x} y1={TURNING_CENTER.y} x2={TARGET_FRONT_LEFT.x} y2={TARGET_FRONT_LEFT.y} />
              <circle cx={TARGET_F.x} cy={TARGET_F.y} r={2.6} fill="oklch(0.96 0 0)" stroke="none" />
              <circle cx={TARGET_A.x} cy={TARGET_A.y} r={2.8} fill="oklch(0.98 0 0)" stroke="none" />
            </g>
          ) : null}

          {/* Radius r = 5.4 m Ray X -> E */}
          {rRayDraw > 0.01 ? (
            <g>
              <line
                x1={TURNING_CENTER.x}
                y1={TURNING_CENTER.y}
                x2={TARGET_E.x}
                y2={TARGET_E.y}
                stroke="oklch(0.99 0 0)"
                strokeWidth={1.9 + 0.55 * rGlow}
                strokeDasharray={R_PX}
                strokeDashoffset={R_PX * (1 - rRayDraw)}
                filter={rGlow > 0.2 ? "url(#short01-luminous-glow)" : undefined}
              />
              <circle cx={TARGET_E.x} cy={TARGET_E.y} r={3.2} fill="oklch(0.99 0 0)" />
              {rRayDraw > 0.55 ? (
                <text
                  x={312}
                  y={364}
                  textAnchor="end"
                  stroke="oklch(0.15 0 0 / 0.94)"
                  strokeWidth={4}
                  strokeLinejoin="round"
                  className="svg-label-halo fill-text-primary text-xs font-semibold"
                >
                  <tspan className="font-math text-sm italic">r</tspan>
                  <tspan className="fill-text-secondary font-math font-normal"> = </tspan>
                  <tspan className="font-mono tabular-nums">5.4 m</tspan>
                </text>
              ) : null}
            </g>
          ) : null}

          {/* Turning Center Hexagonal Node X */}
          {xNodeOpacity > 0.01 ? (
            <g transform={`translate(${TURNING_CENTER.x}, ${TURNING_CENTER.y})`} opacity={xNodeOpacity}>
              {xPulse > 0.04 ? (
                <circle
                  cx={0}
                  cy={0}
                  r={14 + 8 * xPulse}
                  fill="none"
                  stroke="oklch(0.98 0 0)"
                  strokeWidth={1.3}
                  opacity={xPulse * 0.8}
                />
              ) : null}
              <polygon
                points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6"
                fill="oklch(0.22 0 0 / 0.96)"
                stroke="oklch(0.94 0 0 / 0.9)"
                strokeWidth={1.3}
              />
              <circle cx={0} cy={0} r={3.8} fill="oklch(0.99 0 0)" filter="url(#short01-luminous-glow)" />
              <text
                x={-16}
                y={4}
                textAnchor="end"
                stroke="oklch(0.15 0 0 / 0.94)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="svg-label-halo fill-text-primary font-mono text-xs font-semibold"
              >
                X
              </text>
            </g>
          ) : null}
        </g>
      ) : null}

      {/* Dimension Calipers l = 2.6 m, k = 1.3 m, w = 1.7 m (Strictly Above Cars) */}
      {lCaliperDraw > 0.01 ? (
        <g opacity={lCaliperDraw}>
          <g stroke="oklch(0.86 0 0 / 0.6)" strokeWidth={1} strokeDasharray="3 3">
            <line x1={TARGET_E.x} y1={STOP_FRONT_AXLE_Y} x2={416} y2={STOP_FRONT_AXLE_Y} />
            <line x1={TARGET_F.x} y1={STOP_REAR_AXLE_Y} x2={416} y2={STOP_REAR_AXLE_Y} />
          </g>
          <line
            x1={410}
            y1={STOP_FRONT_AXLE_Y}
            x2={410}
            y2={STOP_REAR_AXLE_Y}
            stroke="oklch(0.99 0 0)"
            strokeWidth={1.85}
            filter={lGlow > 0.2 ? "url(#short01-luminous-glow)" : undefined}
          />
          <g stroke="oklch(0.96 0 0)" strokeWidth={1.35}>
            <line x1={406} y1={STOP_FRONT_AXLE_Y} x2={414} y2={STOP_FRONT_AXLE_Y} />
            <line x1={406} y1={STOP_REAR_AXLE_Y} x2={414} y2={STOP_REAR_AXLE_Y} />
          </g>
          <text
            x={422}
            y={(STOP_FRONT_AXLE_Y + STOP_REAR_AXLE_Y) * 0.5 + 4}
            textAnchor="start"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary text-xs font-semibold"
          >
            <tspan className="font-math text-sm italic">l</tspan>
            <tspan className="fill-text-secondary font-math font-normal"> = </tspan>
            <tspan className="font-mono tabular-nums">2.6 m</tspan>
          </text>
        </g>
      ) : null}

      {kCaliperDraw > 0.01 ? (
        <g opacity={kCaliperDraw}>
          <line
            x1={KERB_X}
            y1={HERO_FRONT_BUMPER_STOP_Y}
            x2={416}
            y2={HERO_FRONT_BUMPER_STOP_Y}
            stroke="oklch(0.86 0 0 / 0.6)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <line
            x1={410}
            y1={HERO_FRONT_BUMPER_STOP_Y}
            x2={410}
            y2={STOP_FRONT_AXLE_Y}
            stroke="oklch(0.99 0 0)"
            strokeWidth={1.85}
            filter={kGlow > 0.2 ? "url(#short01-luminous-glow)" : undefined}
          />
          <line
            x1={406}
            y1={HERO_FRONT_BUMPER_STOP_Y}
            x2={414}
            y2={HERO_FRONT_BUMPER_STOP_Y}
            stroke="oklch(0.96 0 0)"
            strokeWidth={1.35}
          />
          <text
            x={422}
            y={(HERO_FRONT_BUMPER_STOP_Y + STOP_FRONT_AXLE_Y) * 0.5 + 4}
            textAnchor="start"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary text-xs font-semibold"
          >
            <tspan className="font-math text-sm italic">k</tspan>
            <tspan className="fill-text-secondary font-math font-normal"> = </tspan>
            <tspan className="font-mono tabular-nums">1.3 m</tspan>
          </text>
        </g>
      ) : null}

      {wCaliperDraw > 0.01 ? (
        <g opacity={wCaliperDraw}>
          <g stroke="oklch(0.86 0 0 / 0.62)" strokeWidth={1} strokeDasharray="3 3">
            <line x1={POINT_G_BASE.x} y1={FRONT_CAR_REAR_BASE_Y} x2={POINT_G_BASE.x} y2={FRONT_CAR_REAR_BASE_Y + 18} />
            <line x1={KERB_X} y1={FRONT_CAR_REAR_BASE_Y} x2={KERB_X} y2={FRONT_CAR_REAR_BASE_Y + 18} />
          </g>
          <line
            x1={POINT_G_BASE.x}
            y1={FRONT_CAR_REAR_BASE_Y + 13}
            x2={KERB_X}
            y2={FRONT_CAR_REAR_BASE_Y + 13}
            stroke="oklch(0.99 0 0)"
            strokeWidth={1.8}
            filter={wGlow > 0.2 ? "url(#short01-luminous-glow)" : undefined}
          />
          <g stroke="oklch(0.96 0 0)" strokeWidth={1.35}>
            <line
              x1={POINT_G_BASE.x}
              y1={FRONT_CAR_REAR_BASE_Y + 9}
              x2={POINT_G_BASE.x}
              y2={FRONT_CAR_REAR_BASE_Y + 17}
            />
            <line x1={KERB_X} y1={FRONT_CAR_REAR_BASE_Y + 9} x2={KERB_X} y2={FRONT_CAR_REAR_BASE_Y + 17} />
          </g>
          <text
            x={333}
            y={FRONT_CAR_REAR_BASE_Y + 17}
            textAnchor="end"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary text-xs font-semibold"
          >
            <tspan className="font-math text-sm italic">w</tspan>
            <tspan className="fill-text-secondary font-math font-normal"> = </tspan>
            <tspan className="font-mono tabular-nums">1.7 m</tspan>
          </text>
        </g>
      ) : null}

      {/* Beat 5 Luminous Corner A Sweep Ribbon + Tracking Reticle */}
      {beat5SweepTrail ? (
        <g opacity={beat5SweepTrailOpacity}>
          <polyline
            points={beat5SweepTrail}
            fill="none"
            stroke="oklch(0.98 0 0 / 0.3)"
            strokeWidth={5.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={beat5SweepTrail}
            fill="none"
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.05}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#short01-luminous-glow)"
          />
          {elapsedSeconds < 34.15 ? (
            <g transform={`translate(${liveCornerA.x}, ${liveCornerA.y})`}>
              <circle cx={0} cy={0} r={6.5} fill="none" stroke="oklch(0.98 0 0 / 0.7)" strokeWidth={1.2} />
              <circle cx={0} cy={0} r={3.1} fill="oklch(0.99 0 0)" filter="url(#short01-luminous-glow)" />
            </g>
          ) : null}
        </g>
      ) : null}

      {/* Grazing Clearance Halo at Front Parked Corner G during Beat 1 & Beat 5 Sweeps */}
      {activeGrazePulse > 0.03 ? (
        <g transform={`translate(${POINT_G_BASE.x}, ${POINT_G_BASE.y})`} opacity={activeGrazePulse}>
          <circle cx={0} cy={0} r={8 + 10 * activeGrazePulse} fill="none" stroke="oklch(0.99 0 0)" strokeWidth={1.35} />
          <circle cx={0} cy={0} r={4} fill="oklch(0.99 0 0)" filter="url(#short01-luminous-glow)" />
        </g>
      ) : null}

      {/* Beats 5-6 Bay Clearance Zone & + 1.43 m / < 1.43 m Badge */}
      {beat5ClearanceReveal > 0.01 ? (
        <g opacity={beat5ClearanceReveal}>
          <rect
            x={BAY_CENTER_X - HALF_CAR_W}
            y={frontCarRearY}
            width={SHORT_01_DIMENSIONS.width}
            height={Math.max(8, HERO_FRONT_BUMPER_STOP_Y - frontCarRearY)}
            rx={3}
            fill={isTightWarning ? "oklch(0.75 0.16 25 / 0.16)" : "oklch(0.98 0 0 / 0.12)"}
            stroke={isTightWarning ? "oklch(0.84 0.16 25 / 0.88)" : "oklch(0.98 0 0 / 0.82)"}
            strokeWidth={1.25}
            strokeDasharray="3 3"
          />
          <g stroke="oklch(0.9 0 0 / 0.68)" strokeWidth={1} strokeDasharray="3 3">
            <line x1={KERB_X} y1={frontCarRearY} x2={416} y2={frontCarRearY} />
            <line x1={KERB_X} y1={HERO_FRONT_BUMPER_STOP_Y} x2={416} y2={HERO_FRONT_BUMPER_STOP_Y} />
          </g>
          <g
            stroke={isTightWarning ? "oklch(0.84 0.16 25)" : "oklch(0.99 0 0)"}
            strokeWidth={2.2}
            filter={!isTightWarning ? "url(#short01-luminous-glow)" : undefined}
          >
            <line x1={410} y1={frontCarRearY} x2={410} y2={HERO_FRONT_BUMPER_STOP_Y} />
            <line x1={406} y1={frontCarRearY} x2={414} y2={frontCarRearY} strokeWidth={1.4} />
            <line x1={406} y1={HERO_FRONT_BUMPER_STOP_Y} x2={414} y2={HERO_FRONT_BUMPER_STOP_Y} strokeWidth={1.4} />
          </g>
          <g filter={!isTightWarning && beat5ClearancePulse > 0.2 ? "url(#short01-luminous-glow)" : undefined}>
            <rect
              x={420}
              y={(frontCarRearY + HERO_FRONT_BUMPER_STOP_Y) * 0.5 - 15}
              width={86}
              height={30}
              rx={6}
              fill="oklch(0.2 0 0 / 0.96)"
              stroke={isTightWarning ? "oklch(0.84 0.16 25 / 0.92)" : "oklch(0.98 0 0 / 0.92)"}
              strokeWidth={1.4}
            />
            <text
              x={463}
              y={(frontCarRearY + HERO_FRONT_BUMPER_STOP_Y) * 0.5 + 4}
              textAnchor="middle"
              className={
                isTightWarning
                  ? "fill-status-danger-text font-mono text-xs font-semibold tracking-mono tabular-nums"
                  : "fill-text-primary font-mono text-xs font-semibold tracking-mono tabular-nums"
              }
            >
              {isTightWarning ? "< 1.43 m" : "+ 1.43 m"}
            </text>
          </g>
        </g>
      ) : null}

      {/* Beat 6 Crimson Dashed Midpoint Shuffle Trace */}
      {beat6Trail ? (
        <g opacity={beat6TrailOpacity}>
          <polyline
            points={beat6Trail}
            fill="none"
            stroke="oklch(0.84 0.16 25 / 0.28)"
            strokeWidth={4.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={beat6Trail}
            fill="none"
            stroke="oklch(0.86 0.16 25 / 0.95)"
            strokeWidth={1.75}
            strokeDasharray="3.5 3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={pose.rearAxleX} cy={pose.rearAxleY} r={3.4} fill="oklch(0.88 0.16 25)" />
        </g>
      ) : null}

      {/* ================================================================
          TOP SAFE-ZONE TITLE HEADER (y = 108..154)
         ================================================================ */}
      <g>
        <text x={36} y={120} className="fill-text-muted font-mono text-xs tracking-mono tabular-nums">
          01 · PARALLEL PARKING GEOMETRY
        </text>
        <text x={36} y={147} className="fill-text-primary font-display text-xl font-heading tracking-heading">
          How Much Extra Space?
        </text>
      </g>

      {/* ================================================================
          LOWER SAFE-ZONE CARDS (y = 562..728, x = 32..452 — CLEAR OF SHORTS UI)
         ================================================================ */}
      {/* Beats 1-2 Prompt / Status Pill */}
      {hookBottomCardOpacity > 0.01 && formulaCardEnter < 0.99 ? (
        <g
          transform="translate(242, 624)"
          opacity={hookBottomCardOpacity * (1 - formulaCardEnter)}
          filter="url(#short01-card-shadow)"
        >
          <rect
            x={-166}
            y={-28}
            width={332}
            height={56}
            rx={9}
            fill="oklch(0.2 0 0 / 0.95)"
            stroke="oklch(0.95 0 0 / 0.78)"
            strokeWidth={1.4}
          />
          <text
            x={0}
            y={6}
            textAnchor="middle"
            className="fill-text-primary font-mono text-sm font-semibold tracking-mono tabular-nums"
          >
            {elapsedSeconds < 7.6 ? "ONE SWEEP = L + ?" : "MULTI-POINT SHUFFLE"}
          </text>
        </g>
      ) : null}

      {/* 2x2 Parameter Input Chips */}
      <PortraitMetricChip x={38} y={562} symbol="r" value="5.4 m" opacity={chip1Opacity} activeGlow={rGlow} />
      <PortraitMetricChip x={246} y={562} symbol="l" value="2.6 m" opacity={chip2Opacity} activeGlow={lGlow} />
      <PortraitMetricChip x={38} y={612} symbol="k" value="1.3 m" opacity={chip3Opacity} activeGlow={kGlow} />
      <PortraitMetricChip x={246} y={612} symbol="w" value="1.7 m" opacity={chip4Opacity} activeGlow={wGlow} />

      {/* Bottom Formula & Result Card (y = 668..728) */}
      {formulaCardEnter > 0.01 ? (
        <g transform="translate(242, 697)" opacity={formulaCardEnter} filter="url(#short01-card-shadow)">
          <rect
            x={-(formulaPillWidth * 0.5)}
            y={-30}
            width={formulaPillWidth}
            height={60}
            rx={9}
            fill="oklch(0.2 0 0 / 0.96)"
            stroke={
              isTightWarning
                ? "oklch(0.84 0.16 25 / 0.88)"
                : `oklch(0.95 0 0 / ${(0.84 + 0.14 * finalPulse).toFixed(2)})`
            }
            strokeWidth={1.45}
          />

          {/* Stage 1: Symbolic Master Formula */}
          {symbolicOpacity > 0.01 ? (
            <g transform="translate(4, 2) scale(0.61)" opacity={symbolicOpacity}>
              <MasterFormula
                glowFilterId="short01-luminous-glow"
                rGlow={rGlow}
                lGlow={lGlow}
                kGlow={kGlow}
                wGlow={wGlow}
              />
            </g>
          ) : null}

          {/* Stage 2: Populated Real-World Numbers */}
          {numericOpacity > 0.01 ? (
            <g transform="translate(2, 2) scale(0.51)" opacity={numericOpacity}>
              <text x={-364} y={7} textAnchor="middle" className="fill-text-primary font-math text-xl font-semibold">
                |AH|
              </text>
              <text x={-332} y={7} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                =
              </text>
              <path
                d={NUMERIC_OUTER_RADICAL_PATH}
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x={-282} y={7} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                (
              </text>
              <text x={-255} y={7} textAnchor="middle" className="fill-text-primary font-mono text-xl font-semibold">
                <tspan className="tabular-nums">5.4</tspan>
                <tspan dy={-9} className="text-xs font-semibold">
                  2
                </tspan>
              </text>
              <text x={-220} y={7} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                −
              </text>
              <text x={-185} y={7} textAnchor="middle" className="fill-text-primary font-mono text-xl font-semibold">
                <tspan className="tabular-nums">2.6</tspan>
                <tspan dy={-9} className="text-xs font-semibold">
                  2
                </tspan>
              </text>
              <text x={-158} y={7} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                )
              </text>
              <text x={-140} y={7} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                +
              </text>
              <text x={-124} y={7} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                (
              </text>
              <text
                x={-99}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                2.6
              </text>
              <text x={-71} y={7} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                +
              </text>
              <text
                x={-43}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                1.3
              </text>
              <text x={-14} y={7} textAnchor="middle" className="text-xl">
                <tspan className="fill-text-secondary font-math">)</tspan>
                <tspan dy={-9} className="fill-text-primary font-mono text-xs font-semibold">
                  2
                </tspan>
              </text>
              <text x={8} y={7} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                −
              </text>
              <text x={26} y={7} textAnchor="middle" className="fill-text-secondary font-math text-2xl">
                (
              </text>
              <path
                d={NUMERIC_INNER_RADICAL_PATH}
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={1.65}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x={80} y={7} textAnchor="middle" className="fill-text-primary font-mono text-xl font-semibold">
                <tspan className="tabular-nums">5.4</tspan>
                <tspan dy={-8} className="text-xs font-semibold">
                  2
                </tspan>
              </text>
              <text x={115} y={7} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                −
              </text>
              <text x={150} y={7} textAnchor="middle" className="fill-text-primary font-mono text-xl font-semibold">
                <tspan className="tabular-nums">2.6</tspan>
                <tspan dy={-8} className="text-xs font-semibold">
                  2
                </tspan>
              </text>
              <text x={194} y={7} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                −
              </text>
              <text
                x={222}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                1.7
              </text>
              <text x={250} y={7} textAnchor="middle" className="text-2xl">
                <tspan className="fill-text-secondary font-math">)</tspan>
                <tspan dy={-11} className="fill-text-primary font-mono text-xs font-semibold">
                  2
                </tspan>
              </text>
              <text x={289} y={7} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                −
              </text>
              <text
                x={317}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                2.6
              </text>
              <text x={346} y={7} textAnchor="middle" className="fill-text-secondary font-math text-xl">
                −
              </text>
              <text
                x={374}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-xl font-semibold tabular-nums"
              >
                1.3
              </text>
            </g>
          ) : null}

          {/* Stage 3: Intermediate Arithmetic */}
          {intermediateOpacity > 0.01 ? (
            <g transform="translate(0, 2) scale(0.76)" opacity={intermediateOpacity}>
              <text x={-170} y={7} textAnchor="middle" className="fill-text-primary font-math text-lg font-semibold">
                |AH|
              </text>
              <text x={-138} y={7} textAnchor="middle" className="fill-text-secondary font-math text-lg">
                =
              </text>
              <path
                d="M -121 0 L -117 0 L -112 9 L -101 -19 L 122 -19 L 122 -14"
                fill="none"
                stroke="oklch(0.98 0 0)"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x={-67}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-lg font-semibold tabular-nums"
              >
                22.40
              </text>
              <text x={-29} y={7} textAnchor="middle" className="fill-text-secondary font-math text-lg">
                +
              </text>
              <text
                x={9}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-lg font-semibold tabular-nums"
              >
                15.21
              </text>
              <text x={47} y={7} textAnchor="middle" className="fill-text-secondary font-math text-lg">
                −
              </text>
              <text
                x={84}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-lg font-semibold tabular-nums"
              >
                9.20
              </text>
              <text x={138} y={7} textAnchor="middle" className="fill-text-secondary font-math text-lg">
                −
              </text>
              <text
                x={172}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-mono text-lg font-semibold tabular-nums"
              >
                3.90
              </text>
            </g>
          ) : null}

          {/* Stage 4: Final Answer |AH| = 1.43 m (< 5 ft) */}
          {finalResultOpacity > 0.01 ? (
            <g opacity={finalResultOpacity} filter={finalPulse > 0.2 ? "url(#short01-luminous-glow)" : undefined}>
              <text
                x={-76 * (1 - 0.15 * feetSubtextOpacity)}
                y={7}
                textAnchor="middle"
                className="fill-text-primary font-math text-xl font-semibold"
              >
                |AH|
              </text>
              <text
                x={-40 * (1 - 0.12 * feetSubtextOpacity)}
                y={7}
                textAnchor="middle"
                className="fill-text-secondary font-math text-xl"
              >
                =
              </text>
              <text
                x={26 - 18 * feetSubtextOpacity}
                y={7}
                textAnchor="middle"
                className={
                  isTightWarning
                    ? "fill-status-danger-text font-mono text-xl font-semibold tracking-mono tabular-nums"
                    : "fill-text-primary font-mono text-xl font-semibold tracking-mono tabular-nums"
                }
              >
                1.43 m
              </text>

              {feetSubtextOpacity > 0.01 ? (
                <text
                  x={92}
                  y={6}
                  textAnchor="middle"
                  opacity={feetSubtextOpacity}
                  className="fill-text-secondary font-mono text-sm font-medium tracking-mono tabular-nums"
                >
                  (&lt; 5 ft)
                </text>
              ) : null}
            </g>
          ) : null}
        </g>
      ) : null}
    </svg>
  );
}
