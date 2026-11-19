import * as v from "valibot";
import { create } from "zustand";

export const SlidePhaseModes = {
  Auto: "auto",
  Gap: "gap",
  Shuffle: "shuffle",
  Sweep: "sweep",
} as const;

export type SlidePhaseMode = (typeof SlidePhaseModes)[keyof typeof SlidePhaseModes];

export const SlideKinds = {
  Slide: "slide",
  Short: "short",
  Thumbnail: "thumbnail",
} as const;

export type SlideKind = (typeof SlideKinds)[keyof typeof SlideKinds];

export const TransitionKinds = {
  Idle: "idle",
  Exiting: "exiting",
} as const;

export type SlideTransition =
  | { readonly kind: typeof TransitionKinds.Idle }
  | {
      readonly kind: typeof TransitionKinds.Exiting;
      readonly targetSlideIndex: number;
      readonly autoPlayAfter: boolean;
    };

export type ShortId = "short-01" | "short-02" | "short-03";

export interface StandardSlideMetadata {
  readonly kind: typeof SlideKinds.Slide;
  readonly id: string;
  readonly index: number;
  readonly numberLabel: string;
  readonly title: string;
  readonly subtitle: string;
  readonly durationSeconds: number;
  readonly cumulativeStart: string;
  readonly cumulativeEnd: string;
  readonly audioSrc: string;
}

export interface ShortSlideMetadata {
  readonly kind: typeof SlideKinds.Short;
  readonly id: ShortId;
  readonly index: number;
  readonly numberLabel: string;
  readonly title: string;
  readonly subtitle: string;
  readonly durationSeconds: number;
  readonly audioSrc: string;
}

export interface ThumbnailSlideMetadata {
  readonly kind: typeof SlideKinds.Thumbnail;
  readonly id: "thumbnail";
  readonly index: number;
  readonly numberLabel: string;
  readonly title: string;
  readonly subtitle: string;
  readonly durationSeconds: 0;
  readonly audioSrc: null;
}

export type SlideMetadata = StandardSlideMetadata | ShortSlideMetadata | ThumbnailSlideMetadata;

export const PRESENTATION_SLIDE_COUNT = 16;
export const THUMBNAIL_SLIDE_INDEX = 16;
export const FIRST_SHORT_INDEX = 17;

