export const CarSectionVariants = {
  Hero: "hero",
  Parked: "parked",
  Ghost: "ghost",
} as const;

export type CarSectionVariant = (typeof CarSectionVariants)[keyof typeof CarSectionVariants];

export const KerbSides = {
  Left: "left",
  Right: "right",
} as const;

export type KerbSide = (typeof KerbSides)[keyof typeof KerbSides];

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface VehicleDimensions {
  readonly width: number;
  readonly length: number;
  readonly wheelbase: number;
  readonly frontOverhang: number;
  readonly rearOverhang: number;
  readonly trackHalfWidth: number;
}

/**
 * Default 2D Cut-Plane Car dimensions (Scale: 40px = 1.0m):
 * - Wheelbase l = 104px (2.6m)
 * - Front overhang k = 32px (0.8m)
 * - Rear overhang = 32px (0.8m)
 * - Total length L = 168px (4.2m)
 * - Body width = 76px (1.9m), Half-width = 38px
 * - Track half-width b = 31px (wheel centers E and F at local x = -31px)
 */
export const DEFAULT_VEHICLE_DIMENSIONS: VehicleDimensions = {
  width: 76,
  length: 168,
  wheelbase: 104,
  frontOverhang: 32,
  rearOverhang: 32,
  trackHalfWidth: 31,
};

export interface DriverControlSegment {
  readonly startTime: number;
  readonly endTime: number;
  /** Target virtual steering angle in degrees (+ = right steer, - = left steer) */
  readonly targetSteerDeg: number;
  /** Target longitudinal speed in px/s (+ = drive forward, - = reverse) */
  readonly targetSpeed: number;
  /** Optional instant teleport pose at segment start (used to reset between demo phases) */
  readonly resetPose?: {
    readonly rearAxleX: number;
    readonly rearAxleY: number;
    readonly headingDeg: number;
    readonly steerDeg: number;
  };
}

export interface VehiclePoseSnapshot {
  readonly time: number;
  /** Midpoint of the fixed rear axle in world SVG coordinates */
  readonly rearAxleX: number;
  readonly rearAxleY: number;
  /** Geometric center of the car bounding box ABCD in world SVG coordinates */
  readonly centerX: number;
  readonly centerY: number;
  /** Heading in degrees (0 = facing straight UP -Y; + = clockwise) */
  readonly headingDeg: number;
  /** Virtual center steering angle in degrees */
  readonly steerDeg: number;
  /** True Ackermann front-left wheel angle in degrees (Point E) */
  readonly frontLeftSteerDeg: number;
  /** True Ackermann front-right wheel angle in degrees (Point E) */
  readonly frontRightSteerDeg: number;
  /** Longitudinal velocity in px/s */
  readonly velocity: number;
  /** Cumulative distance rolled by wheels (for tread animation) */
  readonly wheelRollDistance: number;
  /** Instantaneous turning center X in world coordinates (null when driving straight) */
  readonly turningCenter: Point2D | null;
  /** World coordinates of key Blackburn paper points */
  readonly cornerA: Point2D;
  readonly cornerB: Point2D;
  readonly cornerC: Point2D;
  readonly cornerD: Point2D;
  readonly wheelE: Point2D;
  readonly wheelF: Point2D;
  readonly wheelFrontRight: Point2D;
  readonly wheelRearRight: Point2D;
}

