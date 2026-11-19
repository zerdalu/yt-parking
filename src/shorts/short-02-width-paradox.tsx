import { CutPlaneCar, CutPlaneCarDefs } from "@/components/cut-plane-car";
import { MasterFormula } from "@/components/math-formula";
import {
  CarSectionVariants,
  DEFAULT_VEHICLE_DIMENSIONS,
  KerbSides,
  type Point2D,
  type VehicleDimensions,
} from "@/simulation/car-simulator";
import {
  buildArcPath,
  buildShuttleMidpointTrail,
  clamp01,
  computeSSweepMetrics,
  degToRad,
  easeInOutCubic,
  easeOutCubic,
  localPointToWorld,
  progressBetween,
  pulseEnvelope,
  pulseFactor,
  sampleShuttlePassSequence,
  type ShuttlePassDefinition,
  TravelDirections,
} from "@/simulation/short-kinematics";
import { usePresentationStore } from "@/store/presentation-store";
import { useMemo, type ReactElement } from "react";

const CAR_SCALE = 0.7;
const HALF_W = DEFAULT_VEHICLE_DIMENSIONS.width * 0.5; // 38 local
const HALF_L = DEFAULT_VEHICLE_DIMENSIONS.length * 0.5; // 84 local
const TRACK_HALF_W = DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth; // 31 local
const WHEEL_HALF_L = DEFAULT_VEHICLE_DIMENSIONS.wheelbase * 0.5; // 52 local
const WHEELBASE_LOCAL = DEFAULT_VEHICLE_DIMENSIONS.wheelbase; // 104 local

// Scaled dimensions in 540x960 portrait space
const SHORT_02_DIMENSIONS: VehicleDimensions = {
  width: DEFAULT_VEHICLE_DIMENSIONS.width * CAR_SCALE, // 53.20 px
  length: DEFAULT_VEHICLE_DIMENSIONS.length * CAR_SCALE, // 117.60 px
  wheelbase: DEFAULT_VEHICLE_DIMENSIONS.wheelbase * CAR_SCALE, // 72.80 px
  frontOverhang: DEFAULT_VEHICLE_DIMENSIONS.frontOverhang * CAR_SCALE, // 22.40 px
  rearOverhang: DEFAULT_VEHICLE_DIMENSIONS.rearOverhang * CAR_SCALE, // 22.40 px
  trackHalfWidth: DEFAULT_VEHICLE_DIMENSIONS.trackHalfWidth * CAR_SCALE, // 21.70 px
};

const HALF_W_PX = HALF_W * CAR_SCALE; // 26.60
const HALF_L_PX = HALF_L * CAR_SCALE; // 58.80
const TRACK_HALF_W_PX = TRACK_HALF_W * CAR_SCALE; // 21.70
const WHEEL_HALF_L_PX = WHEEL_HALF_L * CAR_SCALE; // 36.40

// Portrait bay & turning center X positioned so wide morphing + narrow road stay comfortably inside 540x960
const PARALLEL_CENTER_X = 384;
const PARALLEL_CENTER_Y = 398;
const REAR_AXLE_Y = PARALLEL_CENTER_Y + WHEEL_HALF_L_PX; // 434.40
const TURNING_CENTER: Point2D = { x: 224, y: REAR_AXLE_Y }; // (224, 434.40)

const KERB_LINE_X = PARALLEL_CENTER_X + HALF_W_PX; // 410.60
const KERB_STONE_X = 415; // +4.40 px gutter clears rear overhang during full arc (max Dx = 411.94 < 415)
const PARKING_LINE_X = 350;
const WIDE_ASPHALT_LEFT_X = 112;
const NARROW_ROAD_WALL_X = 256; // At -34 deg & widthDelta = +34, Bx = 261.63 (+5.6 px shy of curb — zero clip)

// Concentric turning radii around X(224, 434.40)
const RADIUS_FX = PARALLEL_CENTER_X + TRACK_HALF_W_PX - TURNING_CENTER.x; // 181.70
const RADIUS_FX_LOCAL = RADIUS_FX / CAR_SCALE; // 259.57
const RADIUS_EX = Math.hypot(RADIUS_FX, -(WHEELBASE_LOCAL * CAR_SCALE)); // 195.74
const RADIUS_AX = Math.hypot(KERB_LINE_X - TURNING_CENTER.x, PARALLEL_CENTER_Y - HALF_L_PX - TURNING_CENTER.y); // 209.48

// Front parked car rear-left corner G placed +2.59 px above outer circle R_AX so A grazes G cleanly with zero collision
const POINT_G_X = PARALLEL_CENTER_X - HALF_W_PX; // 357.40
const POINT_G_Y = 270.3; // dist(G, X) = 211.48 px > RADIUS_AX = 209.48 px (+2.00 px radial clearance)
const POINT_G: Point2D = { x: POINT_G_X, y: POINT_G_Y };
const POINT_H: Point2D = { x: KERB_LINE_X, y: POINT_G_Y };
const FRONT_PARKED_CENTER_Y = POINT_G_Y - HALF_L_PX; // 211.50
const REAR_PARKED_CENTER_Y = 532; // front bumper at 473.20 (+10.8 px clear during Beat 5B shuttle)

// Beat 5B (40.75s - 44.00s): 2 genuine collision-free Ackermann shuttle passes inside bay
const BEAT5B_WIDTH_DELTA = 16;
const BEAT5B_TURN_RADIUS = 128; // steerLock = 29.63 deg
const BEAT5B_DELTA_Y = 46;
const BEAT5B_METRICS = computeSSweepMetrics(BEAT5B_TURN_RADIUS, BEAT5B_DELTA_Y, SHORT_02_DIMENSIONS.wheelbase);
const BEAT5B_START_X = 369.0;
const BEAT5B_TOP_REAR_Y = 394; // front bumper = 298.80 (+28.5 px clear of 270.30)
const BEAT5B_BOT_REAR_Y = BEAT5B_TOP_REAR_Y + BEAT5B_DELTA_Y; // 440 -> rear bumper = 462.40 (+10.8 px clear of 473.20)

const BEAT5B_SHUTTLE_PASSES: readonly ShuttlePassDefinition[] = [
  {
    startTime: 41.0,
    endTime: 42.3,
    startRearX: BEAT5B_START_X,
    startRearY: BEAT5B_BOT_REAR_Y,
    dirY: TravelDirections.Forward,
    turnRadius: BEAT5B_TURN_RADIUS,
    deltaYAbs: BEAT5B_DELTA_Y,
    rollBaseWorldPx: 0,
  },
  {
    startTime: 42.34,
    endTime: 43.75,
    startRearX: BEAT5B_START_X + BEAT5B_METRICS.deltaX,
    startRearY: BEAT5B_TOP_REAR_Y,
    dirY: TravelDirections.Reverse,
    turnRadius: BEAT5B_TURN_RADIUS,
    deltaYAbs: BEAT5B_DELTA_Y,
    rollBaseWorldPx: BEAT5B_METRICS.totalArcLength,
  },
];