export const SLIDES_METADATA: readonly SlideMetadata[] = [
  {
    kind: SlideKinds.Slide,
    id: "slide-01",
    index: 0,
    numberLabel: "01",
    title: "The Parallel Parking Dilemma",
    subtitle: "Multi-point shuffling vs. the single-sweep geometric ideal",
    durationSeconds: 35,
    cumulativeStart: "00:00",
    cumulativeEnd: "00:35",
    audioSrc: "/vo-slide-01.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-02",
    index: 1,
    numberLabel: "02",
    title: "Defining Perfect Parking",
    subtitle: "Single continuous full-lock reverse arc & straight forward pull-up",
    durationSeconds: 34,
    cumulativeStart: "00:35",
    cumulativeEnd: "01:09",
    audioSrc: "/vo-slide-02.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-03",
    index: 2,
    numberLabel: "03",
    title: "Slicing the Car: The Wheel-Center Plane",
    subtitle: "Horizontal wheel-center cross-section, rectangle ABCD & kerb line AEFD",
    durationSeconds: 38,
    cumulativeStart: "01:09",
    cumulativeEnd: "01:47",
    audioSrc: "/vo-slide-03.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-04",
    index: 3,
    numberLabel: "04",
    title: "Ackermann Steering & The Turning Center X",
    subtitle: "Fixed rear axle normal, sharper inside front angle & convergence at X",
    durationSeconds: 40,
    cumulativeStart: "01:47",
    cumulativeEnd: "02:27",
    audioSrc: "/vo-slide-04.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-05",
    index: 4,
    numberLabel: "05",
    title: "The Four Measurable Inputs",
    subtitle: "Turning radius r, wheelbase l, overhang k, parked width w & target AH",
    durationSeconds: 38,
    cumulativeStart: "02:27",
    cumulativeEnd: "03:05",
    audioSrc: "/vo-slide-05.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-06",
    index: 5,
    numberLabel: "06",
    title: "Previewing the Master Formula",
    subtitle: "Nested square roots built from three right-angled triangles",
    durationSeconds: 24,
    cumulativeStart: "03:05",
    cumulativeEnd: "03:29",
    audioSrc: "/vo-slide-06.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-07",
    index: 6,
    numberLabel: "07",
    title: "Concentric Turning Circles (Figure 2)",
    subtitle: "Wheels E, F & outer corner A grazing G on equal-radius arcs around X",
    durationSeconds: 34,
    cumulativeStart: "03:29",
    cumulativeEnd: "04:03",
    audioSrc: "/vo-slide-07.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-08",
    index: 7,
    numberLabel: "08",
    title: "Proof Step 1: The Wheelbase Triangle EFX",
    subtitle: "Right angle at F resolving horizontal leg |FX| = sqrt(r^2 - l^2)",
    durationSeconds: 31,
    cumulativeStart: "04:03",
    cumulativeEnd: "04:34",
    audioSrc: "/vo-slide-08.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-09",
    index: 8,
    numberLabel: "09",
    title: "Proof Steps 2 & 3: Front Corner Radius AX and GX",
    subtitle: "Triangle AFX hypotenuse |AX| matching outer-circle radius |GX|",
    durationSeconds: 32,
    cumulativeStart: "04:34",
    cumulativeEnd: "05:06",
    audioSrc: "/vo-slide-09.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-10",
    index: 9,
    numberLabel: "10",
    title: "Proof Steps 4 & 5: Dropping Construction Line GK",
    subtitle: "Figure 3 projection locating K with |KX| = sqrt(r^2 - l^2) - w",
    durationSeconds: 32,
    cumulativeStart: "05:06",
    cumulativeEnd: "05:38",
    audioSrc: "/vo-slide-10.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-11",
    index: 10,
    numberLabel: "11",
    title: "Proof Steps 6 & 7: Solving Triangle GKX for AH",
    subtitle: "Pythagoras on GKX resolving height |GK|, subtracting l + k to leave |AH|",
    durationSeconds: 37,
    cumulativeStart: "05:38",
    cumulativeEnd: "06:15",
    audioSrc: "/vo-slide-11.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-12",
    index: 11,
    numberLabel: "12",
    title: "Plugging in Real-World Numbers",
    subtitle: "Evaluating r = 5.4 m, l = 2.6 m, k = 1.3 m, w = 1.7 m to yield 1.43 m",
    durationSeconds: 33,
    cumulativeStart: "06:15",
    cumulativeEnd: "06:48",
    audioSrc: "/vo-slide-12.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-13",
    index: 12,
    numberLabel: "13",
    title: "The Paradox: Why Doesn't Your Car's Width Matter?",
    subtitle: "Width expansion along edge BC leaves corner A's outer circle past G unchanged",
    durationSeconds: 36,
    cumulativeStart: "06:48",
    cumulativeEnd: "07:24",
    audioSrc: "/vo-slide-13.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-14",
    index: 13,
    numberLabel: "14",
    title: "Angled Approach & Late Full-Lock",
    subtitle: "Straight angled reverse snapping to full lock as A passes G on the turning circle",
    durationSeconds: 31,
    cumulativeStart: "07:24",
    cumulativeEnd: "07:55",
    audioSrc: "/vo-slide-14.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-15",
    index: 14,
    numberLabel: "15",
    title: "Shuttling To and Fro in Tight Spaces (Figure 4)",
    subtitle: "Figure 4 rear-axle midpoint S-curves stepping inward by 2|PA| inside tight gap c",
    durationSeconds: 33,
    cumulativeStart: "07:55",
    cumulativeEnd: "08:28",
    audioSrc: "/vo-slide-15.mp3",
  },
  {
    kind: SlideKinds.Slide,
    id: "slide-16",
    index: 15,
    numberLabel: "16",
    title: "Nose-First Bay Parking & The Tractrix (Figures 5 & 6)",
    subtitle: "Front corner B gliding along line EF while rear corner C traces an orthogonal tractrix",
    durationSeconds: 18,
    cumulativeStart: "08:28",
    cumulativeEnd: "08:46",
    audioSrc: "/vo-slide-16.mp3",
  },
  {
    kind: SlideKinds.Thumbnail,
    id: "thumbnail",
    index: 16,
    numberLabel: "TH",
    title: "YouTube Thumbnail",
    subtitle: "Static 16:9 thumbnail composition for full-screen capture",
    durationSeconds: 0,
    audioSrc: null,
  },
  {
    kind: SlideKinds.Short,
    id: "short-01",
    index: 17,
    numberLabel: "S1",
    title: "How Much Extra Space?",
    subtitle: "Portrait Short: 1.43 m minimum space for a single smooth sweep",
    durationSeconds: 42.5,
    audioSrc: "/vo-short-01.mp3",
  },
  {
    kind: SlideKinds.Short,
    id: "short-02",
    index: 18,
    numberLabel: "S2",
    title: "Why Car Width Doesn't Matter",
    subtitle: "Portrait Short: morphing edge B-C leaves corner A's path past G unchanged",
    durationSeconds: 44.0,
    audioSrc: "/vo-short-02.mp3",
  },
  {
    kind: SlideKinds.Short,
    id: "short-03",
    index: 19,
    numberLabel: "S3",
    title: "Park in a 1 cm Extra Gap?",
    subtitle: "Portrait Short: shuttling in any space c > 0 & why you must finish in reverse",
    durationSeconds: 36.5,
    audioSrc: "/vo-short-03.mp3",
  },
];

