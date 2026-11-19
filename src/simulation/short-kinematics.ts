import { computeAckermannAngles, type Point2D, type VehicleDimensions } from "@/simulation/car-simulator";

export const TravelDirections = {
  Reverse: 1,
  Forward: -1,
} as const;

export type TravelDirection = (typeof TravelDirections)[keyof typeof TravelDirections];

export interface ShortVehiclePose {
  readonly centerX: number;
  readonly centerY: number;
  readonly headingDeg: number;
  readonly frontLeftSteerDeg: number;
  readonly frontRightSteerDeg: number;
  readonly wheelRollDistance: number;
  readonly rearAxleX: number;
  readonly rearAxleY: number;
  readonly isReversing: boolean;
  readonly isBraking: boolean;
  readonly opacity: number;
}

export interface SSweepMetrics {
  readonly alphaRad: number;
  readonly alphaDeg: number;
  readonly deltaX: number;
  readonly totalArcLength: number;
  readonly steerLockDeg: number;
}

export interface SSweepParams {
  readonly startRearX: number;
  readonly startRearY: number;
  readonly dirY: TravelDirection;
  readonly turnRadius: number;
  readonly deltaYAbs: number;
  readonly carScale: number;
  readonly dimensions: VehicleDimensions;
  readonly rollBaseWorldPx: number;
  readonly opacity?: number;
  readonly endAtInflection?: boolean;
  readonly straightenAtEnd?: boolean;
}

