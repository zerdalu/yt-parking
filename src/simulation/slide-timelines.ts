import type { DriverControlSegment, Point2D } from "@/simulation/car-simulator";

const FULL_LOCK_DEG = 32.987;

export const SLIDE_01_INITIAL_POSE = {
  rearAxleX: 524,
  rearAxleY: 505,
  headingDeg: 0,
  steerDeg: 0,
} as const;

export const SLIDE_01_DRIVER_SEGMENTS: readonly DriverControlSegment[] = [
  // Phase 1 (0s - 10.6s): Pull up parallel to the front parked car and assess the gap
  { startTime: 0.0, endTime: 4.5, targetSteerDeg: 0, targetSpeed: 80 },
  { startTime: 4.5, endTime: 10.6, targetSteerDeg: 0, targetSpeed: 0 },

  // Phase 2 (10.6s - 19.8s): Multi-point shuffling back and forth into the tight space
  { startTime: 10.6, endTime: 11.1, targetSteerDeg: 28, targetSpeed: 0 },
  { startTime: 11.1, endTime: 12.8, targetSteerDeg: 28, targetSpeed: -72 },
  { startTime: 12.8, endTime: 13.3, targetSteerDeg: 28, targetSpeed: 0 },
  { startTime: 13.3, endTime: 13.9, targetSteerDeg: -32, targetSpeed: 0 },
  { startTime: 13.9, endTime: 15.3, targetSteerDeg: -32, targetSpeed: -74 },
  { startTime: 15.3, endTime: 15.9, targetSteerDeg: 26, targetSpeed: 0 },
  { startTime: 15.9, endTime: 16.9, targetSteerDeg: 26, targetSpeed: 34 },
  { startTime: 16.9, endTime: 17.5, targetSteerDeg: -26, targetSpeed: 0 },
  { startTime: 17.5, endTime: 18.6, targetSteerDeg: -26, targetSpeed: -34 },
  { startTime: 18.6, endTime: 19.0, targetSteerDeg: 20, targetSpeed: 0 },
  { startTime: 19.0, endTime: 19.7, targetSteerDeg: 20, targetSpeed: 24 },
  { startTime: 19.7, endTime: 20.08, targetSteerDeg: 20, targetSpeed: 0 },

  // Phase 3 (20.08s - 26.25s): Fade reset to parallel lane & execute single smooth full-lock S-sweep + forward pull-up
  {
    startTime: 20.08,
    endTime: 20.45,
    targetSteerDeg: FULL_LOCK_DEG,
    targetSpeed: 0,
    resetPose: {
      rearAxleX: 529.16,
      rearAxleY: 155.5,
      headingDeg: 0,
      steerDeg: FULL_LOCK_DEG,
    },
  },
  { startTime: 20.45, endTime: 21.95, targetSteerDeg: FULL_LOCK_DEG, targetSpeed: -85.756 },
  { startTime: 21.95, endTime: 22.7, targetSteerDeg: -FULL_LOCK_DEG, targetSpeed: 0 },
  { startTime: 22.7, endTime: 24.4, targetSteerDeg: -FULL_LOCK_DEG, targetSpeed: -75.667 },
  { startTime: 24.4, endTime: 24.95, targetSteerDeg: 0, targetSpeed: 0 },
  { startTime: 24.95, endTime: 26.25, targetSteerDeg: 0, targetSpeed: 21.923 },
  { startTime: 26.25, endTime: 36.0, targetSteerDeg: 0, targetSpeed: 0 },
];

export const SLIDE_02_INITIAL_POSE = {
  rearAxleX: 529.16,
  rearAxleY: 420.0,
  headingDeg: 0,
  steerDeg: 0,
} as const;

export const SLIDE_02_TURNING_CENTER: Point2D = {
  x: 466.78,
  y: 386,
};

export const SLIDE_02_DRIVER_SEGMENTS: readonly DriverControlSegment[] = [
  // Intro setup (0s - 12.4s): Pull up in right-hand lane & stage at -46 deg approach angle
  { startTime: 0.0, endTime: 3.6, targetSteerDeg: 0, targetSpeed: 73.472 },
  { startTime: 3.6, endTime: 4.3, targetSteerDeg: 0, targetSpeed: 0 },
  { startTime: 4.3, endTime: 4.9, targetSteerDeg: FULL_LOCK_DEG, targetSpeed: 0 },
  { startTime: 4.9, endTime: 9.9, targetSteerDeg: FULL_LOCK_DEG, targetSpeed: -25.7268 },
  { startTime: 9.9, endTime: 10.6, targetSteerDeg: FULL_LOCK_DEG, targetSpeed: 0 },
  { startTime: 10.6, endTime: 12.4, targetSteerDeg: -FULL_LOCK_DEG, targetSpeed: 0 },

  // Phase 1 (12.4s - 21.8s): Reverse at full left lock in ONE continuous circular arc around X
  { startTime: 12.4, endTime: 19.4, targetSteerDeg: -FULL_LOCK_DEG, targetSpeed: -18.3763 },
  { startTime: 19.4, endTime: 21.8, targetSteerDeg: -FULL_LOCK_DEG, targetSpeed: 0 },

  // Phase 2 (21.8s - 26.4s): Straighten front wheels (21.8s-23.4s) and drive straight forward (23.4s-26.4s)
  { startTime: 21.8, endTime: 23.4, targetSteerDeg: 0, targetSpeed: 0 },
  { startTime: 23.4, endTime: 26.4, targetSteerDeg: 0, targetSpeed: 9.5 },
  { startTime: 26.4, endTime: 35.0, targetSteerDeg: 0, targetSpeed: 0 },
];