const LAST_SLIDE_STORAGE_KEY = "parking:last-slide-index";
const CONTINUOUS_PLAYBACK_STORAGE_KEY = "parking:continuous-playback";
const SHORT_ROTATED_STORAGE_KEY = "parking:short-rotated";

const StoredSlideIndexSchema = v.pipe(v.number(), v.integer(), v.minValue(0));
const StoredBooleanSchema = v.boolean();

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

function readInitialBooleanPref(storageKey: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") {
    return defaultValue;
  }
  try {
    const rawValue: string | null = window.localStorage.getItem(storageKey);
    if (rawValue === null) {
      return defaultValue;
    }
    const parsedJson: unknown = JSON.parse(rawValue);
    const result = v.safeParse(StoredBooleanSchema, parsedJson);
    return result.success ? result.output : defaultValue;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`Failed to read '${storageKey}' from localStorage:`, error.message);
    }
    return defaultValue;
  }
}

function saveBooleanPref(storageKey: string, enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(enabled));
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`Failed to save '${storageKey}' to localStorage:`, error.message);
    }
  }
}

export function isSlidePlayable(slide: SlideMetadata | undefined): boolean {
  if (!slide) {
    return true;
  }
  switch (slide.kind) {
    case SlideKinds.Slide:
    case SlideKinds.Short:
      return true;
    case SlideKinds.Thumbnail:
      return false;
    default: {
      const _exhaustive: never = slide;
      throw new Error(`Unhandled slide kind: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export interface PresentationState {
  readonly currentSlideIndex: number;
  readonly isPlaying: boolean;
  readonly isContinuousPlayback: boolean;
  readonly isShortRotated: boolean;
  readonly elapsedSeconds: number;
  readonly replayGeneration: number;
  readonly isHudVisible: boolean;
  readonly phaseMode: SlidePhaseMode;
  readonly transition: SlideTransition;
  readonly setSlideIndex: (index: number) => void;
  readonly completeSlideTransition: () => void;
  readonly togglePlay: () => void;
  readonly setPlaying: (playing: boolean) => void;
  readonly toggleContinuousPlayback: () => void;
  readonly toggleShortRotation: () => void;
  readonly tickElapsed: (deltaSeconds: number) => void;
  readonly seekTo: (seconds: number) => void;
  readonly restartSlide: () => void;
  readonly toggleHud: () => void;
  readonly setPhaseMode: (mode: SlidePhaseMode) => void;
}

const initialSlideIndex = readInitialSlideIndex();
const initialIsPlayable = isSlidePlayable(SLIDES_METADATA[initialSlideIndex]);

export const usePresentationStore = create<PresentationState>((set) => ({
  currentSlideIndex: initialSlideIndex,
  isPlaying: initialIsPlayable,
  isContinuousPlayback: readInitialBooleanPref(CONTINUOUS_PLAYBACK_STORAGE_KEY, true),
  isShortRotated: readInitialBooleanPref(SHORT_ROTATED_STORAGE_KEY, true),
  elapsedSeconds: 0,
  replayGeneration: 0,
  isHudVisible: true,
  phaseMode: SlidePhaseModes.Auto,
  transition: { kind: TransitionKinds.Idle },

  setSlideIndex: (index: number): void => {
    const safeIndex = Math.max(0, Math.min(index, SLIDES_METADATA.length - 1));
    const targetMeta = SLIDES_METADATA[safeIndex];
    const shouldAutoPlay = isSlidePlayable(targetMeta);

    set((state) => {
      if (safeIndex === state.currentSlideIndex && state.transition.kind === TransitionKinds.Idle) {
        return {
          elapsedSeconds: 0,
          isPlaying: shouldAutoPlay,
          phaseMode: SlidePhaseModes.Auto,
          replayGeneration: state.replayGeneration + 1,
        };
      }
      return {
        transition: {
          kind: TransitionKinds.Exiting,
          targetSlideIndex: safeIndex,
          autoPlayAfter: shouldAutoPlay,
        },
      };
    });
  },

  completeSlideTransition: (): void => {
    set((state) => {
      if (state.transition.kind !== TransitionKinds.Exiting) {
        return state;
      }
      const nextIndex = state.transition.targetSlideIndex;
      saveLastSlideIndex(nextIndex);
      return {
        currentSlideIndex: nextIndex,
        elapsedSeconds: 0,
        isPlaying: state.transition.autoPlayAfter,
        phaseMode: SlidePhaseModes.Auto,
        transition: { kind: TransitionKinds.Idle },
        replayGeneration: state.replayGeneration + 1,
      };
    });
  },

  togglePlay: (): void => {
    set((state) => {
      if (state.transition.kind === TransitionKinds.Exiting) {
        return {
          isPlaying: false,
          transition: { kind: TransitionKinds.Idle },
        };
      }
      const currentMeta = SLIDES_METADATA[state.currentSlideIndex] ?? SLIDES_METADATA[0];
      if (!currentMeta || !isSlidePlayable(currentMeta)) {
        return { isPlaying: false };
      }
      if (!state.isPlaying && state.elapsedSeconds >= currentMeta.durationSeconds) {
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

  toggleContinuousPlayback: (): void => {
    set((state) => {
      const next = !state.isContinuousPlayback;
      saveBooleanPref(CONTINUOUS_PLAYBACK_STORAGE_KEY, next);
      return { isContinuousPlayback: next };
    });
  },

  toggleShortRotation: (): void => {
    set((state) => {
      const next = !state.isShortRotated;
      saveBooleanPref(SHORT_ROTATED_STORAGE_KEY, next);
      return { isShortRotated: next };
    });
  },

  tickElapsed: (deltaSeconds: number): void => {
    set((state) => {
      if (!state.isPlaying || state.phaseMode !== SlidePhaseModes.Auto) {
        return state;
      }
      if (state.transition.kind !== TransitionKinds.Idle) {
        return state;
      }
      const currentMeta = SLIDES_METADATA[state.currentSlideIndex] ?? SLIDES_METADATA[0];
      if (!currentMeta || !isSlidePlayable(currentMeta)) {
        return { isPlaying: false };
      }
      const maxDuration = currentMeta.durationSeconds;
      const nextElapsed = state.elapsedSeconds + deltaSeconds;
      if (nextElapsed >= maxDuration) {
        if (
          currentMeta.kind === SlideKinds.Slide &&
          state.isContinuousPlayback &&
          state.currentSlideIndex < PRESENTATION_SLIDE_COUNT - 1
        ) {
          return {
            elapsedSeconds: maxDuration,
            transition: {
              kind: TransitionKinds.Exiting,
              targetSlideIndex: state.currentSlideIndex + 1,
              autoPlayAfter: true,
            },
          };
        }
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
      if (!currentMeta || !isSlidePlayable(currentMeta)) {
        return state;
      }
      const maxDuration = currentMeta.durationSeconds;
      const clamped = Math.max(0, Math.min(seconds, maxDuration));
      return {
        elapsedSeconds: clamped,
        phaseMode: SlidePhaseModes.Auto,
        transition: { kind: TransitionKinds.Idle },
      };
    });
  },

  restartSlide: (): void => {
    set((state) => {
      const currentMeta = SLIDES_METADATA[state.currentSlideIndex] ?? SLIDES_METADATA[0];
      const shouldAutoPlay = isSlidePlayable(currentMeta);
      return {
        elapsedSeconds: 0,
        isPlaying: shouldAutoPlay,
        phaseMode: SlidePhaseModes.Auto,
        transition: { kind: TransitionKinds.Idle },
        replayGeneration: state.replayGeneration + 1,
      };
    });
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
          transition: { kind: TransitionKinds.Idle },
          replayGeneration: state.replayGeneration + 1,
        };
      }
      const phaseTimestamp = mode === SlidePhaseModes.Gap ? 5 : mode === SlidePhaseModes.Shuffle ? 16 : 29;
      return {
        phaseMode: mode,
        elapsedSeconds: phaseTimestamp,
        isPlaying: true,
        transition: { kind: TransitionKinds.Idle },
      };
    });
  },
}));