const OUTER_CIRCLE_ARC = buildArcPath(TURNING_CENTER, RADIUS_AX, -78, -14);
const WHEEL_E_ARC = buildArcPath(TURNING_CENTER, RADIUS_EX, -74, -8);
const WHEEL_F_ARC = buildArcPath(TURNING_CENTER, RADIUS_FX, -68, 10);

const TIRE_RADIUS = 14;
const TREAD_RIB_COUNT = 10;
const TREAD_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const KERB_JOINT_Y = [180, 236, 292, 348, 404, 460, 516] as const;
const PAVING_JOINT_Y = [194, 258, 322, 386, 450, 514] as const;
const GRID_X = [60, 120, 180, 240, 300, 360, 420, 480] as const;
const GRID_Y = [180, 240, 300, 360, 420, 480, 540] as const;

function rotateLocalPointAroundX(localX: number, localY: number, headingDeg: number): Point2D {
  const theta = degToRad(headingDeg);
  const baseWorldX = PARALLEL_CENTER_X + localX * CAR_SCALE;
  const baseWorldY = PARALLEL_CENTER_Y + localY * CAR_SCALE;
  const vx = baseWorldX - TURNING_CENTER.x;
  const vy = baseWorldY - TURNING_CENTER.y;
  return {
    x: TURNING_CENTER.x + vx * Math.cos(theta) - vy * Math.sin(theta),
    y: TURNING_CENTER.y + vx * Math.sin(theta) + vy * Math.cos(theta),
  };
}

function computeWidenedFrontLeftSteer(frontRightSteerDeg: number, widthDelta: number): number {
  if (Math.abs(frontRightSteerDeg) < 0.08) {
    return 0;
  }
  const rightRad = degToRad(frontRightSteerDeg);
  const signedRadiusFromRightWheel = WHEELBASE_LOCAL / Math.tan(rightRad);
  const signedRadiusFromLeftWheel = signedRadiusFromRightWheel + 2 * TRACK_HALF_W + widthDelta;
  if (Math.abs(signedRadiusFromLeftWheel) < 1) {
    return frontRightSteerDeg;
  }
  return (Math.atan(WHEELBASE_LOCAL / signedRadiusFromLeftWheel) * 180) / Math.PI;
}

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
}

function MorphingCutPlaneCar({
  widthDelta,
  frontLeftSteerDeg,
  frontRightSteerDeg,
  wheelRollDistance,
  isReversing,
  isBraking,
}: MorphingCutPlaneCarProps): ReactElement {
  const dx = -widthDelta;
  const midX = dx * 0.5;
  const bodyPath = computeMorphingBodyPath(dx);
  const taillightStroke = isBraking ? "oklch(0.72 0.24 25 / 0.98)" : "oklch(0.78 0.08 25 / 0.64)";

  return (
    <g className="select-none">
      <path d={bodyPath} fill="oklch(0 0 0 / 0.45)" transform="translate(0, 4)" />

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

      <path d={bodyPath} fill="url(#cut-car-hero-grad)" stroke="oklch(0.92 0 0 / 0.88)" strokeWidth={1.4} />

      <g fill="oklch(0.32 0 0)" stroke="oklch(0.84 0 0 / 0.75)" strokeWidth={0.9}>
        <path d={`M ${-33.5 + dx} -22 L ${-38 + dx} -20 L ${-38 + dx} -15.5 L ${-33.5 + dx} -17 Z`} />
        <path d="M 33.5 -22 L 38 -20 L 38 -15.5 L 33.5 -17 Z" />
      </g>

      <g>
        <path
          d={`M ${-15 + dx} -78 C ${-13 + dx} -60, ${-11 + dx} -42, ${-10 + dx} -25 M 15 -78 C 13 -60, 11 -42, 10 -25`}
          fill="none"
          stroke="oklch(0.68 0 0 / 0.36)"
          strokeWidth={0.9}
          strokeLinecap="round"
        />

        <path
          d={`M ${-22 + dx} -24 Q ${midX} -28 22 -24 L 17.5 2 L ${-17.5 + dx} 2 Z`}
          fill="url(#cut-car-glass-grad)"
          stroke="oklch(0.76 0 0 / 0.35)"
          strokeWidth={0.9}
        />

        <path
          d={`M ${-15 + dx} 32 L 15 32 L 18 58 Q ${midX} 61 ${-18 + dx} 58 Z`}
          fill="url(#cut-car-glass-grad)"
          stroke="oklch(0.72 0 0 / 0.3)"
          strokeWidth={0.9}
        />

        <path
          d={`M ${-17.5 + dx} 2 L 17.5 2 L 15 32 L ${-15 + dx} 32 Z`}
          fill="url(#cut-car-hero-cabin-grad)"
          stroke="oklch(0.78 0 0 / 0.32)"
          strokeWidth={0.9}
        />

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

        {isBraking ? (
          <g>
            <circle cx={-19 + dx} cy={81} r={9} fill="url(#cut-car-brake-glow)" />
            <circle cx={19} cy={81} r={9} fill="url(#cut-car-brake-glow)" />
            <ellipse cx={midX} cy={81.5} rx={9} ry={5} fill="url(#cut-car-brake-glow)" />
          </g>
        ) : null}

        <path
          d={`M ${-27 + dx} 79 C ${-21 + dx} 81.5, ${-15 + dx} 82, ${-10 + dx} 81.5`}
          fill="none"
          stroke={taillightStroke}
          strokeWidth={isBraking ? 2.4 : 1.6}
          strokeLinecap="round"
        />
        <path
          d="M 10 81.5 C 15 82, 21 81.5, 27 79"
          fill="none"
          stroke={taillightStroke}
          strokeWidth={isBraking ? 2.4 : 1.6}
          strokeLinecap="round"
        />
        <line
          x1={-7 + dx}
          y1={81.5}
          x2={7}
          y2={81.5}
          stroke={taillightStroke}
          strokeWidth={isBraking ? 1.8 : 0.9}
          strokeLinecap="round"
        />

        {isReversing ? (
          <g>
            <circle cx={-8.5 + dx} cy={82.5} r={7.5} fill="url(#cut-car-reverse-glow)" />
            <circle cx={8.5} cy={82.5} r={7.5} fill="url(#cut-car-reverse-glow)" />
            <g stroke="oklch(0.98 0 0)" strokeWidth={2} strokeLinecap="round">
              <line x1={-11 + dx} y1={82} x2={-6 + dx} y2={82} />
              <line x1={6} y1={82} x2={11} y2={82} />
            </g>
          </g>
        ) : null}
      </g>

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
    </g>
  );
}