export interface ShuttlePassDefinition {
  readonly startTime: number;
  readonly endTime: number;
  readonly startRearX: number;
  readonly startRearY: number;
  readonly dirY: TravelDirection;
  readonly turnRadius: number;
  readonly deltaYAbs: number;
  readonly rollBaseWorldPx: number;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

export function easeInOutSine(t: number): number {
  const x = clamp01(t);
  return -(Math.cos(Math.PI * x) - 1) * 0.5;
}

export function progressBetween(seconds: number, start: number, end: number): number {
  if (end <= start) {
    return seconds >= end ? 1 : 0;
  }
  return clamp01((seconds - start) / (end - start));
}

export function pulseEnvelope(seconds: number, start: number, peakStart: number, peakEnd: number, end: number): number {
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

export function pulseFactor(seconds: number, centerTime: number, halfWidth: number = 0.55): number {
  const dist = Math.abs(seconds - centerTime);
  if (dist >= halfWidth) {
    return 0;
  }
  return Math.cos((dist / halfWidth) * (Math.PI * 0.5));
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function localPointToWorld(
  centerX: number,
  centerY: number,
  headingDeg: number,
  localX: number,
  localY: number,
  scale: number,
): Point2D {
  const hRad = degToRad(headingDeg);
  const cosH = Math.cos(hRad);
  const sinH = Math.sin(hRad);
  const sx = localX * scale;
  const sy = localY * scale;
  return {
    x: centerX + sx * cosH - sy * sinH,
    y: centerY + sx * sinH + sy * cosH,
  };
}

export function buildArcPath(center: Point2D, radius: number, startDeg: number, endDeg: number): string {
  const sRad = degToRad(startDeg);
  const eRad = degToRad(endDeg);
  const sx = center.x + radius * Math.cos(sRad);
  const sy = center.y + radius * Math.sin(sRad);
  const ex = center.x + radius * Math.cos(eRad);
  const ey = center.y + radius * Math.sin(eRad);
  const delta = endDeg - startDeg;
  const largeArcFlag = Math.abs(delta) > 180 ? 1 : 0;
  const sweepFlag = delta >= 0 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArcFlag} ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

export function computeSSweepMetrics(turnRadius: number, deltaYAbs: number, wheelbase: number): SSweepMetrics {
  const sinAlpha = Math.min(0.999, Math.max(0, (deltaYAbs * 0.5) / turnRadius));
  const alphaRad = Math.asin(sinAlpha);
  const cosAlpha = Math.cos(alphaRad);
  return {
    alphaRad,
    alphaDeg: radToDeg(alphaRad),
    deltaX: 2 * turnRadius * (1 - cosAlpha),
    totalArcLength: 2 * turnRadius * alphaRad,
    steerLockDeg: radToDeg(Math.atan2(wheelbase, turnRadius)),
  };
}

/**
 * Exact non-holonomic Ackermann S-curve pass (moving +X toward a right-side kerb).
 * Includes brief realistic stationary steering transitions at entry, inflection, and exit
 * so front steering angles strictly match circular arc curvature during all motion.
 */
export function sampleRealisticSSweep(uRaw: number, params: SSweepParams): ShortVehiclePose {
  const u = clamp01(uRaw);
  const {
    startRearX,
    startRearY,
    dirY,
    turnRadius,
    deltaYAbs,
    carScale,
    dimensions,
    rollBaseWorldPx,
    opacity = 1,
    endAtInflection = false,
    straightenAtEnd = true,
  } = params;

  const halfWheelbase = dimensions.wheelbase * 0.5;
  const metrics = computeSSweepMetrics(turnRadius, deltaYAbs, dimensions.wheelbase);
  const { alphaRad, deltaX, steerLockDeg } = metrics;

  if (endAtInflection) {
    const pSteer = 0.14;
    const pArcEnd = 0.88;

    let phiRad = 0;
    let steerDeg = 0;
    let isBraking = true;

    if (u <= pSteer) {
      phiRad = 0;
      steerDeg = steerLockDeg * easeInOutCubic(u / pSteer);
      isBraking = true;
    } else if (u < pArcEnd) {
      const arcU = (u - pSteer) / (pArcEnd - pSteer);
      phiRad = alphaRad * easeInOutSine(arcU);
      steerDeg = steerLockDeg;
      isBraking = arcU > 0.82;
    } else {
      phiRad = alphaRad;
      steerDeg = steerLockDeg;
      isBraking = true;
    }

    const rearAxleX = startRearX + turnRadius * (1 - Math.cos(phiRad));
    const rearAxleY = startRearY + dirY * turnRadius * Math.sin(phiRad);
    const headingRad = -dirY * phiRad;
    const centerX = rearAxleX + halfWheelbase * Math.sin(headingRad);
    const centerY = rearAxleY - halfWheelbase * Math.cos(headingRad);
    const ack = computeAckermannAngles(steerDeg, dimensions);
    const rolledWorldPx = rollBaseWorldPx - dirY * turnRadius * phiRad;

    return {
      centerX,
      centerY,
      headingDeg: radToDeg(headingRad),
      frontLeftSteerDeg: ack.frontLeftSteerDeg,
      frontRightSteerDeg: ack.frontRightSteerDeg,
      wheelRollDistance: rolledWorldPx / carScale,
      rearAxleX,
      rearAxleY,
      isReversing: dirY === TravelDirections.Reverse && u > pSteer && u < pArcEnd,
      isBraking,
      opacity,
    };
  }

  const pSteer1 = 0.08;
  const pArc1End = 0.45;
  const pSteer2End = 0.55;
  const pArc2End = straightenAtEnd ? 0.92 : 1.0;

  const endRearX = startRearX + deltaX;
  const endRearY = startRearY + dirY * deltaYAbs;

  let rearAxleX = startRearX;
  let rearAxleY = startRearY;
  let phiRad = 0;
  let steerDeg = 0;
  let rolledDeltaWorldPx = 0;
  let isBraking = false;

  if (u <= pSteer1) {
    phiRad = 0;
    steerDeg = steerLockDeg * easeInOutCubic(u / pSteer1);
    rearAxleX = startRearX;
    rearAxleY = startRearY;
    rolledDeltaWorldPx = 0;
    isBraking = true;
  } else if (u < pArc1End) {
    const arcU = (u - pSteer1) / (pArc1End - pSteer1);
    phiRad = alphaRad * easeInOutSine(arcU);
    steerDeg = steerLockDeg;
    rearAxleX = startRearX + turnRadius * (1 - Math.cos(phiRad));
    rearAxleY = startRearY + dirY * turnRadius * Math.sin(phiRad);
    rolledDeltaWorldPx = -dirY * turnRadius * phiRad;
    isBraking = arcU > 0.84;
  } else if (u <= pSteer2End) {
    const turnU = (u - pArc1End) / (pSteer2End - pArc1End);
    phiRad = alphaRad;
    steerDeg = steerLockDeg * (1 - 2 * easeInOutCubic(turnU));
    rearAxleX = startRearX + turnRadius * (1 - Math.cos(alphaRad));
    rearAxleY = startRearY + dirY * turnRadius * Math.sin(alphaRad);
    rolledDeltaWorldPx = -dirY * turnRadius * alphaRad;
    isBraking = true;
  } else if (u < pArc2End) {
    const arcU = (u - pSteer2End) / (pArc2End - pSteer2End);
    phiRad = alphaRad * (1 - easeInOutSine(arcU));
    steerDeg = -steerLockDeg;
    rearAxleX = endRearX - turnRadius * (1 - Math.cos(phiRad));
    rearAxleY = endRearY - dirY * turnRadius * Math.sin(phiRad);
    rolledDeltaWorldPx = -dirY * turnRadius * (2 * alphaRad - phiRad);
    isBraking = arcU > 0.84;
  } else {
    const exitU = straightenAtEnd ? (u - pArc2End) / (1 - pArc2End) : 0;
    phiRad = 0;
    steerDeg = straightenAtEnd ? -steerLockDeg * (1 - easeInOutCubic(exitU)) : -steerLockDeg;
    rearAxleX = endRearX;
    rearAxleY = endRearY;
    rolledDeltaWorldPx = -dirY * 2 * turnRadius * alphaRad;
    isBraking = true;
  }

  const headingRad = -dirY * phiRad;
  const centerX = rearAxleX + halfWheelbase * Math.sin(headingRad);
  const centerY = rearAxleY - halfWheelbase * Math.cos(headingRad);
  const ack = computeAckermannAngles(steerDeg, dimensions);

  return {
    centerX,
    centerY,
    headingDeg: radToDeg(headingRad),
    frontLeftSteerDeg: ack.frontLeftSteerDeg,
    frontRightSteerDeg: ack.frontRightSteerDeg,
    wheelRollDistance: (rollBaseWorldPx + rolledDeltaWorldPx) / carScale,
    rearAxleX,
    rearAxleY,
    isReversing: dirY === TravelDirections.Reverse && u > pSteer1 && u < pArc2End,
    isBraking,
    opacity,
  };
}

export function sampleStraightSegment(
  uRaw: number,
  rearAxleX: number,
  startRearY: number,
  endRearY: number,
  carScale: number,
  dimensions: VehicleDimensions,
  rollBaseWorldPx: number,
  opacity: number = 1,
): ShortVehiclePose {
  const u = clamp01(uRaw);
  const eased = easeInOutCubic(u);
  const rearAxleY = startRearY + (endRearY - startRearY) * eased;
  const halfWheelbase = dimensions.wheelbase * 0.5;
  const deltaY = rearAxleY - startRearY;
  const isReversing = endRearY > startRearY && u > 0.01 && u < 0.99;

  return {
    centerX: rearAxleX,
    centerY: rearAxleY - halfWheelbase,
    headingDeg: 0,
    frontLeftSteerDeg: 0,
    frontRightSteerDeg: 0,
    wheelRollDistance: (rollBaseWorldPx - deltaY) / carScale,
    rearAxleX,
    rearAxleY,
    isReversing,
    isBraking: u <= 0.01 || u >= 0.78,
    opacity,
  };
}

export function sampleShuttlePassSequence(
  seconds: number,
  passes: readonly ShuttlePassDefinition[],
  carScale: number,
  dimensions: VehicleDimensions,
  opacity: number,
): ShortVehiclePose {
  const firstPass = passes[0];
  if (!firstPass) {
    return sampleStraightSegment(0, 0, 0, 0, carScale, dimensions, 0, opacity);
  }

  for (let i = 0; i < passes.length; i++) {
    const pass = passes[i];
    if (!pass) {
      continue;
    }
    if (seconds <= pass.endTime) {
      const u = progressBetween(seconds, pass.startTime, pass.endTime);
      return sampleRealisticSSweep(u, {
        startRearX: pass.startRearX,
        startRearY: pass.startRearY,
        dirY: pass.dirY,
        turnRadius: pass.turnRadius,
        deltaYAbs: pass.deltaYAbs,
        carScale,
        dimensions,
        rollBaseWorldPx: pass.rollBaseWorldPx,
        opacity,
      });
    }
    const nextPass = passes[i + 1];
    if (nextPass && seconds < nextPass.startTime) {
      return sampleRealisticSSweep(1, {
        startRearX: pass.startRearX,
        startRearY: pass.startRearY,
        dirY: pass.dirY,
        turnRadius: pass.turnRadius,
        deltaYAbs: pass.deltaYAbs,
        carScale,
        dimensions,
        rollBaseWorldPx: pass.rollBaseWorldPx,
        opacity,
      });
    }
  }

  const lastPass = passes[passes.length - 1] ?? firstPass;
  return sampleRealisticSSweep(1, {
    startRearX: lastPass.startRearX,
    startRearY: lastPass.startRearY,
    dirY: lastPass.dirY,
    turnRadius: lastPass.turnRadius,
    deltaYAbs: lastPass.deltaYAbs,
    carScale,
    dimensions,
    rollBaseWorldPx: lastPass.rollBaseWorldPx,
    opacity,
  });
}

export function buildShuttleMidpointTrail(
  startTime: number,
  currentTime: number,
  passes: readonly ShuttlePassDefinition[],
  carScale: number,
  dimensions: VehicleDimensions,
): string {
  if (currentTime < startTime) {
    return "";
  }
  const points: string[] = [];
  for (let t = startTime; t <= currentTime; t += 0.05) {
    const pose = sampleShuttlePassSequence(t, passes, carScale, dimensions, 1);
    points.push(`${pose.rearAxleX.toFixed(1)},${pose.rearAxleY.toFixed(1)}`);
  }
  const endPose = sampleShuttlePassSequence(currentTime, passes, carScale, dimensions, 1);
  points.push(`${endPose.rearAxleX.toFixed(1)},${endPose.rearAxleY.toFixed(1)}`);
  return points.join(" ");
}
