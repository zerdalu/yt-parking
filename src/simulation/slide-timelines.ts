import type { DriverControlSegment, Point2D } from "@/simulation/car-simulator";

const FULL_LOCK_DEG = 32.987;

export const SLIDE_01_INITIAL_POSE = {
  rearAxleX: 529.16,
  rearAxleY: 505,
  headingDeg: 0,
  steerDeg: 0,
} as const;

export const SLIDE_01_DRIVER_SEGMENTS: readonly DriverControlSegment[] = [
  // Phase 1 (0.0s - 7.8s): Pull up parallel to the front parked car and assess the tight gap
  { startTime: 0.0, endTime: 4.4, targetSteerDeg: 0, targetSpeed: 79.432 },
  { startTime: 4.4, endTime: 7.8, targetSteerDeg: 0, targetSpeed: 0 },

  // Phase 2A (7.8s - 13.25s): Back into the tight space, ending parallel inside the bay but stranded away from the kerb
  { startTime: 7.8, endTime: 10.15, targetSteerDeg: 27.5, targetSpeed: -55.0 },
  { startTime: 10.15, endTime: 12.68, targetSteerDeg: -27.5, targetSpeed: -55.0 },
  { startTime: 12.68, endTime: 13.25, targetSteerDeg: 0, targetSpeed: 0 },

  // Phase 2B (13.25s - 20.08s): 4 back-and-forth shuttling passes inside the bay, inching closer to the kerb each time
  // Shuttle Pass 1 (Forward)
  { startTime: 13.25, endTime: 13.95, targetSteerDeg: 26, targetSpeed: 38 },
  { startTime: 13.95, endTime: 14.77, targetSteerDeg: -26, targetSpeed: 38 },
  { startTime: 14.77, endTime: 14.92, targetSteerDeg: 0, targetSpeed: 0 },
  // Shuttle Pass 2 (Reverse)
  { startTime: 14.92, endTime: 15.62, targetSteerDeg: 26, targetSpeed: -38 },
  { startTime: 15.62, endTime: 16.44, targetSteerDeg: -26, targetSpeed: -38 },
  { startTime: 16.44, endTime: 16.59, targetSteerDeg: 0, targetSpeed: 0 },
  // Shuttle Pass 3 (Forward)
  { startTime: 16.59, endTime: 17.29, targetSteerDeg: 26, targetSpeed: 36 },
  { startTime: 17.29, endTime: 18.11, targetSteerDeg: -26, targetSpeed: 36 },
  { startTime: 18.11, endTime: 18.26, targetSteerDeg: 0, targetSpeed: 0 },
  // Shuttle Pass 4 (Reverse)
  { startTime: 18.26, endTime: 18.96, targetSteerDeg: 26, targetSpeed: -36 },
  { startTime: 18.96, endTime: 19.78, targetSteerDeg: -26, targetSpeed: -36 },
  { startTime: 19.78, endTime: 20.08, targetSteerDeg: 0, targetSpeed: 0 },

  // Phase 3 (20.08s - 26.25s): Fade reset to parallel lane & execute ONE continuous uninterrupted reverse sweep + straight pull-up
  {
    startTime: 20.08,
    endTime: 20.35,
    targetSteerDeg: 0,
    targetSpeed: 0,
    resetPose: {
      rearAxleX: 526.52,
      rearAxleY: 151.46,
      headingDeg: 0,
      steerDeg: 0,
    },
  },
  { startTime: 20.35, endTime: 22.0, targetSteerDeg: FULL_LOCK_DEG, targetSpeed: -74.5 },
  { startTime: 22.0, endTime: 23.99, targetSteerDeg: -FULL_LOCK_DEG, targetSpeed: -74.5 },
  { startTime: 23.99, endTime: 24.5, targetSteerDeg: 0, targetSpeed: 0 },
  { startTime: 24.5, endTime: 25.9, targetSteerDeg: 0, targetSpeed: 20.357 },
  { startTime: 25.9, endTime: 36.0, targetSteerDeg: 0, targetSpeed: 0 },
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
  // Intro setup (0.0s - 8.2s): Pull up in right-hand lane & stage at -46 deg approach angle during opening sentence
  { startTime: 0.0, endTime: 3.4, targetSteerDeg: 0, targetSpeed: 77.794 },
  { startTime: 3.4, endTime: 3.7, targetSteerDeg: 0, targetSpeed: 0 },
  { startTime: 3.7, endTime: 4.0, targetSteerDeg: FULL_LOCK_DEG, targetSpeed: 0 },
  { startTime: 4.0, endTime: 7.5, targetSteerDeg: FULL_LOCK_DEG, targetSpeed: -36.7526 },
  { startTime: 7.5, endTime: 8.1, targetSteerDeg: FULL_LOCK_DEG, targetSpeed: 0 },
  { startTime: 8.1, endTime: 12.4, targetSteerDeg: -FULL_LOCK_DEG, targetSpeed: 0 },

  // Phase 1 (12.4s - 21.8s): Reverse at full left lock in ONE continuous circular arc around X, stopping parallel at ~20.0s
  { startTime: 12.4, endTime: 19.4, targetSteerDeg: -FULL_LOCK_DEG, targetSpeed: -18.3763 },
  { startTime: 19.4, endTime: 21.8, targetSteerDeg: -FULL_LOCK_DEG, targetSpeed: 0 },

  // Phase 2 (21.8s - 26.2s): Straighten front wheels (21.8s-23.2s) and drive straight forward (23.2s-26.2s)
  { startTime: 21.8, endTime: 23.2, targetSteerDeg: 0, targetSpeed: 0 },
  { startTime: 23.2, endTime: 26.2, targetSteerDeg: 0, targetSpeed: 9.5 },
  { startTime: 26.2, endTime: 35.0, targetSteerDeg: 0, targetSpeed: 0 },
];