export function Short02WidthParadox(): ReactElement {
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);
  const isShuttleAct = elapsedSeconds >= 40.75;

  // Car pose & width-morph choreography aligned word-for-word to vo-short-02.json (0.00s - 44.00s)
  let headingDeg = -28;
  let widthDelta = 0;
  let isReversing = false;
  let isBraking = true;
  let heroOpacity = 1;
  let carCenter: Point2D = rotateLocalPointAroundX(0, 0, -28);
  let frontRightSteerDeg = -((Math.atan2(WHEELBASE_LOCAL, RADIUS_FX_LOCAL) * 180) / Math.PI);
  let frontLeftSteerDeg = computeWidenedFrontLeftSteer(frontRightSteerDeg, 0);
  let wheelRollDistance = 0;
  let shuttleRearAxle: Point2D | null = null;

  if (!isShuttleAct) {
    if (elapsedSeconds < 4.8) {
      // Immediate frame-1 hook motion: smooth reverse glide + width flex
      const u = easeInOutCubic(progressBetween(elapsedSeconds, 0.0, 4.5));
      headingDeg = -43 + (-28 - -43) * u;
      widthDelta = 26 * Math.sin(clamp01(elapsedSeconds / 4.4) * Math.PI);
      isReversing = elapsedSeconds < 4.45;
      isBraking = elapsedSeconds >= 4.05;
    } else if (elapsedSeconds < 16.3) {
      // Beat 2: Poised at showcase angle -28 deg as formula variables r, l, k, w illuminate cleanly
      headingDeg = -28;
      widthDelta = 0;
      isReversing = false;
      isBraking = true;
    } else if (elapsedSeconds < 19.5) {
      // Beat 2B: "Your own car's width? Completely missing." — subtle width flex + formula scan
      headingDeg = -28;
      widthDelta = 14 * Math.sin(progressBetween(elapsedSeconds, 16.35, 18.8) * Math.PI);
      isReversing = false;
      isBraking = true;
    } else if (elapsedSeconds < 20.65) {
      // Stage back smoothly along the arc to -41 deg for pinch-point sweep
      const u = easeInOutCubic(progressBetween(elapsedSeconds, 19.55, 20.58));
      headingDeg = -28 + (-41 - -28) * u;
      widthDelta = 0;
      isReversing = false;
      isBraking = elapsedSeconds >= 20.38;
    } else if (elapsedSeconds < 27.95) {
      // Beat 3: Single smooth reverse sweep as front corner A barely misses G (~24.85s)
      const u = easeInOutCubic(progressBetween(elapsedSeconds, 20.68, 27.7));
      headingDeg = -41 + (-12 - -41) * u;
      widthDelta = 0;
      isReversing = elapsedSeconds < 27.68;
      isBraking = elapsedSeconds >= 27.15;
    } else if (elapsedSeconds < 30.8) {
      // Beat 4A: Pull back smoothly to -38 deg while widening strongly toward turning center X
      const u = easeInOutCubic(progressBetween(elapsedSeconds, 28.0, 30.7));
      headingDeg = -12 + (-38 - -12) * u;
      widthDelta = 38 * easeInOutCubic(progressBetween(elapsedSeconds, 28.15, 30.65));
      isReversing = false;
      isBraking = elapsedSeconds >= 30.45;
    } else if (elapsedSeconds < 36.1) {
      // Beat 4B: Full reverse sweep (-38 -> 0 deg) morphing wide -> compact -> wide while A stays locked on outer circle
      const u = easeInOutCubic(progressBetween(elapsedSeconds, 30.85, 35.85));
      headingDeg = -38 * (1 - u);
      if (elapsedSeconds < 32.0) {
        widthDelta = 38;
      } else if (elapsedSeconds < 33.7) {
        const shrink = easeInOutCubic(progressBetween(elapsedSeconds, 32.0, 33.7));
        widthDelta = 38 + (-8 - 38) * shrink;
      } else {
        const expand = easeInOutCubic(progressBetween(elapsedSeconds, 33.7, 35.6));
        widthDelta = -8 + (34 - -8) * expand;
      }
      isReversing = elapsedSeconds < 35.85;
      isBraking = elapsedSeconds >= 35.35;
    } else {
      // Beat 5A: Pull widened car smoothly to -34 deg as left narrow-street curb closes to x = 256 (Bx = 261.63 — zero clip)
      const u = easeInOutCubic(progressBetween(elapsedSeconds, 36.35, 38.65));
      headingDeg = -34 * u;
      widthDelta = 34;
      isReversing = false;
      isBraking = elapsedSeconds >= 38.35;
      heroOpacity = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 40.45, 40.75));
    }

    carCenter = rotateLocalPointAroundX(0, 0, headingDeg);
    frontRightSteerDeg = -((Math.atan2(WHEELBASE_LOCAL, RADIUS_FX_LOCAL) * 180) / Math.PI);
    frontLeftSteerDeg = computeWidenedFrontLeftSteer(frontRightSteerDeg, widthDelta);
    wheelRollDistance = -(RADIUS_FX_LOCAL * degToRad(headingDeg));
  } else {
    // Beat 5B (40.75s - 44.00s): 2 genuine collision-free Ackermann shuttle passes inside bay
    const fadeIn = easeOutCubic(progressBetween(elapsedSeconds, 40.75, 40.98));
    const shuttlePose = sampleShuttlePassSequence(
      elapsedSeconds,
      BEAT5B_SHUTTLE_PASSES,
      CAR_SCALE,
      SHORT_02_DIMENSIONS,
      fadeIn,
    );
    widthDelta = BEAT5B_WIDTH_DELTA;
    carCenter = { x: shuttlePose.centerX, y: shuttlePose.centerY };
    headingDeg = shuttlePose.headingDeg;
    frontRightSteerDeg = shuttlePose.frontRightSteerDeg;
    frontLeftSteerDeg = computeWidenedFrontLeftSteer(frontRightSteerDeg, widthDelta);
    wheelRollDistance = shuttlePose.wheelRollDistance;
    isReversing = shuttlePose.isReversing;
    isBraking = shuttlePose.isBraking;
    heroOpacity = shuttlePose.opacity;
    shuttleRearAxle = { x: shuttlePose.rearAxleX, y: shuttlePose.rearAxleY };
  }

  // Exact world coordinates of all key vehicle points (works uniformly across circular & shuttle beats)
  const pointA = localPointToWorld(carCenter.x, carCenter.y, headingDeg, HALF_W, -HALF_L, CAR_SCALE);
  const pointB = localPointToWorld(carCenter.x, carCenter.y, headingDeg, -HALF_W - widthDelta, -HALF_L, CAR_SCALE);
  const pointC = localPointToWorld(carCenter.x, carCenter.y, headingDeg, -HALF_W - widthDelta, HALF_L, CAR_SCALE);
  const pointD = localPointToWorld(carCenter.x, carCenter.y, headingDeg, HALF_W, HALF_L, CAR_SCALE);
  const wheelE = localPointToWorld(carCenter.x, carCenter.y, headingDeg, TRACK_HALF_W, -WHEEL_HALF_L, CAR_SCALE);
  const wheelF = localPointToWorld(carCenter.x, carCenter.y, headingDeg, TRACK_HALF_W, WHEEL_HALF_L, CAR_SCALE);
  const wheelFrontLeft = localPointToWorld(
    carCenter.x,
    carCenter.y,
    headingDeg,
    -TRACK_HALF_W - widthDelta,
    -WHEEL_HALF_L,
    CAR_SCALE,
  );
  const frontKerbEdgeE = localPointToWorld(carCenter.x, carCenter.y, headingDeg, TRACK_HALF_W, -HALF_L, CAR_SCALE);
  const bcMid: Point2D = { x: (pointB.x + pointC.x) * 0.5, y: (pointB.y + pointC.y) * 0.5 };
  const normalCornerB = localPointToWorld(carCenter.x, carCenter.y, headingDeg, -HALF_W, -HALF_L, CAR_SCALE);

  // Beat-synced highlights matched to vo-short-02.json word timestamps
  const rFormulaGlow = pulseEnvelope(elapsedSeconds, 9.6, 10.0, 10.9, 11.25);
  const lFormulaGlow = pulseEnvelope(elapsedSeconds, 11.2, 11.4, 12.1, 12.35);
  const kFormulaGlow = pulseEnvelope(elapsedSeconds, 12.3, 12.5, 13.3, 13.6);
  const wFormulaGlow = pulseEnvelope(elapsedSeconds, 13.8, 14.2, 15.9, 16.3);

  const ownWidthPulse = Math.max(
    pulseEnvelope(elapsedSeconds, 0.25, 0.75, 2.8, 3.8),
    pulseEnvelope(elapsedSeconds, 16.3, 16.6, 17.8, 18.5),
  );

  // Formula scan sweep during "Completely missing." (17.65s - 19.05s)
  const formulaScanProgress = progressBetween(elapsedSeconds, 17.65, 19.05);
  const showFormulaScan = formulaScanProgress > 0 && formulaScanProgress < 1;
  const formulaScanX = -290 + 575 * easeInOutCubic(formulaScanProgress);

  const circlesLayerOpacity = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 40.3, 40.85));
  const ackermannRaysOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 5.2, 6.2)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 36.2, 37.0)));

  const pinchPointGlow = Math.max(
    pulseEnvelope(elapsedSeconds, 23.4, 24.4, 27.9, 28.6),
    pulseEnvelope(elapsedSeconds, 32.3, 33.0, 35.8, 36.4),
  );
  const grazeFlash = Math.max(pulseFactor(elapsedSeconds, 24.85, 0.65), pulseFactor(elapsedSeconds, 33.1, 0.65));
  const bcEdgeGlow = pulseEnvelope(elapsedSeconds, 28.4, 29.5, 33.2, 34.0);
  const bcToXIndicator = pulseEnvelope(elapsedSeconds, 29.4, 30.2, 33.2, 34.0);
  const outerPathGlow = pulseEnvelope(elapsedSeconds, 32.6, 33.6, 35.9, 36.5);

  // Narrow-street wall closing in (37.0s - 38.9s)
  const narrowRoadProgress = easeInOutCubic(progressBetween(elapsedSeconds, 37.0, 38.9));
  const asphaltLeftX = WIDE_ASPHALT_LEFT_X + (NARROW_ROAD_WALL_X - WIDE_ASPHALT_LEFT_X) * narrowRoadProgress;
  const wideLaneDividerOpacity = 1 - easeInOutCubic(progressBetween(elapsedSeconds, 37.1, 38.5));
  const narrowWarningGlow = pulseEnvelope(elapsedSeconds, 38.1, 38.8, 40.45, 40.75);
  const narrowNormalGhostOpacity =
    easeOutCubic(progressBetween(elapsedSeconds, 37.9, 38.6)) *
    (1 - easeInOutCubic(progressBetween(elapsedSeconds, 40.4, 40.75))) *
    0.44;

  // Beat 5B Rear Parked Car & Live S-Curve Trail (40.55s - 44.00s)
  const rearParkedOpacity = easeOutCubic(progressBetween(elapsedSeconds, 40.55, 41.0));
  const beat5bTrail = useMemo(() => {
    if (elapsedSeconds < 41.0) {
      return "";
    }
    return buildShuttleMidpointTrail(41.0, elapsedSeconds, BEAT5B_SHUTTLE_PASSES, CAR_SCALE, SHORT_02_DIMENSIONS);
  }, [elapsedSeconds]);
  const beat5bTrailOpacity = easeOutCubic(progressBetween(elapsedSeconds, 41.0, 41.25));

  // Status banner text synced with current beat
  let statusText = "OWN CAR WIDTH = ?";
  let statusAlert = false;
  if (elapsedSeconds >= 16.3 && elapsedSeconds < 20.4) {
    statusText = "OWN CAR WIDTH: NOT IN FORMULA";
    statusAlert = true;
  } else if (elapsedSeconds >= 20.4 && elapsedSeconds < 28.0) {
    statusText = "PINCH POINT: CORNER A CLEARS G";
  } else if (elapsedSeconds >= 28.0 && elapsedSeconds < 36.3) {
    statusText = "B–C SHIFTS TO X · PATH OF A LOCKED";
  } else if (elapsedSeconds >= 36.3) {
    statusText = "NARROW ROADS & SHUFFLING: WIDTH MATTERS";
    statusAlert = true;
  }

  const hRad = degToRad(headingDeg);
  const rightX = Math.cos(hRad);
  const rightY = Math.sin(hRad);
  const upX = Math.sin(hRad);
  const upY = -Math.cos(hRad);

  const ownCaliperLeft: Point2D = {
    x: pointB.x + upX * 11,
    y: pointB.y + upY * 11,
  };
  const ownCaliperRight: Point2D = {
    x: pointA.x + upX * 11,
    y: pointA.y + upY * 11,
  };
  const ownCaliperMid: Point2D = {
    x: (ownCaliperLeft.x + ownCaliperRight.x) * 0.5 + upX * 11,
    y: (ownCaliperLeft.y + ownCaliperRight.y) * 0.5 + upY * 11,
  };

  return (
    <svg viewBox="0 0 540 960" className="h-full w-full select-none">
      <title>Portrait Short 02: Why doesn&apos;t your own car&apos;s width appear in the parking formula</title>
      <defs>
        <radialGradient id="short02-ambient-glow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="oklch(0.28 0 0 / 0.52)" />
          <stop offset="60%" stopColor="oklch(0.2 0 0 / 0.2)" />
          <stop offset="100%" stopColor="oklch(0.14 0 0 / 0)" />
        </radialGradient>

        <radialGradient id="short02-grid-fade" cx="50%" cy="46%" r="52%">
          <stop offset="0%" stopColor="white" stopOpacity={0.9} />
          <stop offset="72%" stopColor="white" stopOpacity={0.28} />
          <stop offset="100%" stopColor="black" stopOpacity={0} />
        </radialGradient>

        <mask id="short02-grid-mask">
          <rect x={0} y={156} width={540} height={414} fill="url(#short02-grid-fade)" />
        </mask>

        <filter id="short02-luminous-glow" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="short02-card-shadow" x="-15%" y="-30%" width="130%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="oklch(0 0 0)" floodOpacity="0.48" />
        </filter>

        <linearGradient id="short02-road-fade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="black" stopOpacity={0} />
          <stop offset="8%" stopColor="white" stopOpacity={1} />
          <stop offset="88%" stopColor="white" stopOpacity={1} />
          <stop offset="100%" stopColor="black" stopOpacity={0} />
        </linearGradient>

        <mask id="short02-road-fade-mask">
          <rect x={0} y={160} width={540} height={408} fill="url(#short02-road-fade-grad)" />
        </mask>

        <linearGradient id="short02-asphalt-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.145 0 0)" />
          <stop offset="22%" stopColor="oklch(0.165 0 0)" />
          <stop offset="56%" stopColor="oklch(0.178 0 0)" />
          <stop offset="100%" stopColor="oklch(0.145 0 0)" />
        </linearGradient>

        <linearGradient id="short02-sidewalk-right-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.88)" />
          <stop offset="55%" stopColor="oklch(0.19 0 0 / 0.4)" />
          <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
        </linearGradient>

        <linearGradient id="short02-sidewalk-left-grad" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.22 0 0 / 0.84)" />
          <stop offset="55%" stopColor="oklch(0.18 0 0 / 0.35)" />
          <stop offset="100%" stopColor="oklch(0.16 0 0 / 0)" />
        </linearGradient>

        <CutPlaneCarDefs />
      </defs>

      {/* ================================================================
          LAYER 1: AMBIENT STAGE GLOW & ARCHITECTURAL BLUEPRINT GRID
         ================================================================ */}
      <circle cx={270} cy={380} r={275} fill="url(#short02-ambient-glow)" />

      <g mask="url(#short02-grid-mask)" stroke="oklch(0.75 0 0 / 0.08)" strokeWidth={0.85}>
        {GRID_X.map((gx) => (
          <line key={`gx-${gx}`} x1={gx} y1={160} x2={gx} y2={568} />
        ))}
        {GRID_Y.map((gy) => (
          <line key={`gy-${gy}`} x1={30} y1={gy} x2={510} y2={gy} />
        ))}
      </g>

      {/* ================================================================
          LAYER 2: ARCHITECTURAL ROAD STAGE (WIDENS / NARROWS LEFT EDGE)
         ================================================================ */}
      <g mask="url(#short02-road-fade-mask)">
        <rect x={asphaltLeftX - 96} y={160} width={92} height={408} fill="url(#short02-sidewalk-left-grad)" />
        <rect x={asphaltLeftX - 4} y={160} width={4} height={408} fill="oklch(0.27 0 0)" />
        <line
          x1={asphaltLeftX}
          y1={160}
          x2={asphaltLeftX}
          y2={568}
          stroke={narrowWarningGlow > 0.12 ? "oklch(0.84 0.16 25)" : "oklch(0.56 0 0 / 0.46)"}
          strokeWidth={narrowWarningGlow > 0.12 ? 2.1 : 1.2}
        />

        <rect x={KERB_STONE_X + 7} y={160} width={110} height={408} fill="url(#short02-sidewalk-right-grad)" />
        <g stroke="oklch(0.32 0 0 / 0.34)" strokeWidth={1}>
          {PAVING_JOINT_Y.map((y) => (
            <line key={`pave-${y}`} x1={KERB_STONE_X + 7} y1={y} x2={KERB_STONE_X + 106} y2={y} />
          ))}
        </g>

        <rect
          x={asphaltLeftX}
          y={160}
          width={KERB_STONE_X - asphaltLeftX}
          height={408}
          fill="url(#short02-asphalt-grad)"
        />
        <rect x={asphaltLeftX} y={160} width={6} height={408} fill="oklch(0.11 0 0 / 0.5)" />
        <rect x={KERB_STONE_X - 6} y={160} width={6} height={408} fill="oklch(0.11 0 0 / 0.55)" />

        <rect x={KERB_STONE_X} y={160} width={7} height={408} fill="oklch(0.29 0 0)" />
        <line x1={KERB_STONE_X} y1={160} x2={KERB_STONE_X} y2={568} stroke="oklch(0.72 0 0 / 0.65)" strokeWidth={1.4} />
        <g stroke="oklch(0.44 0 0 / 0.65)" strokeWidth={1}>
          {KERB_JOINT_Y.map((y) => (
            <line key={`kerb-${y}`} x1={KERB_STONE_X} y1={y} x2={KERB_STONE_X + 7} y2={y} />
          ))}
        </g>

        <line
          x1={PARKING_LINE_X}
          y1={160}
          x2={PARKING_LINE_X}
          y2={568}
          stroke="oklch(0.62 0 0 / 0.34)"
          strokeWidth={1.15}
          strokeDasharray="7 9"
        />

        {wideLaneDividerOpacity > 0.01 ? (
          <line
            x1={231}
            y1={168}
            x2={231}
            y2={560}
            stroke="oklch(0.74 0 0 / 0.4)"
            strokeWidth={1.55}
            strokeDasharray="18 15"
            opacity={wideLaneDividerOpacity}
          />
        ) : null}

        <line
          x1={KERB_LINE_X}
          y1={168}
          x2={KERB_LINE_X}
          y2={560}
          stroke="oklch(0.76 0 0 / 0.25)"
          strokeWidth={1}
          strokeDasharray="3 5"
        />

        {/* ================================================================
            LAYER 3: PARKED CARS & GHOST COMPARISON OUTLINES
           ================================================================ */}
        {/* Front Parked Car (Width w) */}
        <g transform={`translate(${PARALLEL_CENTER_X}, ${FRONT_PARKED_CENTER_Y}) scale(${CAR_SCALE})`}>
          <CutPlaneCar
            variant={CarSectionVariants.Parked}
            kerbSide={KerbSides.Right}
            showBoundingBox={false}
            showVertexLabels={false}
            showAxlePlaneLines={false}
          />
        </g>

        {/* Rear Parked Car (Fades in cleanly during Beat 5B tight-bay shuffle) */}
        {rearParkedOpacity > 0.01 ? (
          <g
            transform={`translate(${PARALLEL_CENTER_X}, ${REAR_PARKED_CENTER_Y}) scale(${CAR_SCALE})`}
            opacity={rearParkedOpacity}
          >
            <CutPlaneCar
              variant={CarSectionVariants.Parked}
              kerbSide={KerbSides.Right}
              showBoundingBox={false}
              showVertexLabels={false}
              showAxlePlaneLines={false}
            />
          </g>
        ) : null}
      </g>

      {/* Standard-Width Ghost Car During Narrow-Street Comparison (Rendered below Hero Car) */}
      {narrowNormalGhostOpacity > 0.01 ? (
        <g
          transform={`translate(${carCenter.x}, ${carCenter.y}) rotate(${headingDeg}) scale(${CAR_SCALE})`}
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

      {/* ================================================================
          LAYER 4: MORPHING 2D CUT-PLANE HERO CAR
         ================================================================ */}
      <g
        transform={`translate(${carCenter.x}, ${carCenter.y}) rotate(${headingDeg}) scale(${CAR_SCALE})`}
        opacity={heroOpacity}
      >
        <MorphingCutPlaneCar
          widthDelta={widthDelta}
          frontLeftSteerDeg={frontLeftSteerDeg}
          frontRightSteerDeg={frontRightSteerDeg}
          wheelRollDistance={wheelRollDistance}
          isReversing={isReversing}
          isBraking={isBraking}
        />
      </g>

      {/* ================================================================
          LAYER 5: ALL INFORMATIC GRAPHICS, CIRCLES, RAYS, CALIPERS & LABELS
          (STRICTLY ABOVE ALL VEHICLES & ROAD ELEMENTS)
         ================================================================ */}

      {/* Concentric Turning Circles Around X + Converging Ackermann Axle Rays */}
      {circlesLayerOpacity > 0.01 ? (
        <g opacity={circlesLayerOpacity}>
          <path d={WHEEL_F_ARC} fill="none" stroke="oklch(0.76 0 0 / 0.34)" strokeWidth={1.15} strokeDasharray="4 6" />
          <path d={WHEEL_E_ARC} fill="none" stroke="oklch(0.82 0 0 / 0.42)" strokeWidth={1.25} strokeDasharray="4 6" />

          {/* Soft glow backing + crisp core stroke on outer corner A circle */}
          {Math.max(pinchPointGlow, outerPathGlow) > 0.08 ? (
            <path
              d={OUTER_CIRCLE_ARC}
              fill="none"
              stroke="oklch(0.98 0 0 / 0.25)"
              strokeWidth={5.2}
              opacity={Math.max(pinchPointGlow, outerPathGlow)}
            />
          ) : null}
          <path
            d={OUTER_CIRCLE_ARC}
            fill="none"
            stroke={`oklch(0.98 0 0 / ${(0.72 + 0.28 * Math.max(pinchPointGlow, outerPathGlow)).toFixed(2)})`}
            strokeWidth={1.75 + 0.75 * outerPathGlow}
            filter={Math.max(pinchPointGlow, outerPathGlow) > 0.2 ? "url(#short02-luminous-glow)" : undefined}
          />

          {/* Dynamic Converging Ackermann Axle Projection Rays to X */}
          {ackermannRaysOpacity > 0.01 ? (
            <g
              opacity={ackermannRaysOpacity}
              stroke="oklch(0.9 0 0 / 0.42)"
              strokeWidth={1.1}
              strokeDasharray="3.5 4.5"
            >
              <line x1={TURNING_CENTER.x} y1={TURNING_CENTER.y} x2={wheelF.x} y2={wheelF.y} />
              <line x1={TURNING_CENTER.x} y1={TURNING_CENTER.y} x2={wheelE.x} y2={wheelE.y} />
              <line x1={TURNING_CENTER.x} y1={TURNING_CENTER.y} x2={wheelFrontLeft.x} y2={wheelFrontLeft.y} />
            </g>
          ) : null}
        </g>
      ) : null}

      {/* Synchronized Formula Calipers r, l, k, w (Strictly Above Cars) */}
      {rFormulaGlow > 0.02 ? (
        <g opacity={rFormulaGlow}>
          <line
            x1={TURNING_CENTER.x}
            y1={TURNING_CENTER.y}
            x2={wheelE.x}
            y2={wheelE.y}
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.1}
            filter="url(#short02-luminous-glow)"
          />
          <circle cx={wheelE.x} cy={wheelE.y} r={3.2} fill="oklch(0.99 0 0)" />
          <text
            x={(TURNING_CENTER.x + wheelE.x) * 0.5 - 10}
            y={(TURNING_CENTER.y + wheelE.y) * 0.5 - 8}
            textAnchor="end"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-math text-base font-semibold italic"
          >
            r
          </text>
        </g>
      ) : null}

      {lFormulaGlow > 0.02 ? (
        <g opacity={lFormulaGlow}>
          <line
            x1={wheelE.x}
            y1={wheelE.y}
            x2={wheelF.x}
            y2={wheelF.y}
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.4}
            filter="url(#short02-luminous-glow)"
          />
          <circle cx={wheelE.x} cy={wheelE.y} r={3} fill="oklch(0.99 0 0)" />
          <circle cx={wheelF.x} cy={wheelF.y} r={3} fill="oklch(0.99 0 0)" />
          <text
            x={(wheelE.x + wheelF.x) * 0.5 + rightX * 18}
            y={(wheelE.y + wheelF.y) * 0.5 + rightY * 18 + 4}
            textAnchor="start"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-math text-base font-semibold italic"
          >
            l
          </text>
        </g>
      ) : null}

      {kFormulaGlow > 0.02 ? (
        <g opacity={kFormulaGlow}>
          <line
            x1={frontKerbEdgeE.x}
            y1={frontKerbEdgeE.y}
            x2={wheelE.x}
            y2={wheelE.y}
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.5}
            filter="url(#short02-luminous-glow)"
          />
          <circle cx={frontKerbEdgeE.x} cy={frontKerbEdgeE.y} r={3} fill="oklch(0.99 0 0)" />
          <text
            x={(frontKerbEdgeE.x + wheelE.x) * 0.5 + rightX * 18}
            y={(frontKerbEdgeE.y + wheelE.y) * 0.5 + rightY * 18 + 4}
            textAnchor="start"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-math text-base font-semibold italic"
          >
            k
          </text>
        </g>
      ) : null}

      {wFormulaGlow > 0.02 ? (
        <g opacity={wFormulaGlow}>
          <line
            x1={POINT_G.x}
            y1={POINT_G.y}
            x2={POINT_H.x}
            y2={POINT_H.y}
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.5}
            filter="url(#short02-luminous-glow)"
          />
          <g stroke="oklch(0.94 0 0 / 0.78)" strokeWidth={1.2}>
            <line x1={POINT_G.x} y1={POINT_G.y + 6} x2={POINT_G.x} y2={POINT_G.y + 17} />
            <line x1={POINT_H.x} y1={POINT_H.y + 6} x2={POINT_H.x} y2={POINT_H.y + 17} />
            <line x1={POINT_G.x} y1={POINT_G.y + 12} x2={POINT_H.x} y2={POINT_H.y + 12} />
          </g>
          <text
            x={PARALLEL_CENTER_X}
            y={POINT_G.y + 29}
            textAnchor="middle"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-math text-base font-semibold italic"
          >
            w
          </text>
        </g>
      ) : null}

      {/* Own-Car Width Caliper Highlight (Rendered Strictly Above Hero Car) */}
      {ownWidthPulse > 0.02 ? (
        <g opacity={ownWidthPulse}>
          <line
            x1={ownCaliperLeft.x}
            y1={ownCaliperLeft.y}
            x2={ownCaliperRight.x}
            y2={ownCaliperRight.y}
            stroke="oklch(0.99 0 0)"
            strokeWidth={2.1}
            filter="url(#short02-luminous-glow)"
          />
          <g stroke="oklch(0.99 0 0)" strokeWidth={1.4}>
            <line
              x1={ownCaliperLeft.x - upX * 4}
              y1={ownCaliperLeft.y - upY * 4}
              x2={ownCaliperLeft.x + upX * 4}
              y2={ownCaliperLeft.y + upY * 4}
            />
            <line
              x1={ownCaliperRight.x - upX * 4}
              y1={ownCaliperRight.y - upY * 4}
              x2={ownCaliperRight.x + upX * 4}
              y2={ownCaliperRight.y + upY * 4}
            />
          </g>
          <text
            x={ownCaliperMid.x}
            y={ownCaliperMid.y + 4}
            textAnchor="middle"
            stroke="oklch(0.15 0 0 / 0.94)"
            strokeWidth={4}
            strokeLinejoin="round"
            className="svg-label-halo fill-text-primary font-mono text-sm font-semibold"
          >
            ?
          </text>
        </g>
      ) : null}

      {/* Luminous Outside Edge B-C Highlight & Dynamic Distance Indicator to Turning Center X */}
      {bcEdgeGlow > 0.02 ? (
        <line
          x1={pointB.x}
          y1={pointB.y}
          x2={pointC.x}
          y2={pointC.y}
          stroke="oklch(0.99 0 0)"
          strokeWidth={2.8}
          strokeLinecap="round"
          opacity={bcEdgeGlow}
          filter="url(#short02-luminous-glow)"
        />
      ) : null}

      {bcToXIndicator > 0.02 ? (
        <g opacity={bcToXIndicator}>
          <line
            x1={bcMid.x}
            y1={bcMid.y}
            x2={TURNING_CENTER.x}
            y2={TURNING_CENTER.y}
            stroke="oklch(0.98 0 0 / 0.88)"
            strokeWidth={1.65}
            strokeDasharray="4 4"
            filter="url(#short02-luminous-glow)"
          />
          <circle cx={bcMid.x} cy={bcMid.y} r={3.6} fill="oklch(0.99 0 0)" />
        </g>
      ) : null}

      {/* Beat 5A Narrow-Street Stolen-Room Clearance Indicator (No Wall Clip!) */}
      {narrowWarningGlow > 0.02 ? (
        <g opacity={narrowWarningGlow}>
          {/* Shaded stolen lane-width band between normal ghost corner B and widened corner B */}
          <line
            x1={NARROW_ROAD_WALL_X}
            y1={pointB.y}
            x2={normalCornerB.x}
            y2={pointB.y}
            stroke="oklch(0.84 0.16 25 / 0.85)"
            strokeWidth={1.6}
            strokeDasharray="3 3"
          />
          <line
            x1={pointB.x}
            y1={pointB.y}
            x2={normalCornerB.x}
            y2={pointB.y}
            stroke="oklch(0.86 0.16 25)"
            strokeWidth={2.6}
          />
          <g stroke="oklch(0.86 0.16 25)" strokeWidth={1.4}>
            <line x1={NARROW_ROAD_WALL_X} y1={pointB.y - 8} x2={NARROW_ROAD_WALL_X} y2={pointB.y + 8} />
            <line x1={normalCornerB.x} y1={pointB.y - 6} x2={normalCornerB.x} y2={pointB.y + 6} />
          </g>
          <g transform={`translate(${pointB.x}, ${pointB.y})`}>
            <circle
              cx={0}
              cy={0}
              r={11}
              fill="oklch(0.7 0.16 25 / 0.2)"
              stroke="oklch(0.86 0.16 25)"
              strokeWidth={1.6}
            />
            <circle cx={0} cy={0} r={3.8} fill="oklch(0.88 0.16 25)" />
          </g>
        </g>
      ) : null}

      {/* Beat 5B Luminous Dashed Rear-Axle Midpoint S-Trail */}
      {beat5bTrail ? (
        <g opacity={beat5bTrailOpacity}>
          <polyline
            points={beat5bTrail}
            fill="none"
            stroke="oklch(0.86 0.16 25 / 0.28)"
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={beat5bTrail}
            fill="none"
            stroke="oklch(0.96 0 0 / 0.94)"
            strokeWidth={1.8}
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#short02-luminous-glow)"
          />
          {shuttleRearAxle ? (
            <circle
              cx={shuttleRearAxle.x}
              cy={shuttleRearAxle.y}
              r={3.8}
              fill="oklch(0.99 0 0)"
              filter="url(#short02-luminous-glow)"
            />
          ) : null}
        </g>
      ) : null}

      {/* Pinch Point G, Turning Center X & Moving Vertices A, B, C, D */}
      <g transform={`translate(${POINT_G.x}, ${POINT_G.y})`}>
        {Math.max(pinchPointGlow, grazeFlash) > 0.03 ? (
          <circle
            cx={0}
            cy={0}
            r={8 + 11 * Math.max(pinchPointGlow, grazeFlash)}
            fill="none"
            stroke="oklch(0.99 0 0)"
            strokeWidth={1.4}
            opacity={Math.max(pinchPointGlow, grazeFlash) * 0.88}
          />
        ) : null}
        <circle
          cx={0}
          cy={0}
          r={3.8 + 1.3 * Math.max(pinchPointGlow, grazeFlash)}
          fill="oklch(0.99 0 0)"
          filter={Math.max(pinchPointGlow, grazeFlash) > 0.1 ? "url(#short02-luminous-glow)" : undefined}
        />
        <text
          x={-11}
          y={-6}
          textAnchor="end"
          stroke="oklch(0.15 0 0 / 0.94)"
          strokeWidth={4}
          strokeLinejoin="round"
          className="svg-label-halo fill-text-primary font-mono text-xs font-semibold"
        >
          G
        </text>
      </g>

      {circlesLayerOpacity > 0.01 ? (
        <g transform={`translate(${TURNING_CENTER.x}, ${TURNING_CENTER.y})`} opacity={circlesLayerOpacity}>
          {bcToXIndicator > 0.03 ? (
            <circle
              cx={0}
              cy={0}
              r={15 + 7 * bcToXIndicator}
              fill="none"
              stroke="oklch(0.98 0 0)"
              strokeWidth={1.25}
              opacity={bcToXIndicator * 0.8}
            />
          ) : null}
          <polygon
            points="0,-13 11.26,-6.5 11.26,6.5 0,13 -11.26,6.5 -11.26,-6.5"
            fill="oklch(0.22 0 0 / 0.96)"
            stroke="oklch(0.94 0 0 / 0.9)"
            strokeWidth={1.3}
          />
          <circle cx={0} cy={0} r={4} fill="oklch(0.99 0 0)" filter="url(#short02-luminous-glow)" />
          <text
            x={-17}
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

      {/* Moving Vertices A, B, C, D */}
      <g className="font-mono text-xs font-semibold" opacity={heroOpacity}>
        {grazeFlash > 0.04 ? (
          <circle
            cx={pointA.x}
            cy={pointA.y}
            r={7 + 6 * grazeFlash}
            fill="none"
            stroke="oklch(0.99 0 0)"
            strokeWidth={1.2}
            opacity={grazeFlash * 0.85}
          />
        ) : null}
        <circle cx={pointA.x} cy={pointA.y} r={3.6} fill="oklch(0.99 0 0)" filter="url(#short02-luminous-glow)" />
        <text
          x={pointA.x + rightX * 12}
          y={pointA.y + rightY * 12 + 4}
          textAnchor="start"
          stroke="oklch(0.15 0 0 / 0.94)"
          strokeWidth={3.5}
          strokeLinejoin="round"
          className="svg-label-halo fill-text-primary"
        >
          A
        </text>

        <circle cx={pointB.x} cy={pointB.y} r={2.8} fill="oklch(0.92 0 0)" />
        <text
          x={pointB.x - rightX * 12}
          y={pointB.y - rightY * 12 + 4}
          textAnchor="end"
          stroke="oklch(0.15 0 0 / 0.94)"
          strokeWidth={3.5}
          strokeLinejoin="round"
          className="svg-label-halo fill-text-secondary"
        >
          B
        </text>

        <circle cx={pointC.x} cy={pointC.y} r={2.8} fill="oklch(0.92 0 0)" />
        <text
          x={pointC.x - rightX * 12}
          y={pointC.y - rightY * 12 + 4}
          textAnchor="end"
          stroke="oklch(0.15 0 0 / 0.94)"
          strokeWidth={3.5}
          strokeLinejoin="round"
          className="svg-label-halo fill-text-secondary"
        >
          C
        </text>

        <circle cx={pointD.x} cy={pointD.y} r={2.6} fill="oklch(0.84 0 0)" />
        <text
          x={pointD.x + rightX * 12}
          y={pointD.y + rightY * 12 + 4}
          textAnchor="start"
          stroke="oklch(0.15 0 0 / 0.94)"
          strokeWidth={3.5}
          strokeLinejoin="round"
          className="svg-label-halo fill-text-secondary"
        >
          D
        </text>
      </g>

      {/* ================================================================
          TOP SAFE-ZONE TITLE HEADER (y = 108..154)
         ================================================================ */}
      <g>
        <text x={36} y={120} className="fill-text-muted font-mono text-xs tracking-mono tabular-nums">
          02 · THE WIDTH PARADOX
        </text>
        <text x={36} y={147} className="fill-text-primary font-display text-xl font-heading tracking-heading">
          Why Car Width Doesn&apos;t Matter
        </text>
      </g>

      {/* ================================================================
          LOWER SAFE-ZONE STATUS PILL & MASTER FORMULA (y = 584..722)
         ================================================================ */}
      <g transform="translate(242, 606)" filter="url(#short02-card-shadow)">
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

      <g transform="translate(242, 686)" filter="url(#short02-card-shadow)">
        <rect
          x={-206}
          y={-36}
          width={412}
          height={72}
          rx={10}
          fill="oklch(0.2 0 0 / 0.96)"
          stroke="oklch(0.95 0 0 / 0.84)"
          strokeWidth={1.45}
        />

        <g transform="translate(3, 5) scale(0.61)">
          {showFormulaScan ? (
            <g>
              <rect x={formulaScanX - 28} y={-44} width={56} height={64} rx={6} fill="oklch(0.98 0 0 / 0.08)" />
              <line
                x1={formulaScanX}
                y1={-46}
                x2={formulaScanX}
                y2={22}
                stroke="oklch(0.98 0 0 / 0.85)"
                strokeWidth={1.6}
                filter="url(#short02-luminous-glow)"
              />
            </g>
          ) : null}

          <MasterFormula
            glowFilterId="short02-luminous-glow"
            rGlow={rFormulaGlow}
            lGlow={lFormulaGlow}
            kGlow={kFormulaGlow}
            wGlow={wFormulaGlow}
            showWRing={true}
          />
        </g>
      </g>
    </svg>
  );
}
