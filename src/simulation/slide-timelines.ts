import type { DriverControlSegment, Point2D } from "@/simulation/car-simulator";

export const SLIDE_01_INITIAL_POSE = {
  rearAxleX: 524,
  rearAxleY: 505,
  headingDeg: 0,
  steerDeg: 0,
} as const;

export const SLIDE_01_DRIVER_SEGMENTS: readonly DriverControlSegment[] = [
  // Phase 1 (0s - 10.5s): Drive UP in right-hand lane and stop parallel to the front parked car
  { startTime: 0.0, endTime: 4.5, targetSteerDeg: 0, targetSpeed: 80 },
  { startTime: 4.5, endTime: 10.5, targetSteerDeg: 0, targetSpeed: 0 },

  // Shuffle Cycle 1 (10.5s - 16.7s): Initial reverse entry ends up too shallow and far from kerb
  { startTime: 10.5, endTime: 11.0, targetSteerDeg: 28, targetSpeed: 0 },
  { startTime: 11.0, endTime: 13.0, targetSteerDeg: 28, targetSpeed: -62 },
  { startTime: 13.0, endTime: 13.6, targetSteerDeg: 28, targetSpeed: 0 },
  { startTime: 13.6, endTime: 14.3, targetSteerDeg: -32, targetSpeed: 0 },
  { startTime: 14.3, endTime: 16.1, targetSteerDeg: -32, targetSpeed: -64 },
  { startTime: 16.1, endTime: 16.7, targetSteerDeg: -32, targetSpeed: 0 },

  // Shuffle Cycle 2 (16.7s - 24.0s): Pull forward and reverse back to inch slightly closer
  { startTime: 16.7, endTime: 17.3, targetSteerDeg: 26, targetSpeed: 0 },
  { startTime: 17.3, endTime: 18.0, targetSteerDeg: 26, targetSpeed: 32 },
  { startTime: 18.0, endTime: 18.5, targetSteerDeg: 26, targetSpeed: 0 },
  { startTime: 18.5, endTime: 19.1, targetSteerDeg: -28, targetSpeed: 0 },
  { startTime: 19.1, endTime: 19.8, targetSteerDeg: -28, targetSpeed: 30 },
  { startTime: 19.8, endTime: 20.4, targetSteerDeg: 28, targetSpeed: 0 },
  { startTime: 20.4, endTime: 21.4, targetSteerDeg: 28, targetSpeed: -32 },
  { startTime: 21.4, endTime: 21.9, targetSteerDeg: 28, targetSpeed: 0 },
  { startTime: 21.9, endTime: 22.5, targetSteerDeg: -28, targetSpeed: 0 },
  { startTime: 22.5, endTime: 23.5, targetSteerDeg: -28, targetSpeed: -30 },
  { startTime: 23.5, endTime: 24.0, targetSteerDeg: -28, targetSpeed: 0 },

  // Shuffle Cycle 3 (24.0s - 28.2s): Pull forward again to reclaim space toward the kerb
  { startTime: 24.0, endTime: 24.6, targetSteerDeg: 20, targetSpeed: 0 },
  { startTime: 24.6, endTime: 25.6, targetSteerDeg: 20, targetSpeed: 32 },
  { startTime: 25.6, endTime: 26.1, targetSteerDeg: 20, targetSpeed: 0 },
  { startTime: 26.1, endTime: 26.7, targetSteerDeg: -20, targetSpeed: 0 },
  { startTime: 26.7, endTime: 27.7, targetSteerDeg: -20, targetSpeed: 30 },
  { startTime: 27.7, endTime: 28.2, targetSteerDeg: -20, targetSpeed: 0 },

  // Shuffle Cycle 4 (28.2s - 35.0s): Final tight reverse & forward wiggle, still ending crooked
  { startTime: 28.2, endTime: 28.8, targetSteerDeg: 24, targetSpeed: 0 },
  { startTime: 28.8, endTime: 29.8, targetSteerDeg: 24, targetSpeed: -32 },
  { startTime: 29.8, endTime: 30.3, targetSteerDeg: 24, targetSpeed: 0 },
  { startTime: 30.3, endTime: 30.9, targetSteerDeg: -24, targetSpeed: 0 },
  { startTime: 30.9, endTime: 31.9, targetSteerDeg: -24, targetSpeed: -28 },
  { startTime: 31.9, endTime: 32.4, targetSteerDeg: -24, targetSpeed: 0 },
  { startTime: 32.4, endTime: 33.0, targetSteerDeg: 20, targetSpeed: 0 },
  { startTime: 33.0, endTime: 33.8, targetSteerDeg: 20, targetSpeed: 24 },
  { startTime: 33.8, endTime: 34.3, targetSteerDeg: 20, targetSpeed: 0 },
  { startTime: 34.3, endTime: 40.0, targetSteerDeg: 0, targetSpeed: 0 },
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

const FULL_LOCK_DEG = 32.987;

export const SLIDE_02_DRIVER_SEGMENTS: readonly DriverControlSegment[] = [
  // Intro setup (0s - 9.4s): Pull up in right-hand lane and position at full-lock approach angle (-46 deg)
  { startTime: 0.0, endTime: 3.2, targetSteerDeg: 0, targetSpeed: 82.65625 },
  { startTime: 3.2, endTime: 3.9, targetSteerDeg: 0, targetSpeed: 0 },
  { startTime: 3.9, endTime: 4.4, targetSteerDeg: FULL_LOCK_DEG, targetSpeed: 0 },
  { startTime: 4.4, endTime: 7.8, targetSteerDeg: FULL_LOCK_DEG, targetSpeed: -37.8335 },
  { startTime: 7.8, endTime: 8.4, targetSteerDeg: FULL_LOCK_DEG, targetSpeed: 0 },
  { startTime: 8.4, endTime: 9.4, targetSteerDeg: -FULL_LOCK_DEG, targetSpeed: 0 },

  // Phase 1 (9.4s - 17.8s): Reverse at full left lock in ONE single continuous circular arc around X
  { startTime: 9.4, endTime: 16.4, targetSteerDeg: -FULL_LOCK_DEG, targetSpeed: -18.3763 },
  { startTime: 16.4, endTime: 17.8, targetSteerDeg: -FULL_LOCK_DEG, targetSpeed: 0 },

  // Phase 2 (17.8s - 24.0s): Straighten front wheels and drive straight forward into the center of the bay
  { startTime: 17.8, endTime: 19.1, targetSteerDeg: 0, targetSpeed: 0 },
  { startTime: 19.1, endTime: 22.1, targetSteerDeg: 0, targetSpeed: 9.5 },
  { startTime: 22.1, endTime: 35.0, targetSteerDeg: 0, targetSpeed: 0 },
];
