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
    durationSeconds: 32,
    cumulativeStart: "00:35",
    cumulativeEnd: "01:07",
  },
];

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
  readonly restartSlide: () => void;
  readonly toggleHud: () => void;
  readonly setPhaseMode: (mode: SlidePhaseMode) => void;
}

export const usePresentationStore = create<PresentationState>((set) => ({
  currentSlideIndex: 0,
  isPlaying: true,
  elapsedSeconds: 0,
  replayGeneration: 0,
  isHudVisible: true,
  phaseMode: SlidePhaseModes.Auto,

  setSlideIndex: (index: number): void => {
    const safeIndex = Math.max(0, Math.min(index, SLIDES_METADATA.length - 1));
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