export interface SimulatedTimeline {
  readonly snapshots: readonly VehiclePoseSnapshot[];
  readonly stepSeconds: number;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Transforms a local car point (where origin (0,0) is geometric center of car ABCD,
 * -Y is forward, +Y is rear, -X is left/kerb-side, +X is right) into world coordinates.
 */
function localToWorld(centerX: number, centerY: number, headingRad: number, localX: number, localY: number): Point2D {
  const cosH = Math.cos(headingRad);
  const sinH = Math.sin(headingRad);
  return {
    x: centerX + localX * cosH - localY * sinH,
    y: centerY + localX * sinH + localY * cosH,
  };
}

/**
 * Given the virtual steering angle `steerDeg`, computes the exact Ackermann angles
 * for the front-left and front-right wheels so both front axle normals intersect
 * the rear axle line at the exact same turning center X.
 */
export function computeAckermannAngles(
  steerDeg: number,
  dims: VehicleDimensions = DEFAULT_VEHICLE_DIMENSIONS,
): {
  readonly frontLeftSteerDeg: number;
  readonly frontRightSteerDeg: number;
  readonly turningRadiusSigned: number | null;
} {
  const steerRad = degToRad(steerDeg);
  if (Math.abs(steerRad) < 0.001) {
    return {
      frontLeftSteerDeg: 0,
      frontRightSteerDeg: 0,
      turningRadiusSigned: null,
    };
  }

  // Signed distance along the rear axle line from rear-axle midpoint to turning center X
  // (+ = right of car, - = left of car)
  const turningRadiusSigned = dims.wheelbase / Math.tan(steerRad);
  const b = dims.trackHalfWidth;

  const leftRad = Math.atan2(dims.wheelbase, turningRadiusSigned + b);
  const rightRad = Math.atan2(dims.wheelbase, turningRadiusSigned - b);

  // Normalize atan2 when turningRadiusSigned < 0 (turning center on the left)
  const normalizeSteer = (angleRad: number): number => {
    if (turningRadiusSigned < 0) {
      return radToDeg(angleRad - Math.PI);
    }
    return radToDeg(angleRad);
  };

  return {
    frontLeftSteerDeg: normalizeSteer(leftRad),
    frontRightSteerDeg: normalizeSteer(rightRad),
    turningRadiusSigned,
  };
}

export function buildVehicleSnapshot(
  time: number,
  rearAxleX: number,
  rearAxleY: number,
  headingDeg: number,
  steerDeg: number,
  velocity: number,
  wheelRollDistance: number,
  dims: VehicleDimensions = DEFAULT_VEHICLE_DIMENSIONS,
): VehiclePoseSnapshot {
  const headingRad = degToRad(headingDeg);
  const halfWheelbase = dims.wheelbase * 0.5;

  // Rear axle midpoint is at local (0, +halfWheelbase).
  // Therefore geometric center (0, 0) is halfWheelbase forward along heading vector (sinH, -cosH).
  const centerX = rearAxleX + halfWheelbase * Math.sin(headingRad);
  const centerY = rearAxleY - halfWheelbase * Math.cos(headingRad);

  const { frontLeftSteerDeg, frontRightSteerDeg, turningRadiusSigned } = computeAckermannAngles(steerDeg, dims);

  const halfW = dims.width * 0.5;
  const halfL = dims.length * 0.5;
  const b = dims.trackHalfWidth;

  const cornerA = localToWorld(centerX, centerY, headingRad, -halfW, -halfL);
  const cornerB = localToWorld(centerX, centerY, headingRad, halfW, -halfL);
  const cornerC = localToWorld(centerX, centerY, headingRad, halfW, halfL);
  const cornerD = localToWorld(centerX, centerY, headingRad, -halfW, halfL);

  const wheelE = localToWorld(centerX, centerY, headingRad, -b, -halfWheelbase);
  const wheelF = localToWorld(centerX, centerY, headingRad, -b, halfWheelbase);
  const wheelFrontRight = localToWorld(centerX, centerY, headingRad, b, -halfWheelbase);
  const wheelRearRight = localToWorld(centerX, centerY, headingRad, b, halfWheelbase);

  const turningCenter =
    turningRadiusSigned !== null
      ? localToWorld(centerX, centerY, headingRad, turningRadiusSigned, halfWheelbase)
      : null;

  return {
    time,
    rearAxleX,
    rearAxleY,
    centerX,
    centerY,
    headingDeg,
    steerDeg,
    frontLeftSteerDeg,
    frontRightSteerDeg,
    velocity,
    wheelRollDistance,
    turningCenter,
    cornerA,
    cornerB,
    cornerC,
    cornerD,
    wheelE,
    wheelF,
    wheelFrontRight,
    wheelRearRight,
  };
}

/**
 * Fixed-timestep 2D vehicle dynamics & Ackermann kinematic integrator.
 * Inspired by Pat Kerr's 2D Vehicles: driver commands feed smoothed steering & velocity
 * dynamics, and the body advances strictly along non-holonomic wheel constraints.
 */
export function simulateDriverTimeline(
  initialPose: {
    readonly rearAxleX: number;
    readonly rearAxleY: number;
    readonly headingDeg: number;
    readonly steerDeg: number;
  },
  segments: readonly DriverControlSegment[],
  totalDurationSeconds: number,
  dims: VehicleDimensions = DEFAULT_VEHICLE_DIMENSIONS,
): SimulatedTimeline {
  const stepSeconds = 1 / 120;
  const totalSteps = Math.ceil(totalDurationSeconds / stepSeconds);
  const snapshots: VehiclePoseSnapshot[] = [];

  let rearAxleX = initialPose.rearAxleX;
  let rearAxleY = initialPose.rearAxleY;
  let headingDeg = initialPose.headingDeg;
  let steerDeg = initialPose.steerDeg;
  let velocity = 0;
  let wheelRollDistance = 0;
  let lastAppliedResetSegmentIndex = -1;

  // Steering actuator rate (deg/s) and longitudinal acceleration response
  const maxSteerRateDegPerSec = 110;
  const velocityResponseRate = 9.5;

  for (let step = 0; step <= totalSteps; step++) {
    const t = step * stepSeconds;

    let activeSegmentIndex = -1;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg && t >= seg.startTime && t <= seg.endTime) {
        activeSegmentIndex = i;
        break;
      }
    }

