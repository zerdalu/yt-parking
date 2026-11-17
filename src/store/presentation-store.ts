import * as v from "valibot";
import { create } from "zustand";

export const SlidePhaseModes = {
  Auto: "auto",
  Gap: "gap",
  Shuffle: "shuffle",
  Sweep: "sweep",
} as const;

export type SlidePhaseMode = (typeof SlidePhaseModes)[keyof typeof SlidePhaseModes];

export interface SlideMetadata {
  readonly index: number;
  readonly numberLabel: string;
  readonly title: string;
  readonly subtitle: string;
  readonly durationSeconds: number;
  readonly cumulativeStart: string;
  readonly cumulativeEnd: string;
}

export const SLIDES_METADATA: readonly SlideMetadata[] = [
  {
    index: 0,
    numberLabel: "01",
    title: "The Parallel Parking Dilemma",
    subtitle: "Multi-point shuffling vs. the single-sweep geometric ideal",
    durationSeconds: 35,
    cumulativeStart: "00:00",
    cumulativeEnd: "00:35",
  },
  {
    index: 1,
    numberLabel: "02",
    title: "Defining Perfect Parking",
    subtitle: "Single continuous full-lock reverse arc & straight forward pull-up",
    durationSeconds: 34,
    cumulativeStart: "00:35",
    cumulativeEnd: "01:09",
  },
  {
    index: 2,
    numberLabel: "03",
    title: "Slicing the Car: The Wheel-Center Plane",
    subtitle: "Horizontal wheel-center cross-section, rectangle ABCD & kerb line AEFD",
    durationSeconds: 38,
    cumulativeStart: "01:09",
    cumulativeEnd: "01:47",
  },
  {
    index: 3,
    numberLabel: "04",
    title: "Ackermann Steering & The Turning Center X",
    subtitle: "Fixed rear axle normal, sharper inside front angle & convergence at X",
    durationSeconds: 40,
    cumulativeStart: "01:47",
    cumulativeEnd: "02:27",
  },
  {
    index: 4,
    numberLabel: "05",
    title: "The Four Measurable Inputs",
    subtitle: "Turning radius r, wheelbase l, overhang k, parked width w & target AH",
    durationSeconds: 38,
    cumulativeStart: "02:27",
    cumulativeEnd: "03:05",
  },
  {
    index: 5,
    numberLabel: "06",
    title: "Previewing the Master Formula",
    subtitle: "Nested square roots built from three right-angled triangles",
    durationSeconds: 24,
    cumulativeStart: "03:05",
    cumulativeEnd: "03:29",
  },
  {
    index: 6,
    numberLabel: "07",
    title: "Concentric Turning Circles (Figure 2)",
    subtitle: "Wheels E, F & outer corner A grazing G on equal-radius arcs around X",
    durationSeconds: 34,
    cumulativeStart: "03:29",
    cumulativeEnd: "04:03",
  },
  {
    index: 7,
    numberLabel: "08",
    title: "Proof Step 1: The Wheelbase Triangle EFX",
    subtitle: "Right angle at F resolving horizontal leg |FX| = sqrt(r^2 - l^2)",
    durationSeconds: 31,
    cumulativeStart: "04:03",
    cumulativeEnd: "04:34",
  },
  {
    index: 8,
    numberLabel: "09",
    title: "Proof Steps 2 & 3: Front Corner Radius AX and GX",
    subtitle: "Triangle AFX hypotenuse |AX| matching outer-circle radius |GX|",
    durationSeconds: 32,
    cumulativeStart: "04:34",
    cumulativeEnd: "05:06",
  },
  {
    index: 9,
    numberLabel: "10",
    title: "Proof Steps 4 & 5: Dropping Construction Line GK",
    subtitle: "Figure 3 projection locating K with |KX| = sqrt(r^2 - l^2) - w",
    durationSeconds: 32,
    cumulativeStart: "05:06",
    cumulativeEnd: "05:38",
  },
  {
    index: 10,
    numberLabel: "11",
    title: "Proof Steps 6 & 7: Solving Triangle GKX for AH",
    subtitle: "Pythagoras on GKX resolving height |GK|, subtracting l + k to leave |AH|",
    durationSeconds: 37,
    cumulativeStart: "05:38",
    cumulativeEnd: "06:15",
  },
  {
    index: 11,
    numberLabel: "12",
    title: "Plugging in Real-World Numbers",
    subtitle: "Evaluating r = 5.4 m, l = 2.6 m, k = 1.3 m, w = 1.7 m to yield 1.43 m",
    durationSeconds: 33,
    cumulativeStart: "06:15",
    cumulativeEnd: "06:48",
  },
  {
    index: 12,
    numberLabel: "13",
    title: "The Paradox: Why Doesn't Your Car's Width Matter?",
    subtitle: "Width expansion along edge BC leaves corner A's outer circle past G unchanged",
    durationSeconds: 36,
    cumulativeStart: "06:48",
    cumulativeEnd: "07:24",
  },
  {
    index: 13,
    numberLabel: "14",
    title: "Angled Approach & Late Full-Lock",
    subtitle: "Straight angled reverse snapping to full lock as A passes G on the turning circle",
    durationSeconds: 31,
    cumulativeStart: "07:24",
    cumulativeEnd: "07:55",
  },
  {
    index: 14,
    numberLabel: "15",
    title: "Shuttling To and Fro in Tight Spaces (Figure 4)",
    subtitle: "Figure 4 rear-axle midpoint S-curves stepping inward by 2|PA| inside tight gap c",
    durationSeconds: 33,
    cumulativeStart: "07:55",
    cumulativeEnd: "08:28",
  },
  {
    index: 15,
    numberLabel: "16",
    title: "Nose-First Bay Parking & The Tractrix (Figures 5 & 6)",
    subtitle: "Front corner B gliding along line EF while rear corner C traces an orthogonal tractrix",
    durationSeconds: 18,
    cumulativeStart: "08:28",
    cumulativeEnd: "08:46",
  },
];

const LAST_SLIDE_STORAGE_KEY = "parking:last-slide-index";

const StoredSlideIndexSchema = v.pipe(v.number(), v.integer(), v.minValue(0));

function readInitialSlideIndex(): number {
  if (typeof window === "undefined") {
    return 0;
  }
  try {
    const rawValue: string | null = window.localStorage.getItem(LAST_SLIDE_STORAGE_KEY);
    if (rawValue === null) {
      return 0;
    }
    const parsedJson: unknown = JSON.parse(rawValue);
    const result = v.safeParse(StoredSlideIndexSchema, parsedJson);
    if (!result.success) {
      return 0;
    }
    return Math.max(0, Math.min(result.output, SLIDES_METADATA.length - 1));
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn("Failed to read last slide index from localStorage:", error.message);
    }
    return 0;
  }
}

function saveLastSlideIndex(index: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(LAST_SLIDE_STORAGE_KEY, JSON.stringify(index));
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn("Failed to save last slide index to localStorage:", error.message);
    }
  }
}

export interface PresentationState {
  readonly currentSlideIndex: number;
  readonly isPlaying: boolean;
  readonly elapsedSeconds: number;
  readonly replayGeneration: number;
  readonly isHudVisible: boolean;
  readonly phaseMode: SlidePhaseMode;
  readonly setSlideIndex: (index: number) => void;
  readonly togglePlay: () => void;
  readonly setPlaying: (playing: boolean) => void;
  readonly tickElapsed: (deltaSeconds: number) => void;
  readonly seekTo: (seconds: number) => void;
  readonly restartSlide: () => void;
  readonly toggleHud: () => void;
  readonly setPhaseMode: (mode: SlidePhaseMode) => void;
}

export const usePresentationStore = create<PresentationState>((set) => ({
  currentSlideIndex: readInitialSlideIndex(),
  isPlaying: true,
  elapsedSeconds: 0,
  replayGeneration: 0,
  isHudVisible: true,
  phaseMode: SlidePhaseModes.Auto,

  setSlideIndex: (index: number): void => {
    const safeIndex = Math.max(0, Math.min(index, SLIDES_METADATA.length - 1));
    saveLastSlideIndex(safeIndex);
    set((state) => ({
      currentSlideIndex: safeIndex,
      elapsedSeconds: 0,
      isPlaying: true,
      phaseMode: SlidePhaseModes.Auto,
      replayGeneration: state.replayGeneration + 1,
    }));
  },

  togglePlay: (): void => {
    set((state) => {
      const currentMeta = SLIDES_METADATA[state.currentSlideIndex] ?? SLIDES_METADATA[0];
      if (!state.isPlaying && currentMeta && state.elapsedSeconds >= currentMeta.durationSeconds) {
        return {
          isPlaying: true,
          elapsedSeconds: 0,
          phaseMode: SlidePhaseModes.Auto,
          replayGeneration: state.replayGeneration + 1,
        };
      }
      return { isPlaying: !state.isPlaying };
    });
  },

  setPlaying: (playing: boolean): void => {
    set({ isPlaying: playing });
  },

  tickElapsed: (deltaSeconds: number): void => {
    set((state) => {
      if (!state.isPlaying || state.phaseMode !== SlidePhaseModes.Auto) {
        return state;
      }
      const currentMeta = SLIDES_METADATA[state.currentSlideIndex] ?? SLIDES_METADATA[0];
      const maxDuration = currentMeta ? currentMeta.durationSeconds : 35;
      const nextElapsed = state.elapsedSeconds + deltaSeconds;
      if (nextElapsed >= maxDuration) {
        return {
          elapsedSeconds: maxDuration,
          isPlaying: false,
        };
      }
      return {
        elapsedSeconds: nextElapsed,
      };
    });
  },

  seekTo: (seconds: number): void => {
    set((state) => {
      const currentMeta = SLIDES_METADATA[state.currentSlideIndex] ?? SLIDES_METADATA[0];
      const maxDuration = currentMeta ? currentMeta.durationSeconds : 35;
      const clamped = Math.max(0, Math.min(seconds, maxDuration));
      return {
        elapsedSeconds: clamped,
        phaseMode: SlidePhaseModes.Auto,
      };
    });
  },

  restartSlide: (): void => {
    set((state) => ({
      elapsedSeconds: 0,
      isPlaying: true,
      phaseMode: SlidePhaseModes.Auto,
      replayGeneration: state.replayGeneration + 1,
    }));
  },

  toggleHud: (): void => {
    set((state) => ({ isHudVisible: !state.isHudVisible }));
  },

  setPhaseMode: (mode: SlidePhaseMode): void => {
    set((state) => {
      if (mode === SlidePhaseModes.Auto) {
        return {
          phaseMode: SlidePhaseModes.Auto,
          elapsedSeconds: 0,
          isPlaying: true,
          replayGeneration: state.replayGeneration + 1,
        };
      }
      const phaseTimestamp = mode === SlidePhaseModes.Gap ? 5 : mode === SlidePhaseModes.Shuffle ? 16 : 29;
      return {
        phaseMode: mode,
        elapsedSeconds: phaseTimestamp,
        isPlaying: true,
      };
    });
  },
}));