    const activeSegment = activeSegmentIndex >= 0 ? segments[activeSegmentIndex] : undefined;

    if (activeSegment?.resetPose && lastAppliedResetSegmentIndex !== activeSegmentIndex) {
      rearAxleX = activeSegment.resetPose.rearAxleX;
      rearAxleY = activeSegment.resetPose.rearAxleY;
      headingDeg = activeSegment.resetPose.headingDeg;
      steerDeg = activeSegment.resetPose.steerDeg;
      velocity = 0;
      lastAppliedResetSegmentIndex = activeSegmentIndex;
    }

    const targetSteer = activeSegment ? activeSegment.targetSteerDeg : steerDeg;
    const targetSpeed = activeSegment ? activeSegment.targetSpeed : 0;

    // Smooth steering actuator towards targetSteer
    const steerDiff = targetSteer - steerDeg;
    const maxSteerStep = maxSteerRateDegPerSec * stepSeconds;
    if (Math.abs(steerDiff) <= maxSteerStep) {
      steerDeg = targetSteer;
    } else {
      steerDeg += Math.sign(steerDiff) * maxSteerStep;
    }

    // Exponential damping / acceleration towards targetSpeed
    velocity += (targetSpeed - velocity) * Math.min(1, velocityResponseRate * stepSeconds);
    if (Math.abs(targetSpeed) < 0.01 && Math.abs(velocity) < 0.4) {
      velocity = 0;
    }

    // Record snapshot before advancing step
    snapshots.push(
      buildVehicleSnapshot(t, rearAxleX, rearAxleY, headingDeg, steerDeg, velocity, wheelRollDistance, dims),
    );

    // Non-holonomic bicycle/Ackermann update at the rear axle midpoint
    const headingRad = degToRad(headingDeg);
    const steerRad = degToRad(steerDeg);

    // Angular velocity: omega = (v * tan(delta)) / l
    const angularVelocityRad = (velocity * Math.tan(steerRad)) / dims.wheelbase;
    const midHeadingRad = headingRad + 0.5 * angularVelocityRad * stepSeconds;

    rearAxleX += velocity * Math.sin(midHeadingRad) * stepSeconds;
    rearAxleY += -velocity * Math.cos(midHeadingRad) * stepSeconds;
    headingDeg += radToDeg(angularVelocityRad * stepSeconds);
    wheelRollDistance += velocity * stepSeconds;
  }

  return {
    snapshots,
    stepSeconds,
  };
}

export function sampleSimulatedTimeline(timeline: SimulatedTimeline, timeSeconds: number): VehiclePoseSnapshot {
  const index = Math.max(0, Math.min(timeline.snapshots.length - 1, Math.round(timeSeconds / timeline.stepSeconds)));
  const snapshot = timeline.snapshots[index] ?? timeline.snapshots[0];
  if (!snapshot) {
    return buildVehicleSnapshot(0, 330, 386, 0, 0, 0, 0);
  }
  return snapshot;
}
