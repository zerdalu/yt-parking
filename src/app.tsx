import { Slide01Dilemma } from "@/slides/slide-01-dilemma";
import { Slide02PerfectParking } from "@/slides/slide-02-perfect-parking";
import { SLIDES_METADATA, usePresentationStore } from "@/store/presentation-store";
import {
  ArrowCounterClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  EyeSlashIcon,
  PauseIcon,
  PlayIcon,
} from "@phosphor-icons/react";
import { Button, ButtonSizes, ButtonVariants } from "@ui/index";
import { useEffect, useRef, type ReactElement } from "react";

function formatSeconds(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function App(): ReactElement {
  const currentSlideIndex = usePresentationStore((state) => state.currentSlideIndex);
  const isPlaying = usePresentationStore((state) => state.isPlaying);
  const elapsedSeconds = usePresentationStore((state) => state.elapsedSeconds);
  const replayGeneration = usePresentationStore((state) => state.replayGeneration);
  const isHudVisible = usePresentationStore((state) => state.isHudVisible);
  const togglePlay = usePresentationStore((state) => state.togglePlay);
  const setPlaying = usePresentationStore((state) => state.setPlaying);
  const tickElapsed = usePresentationStore((state) => state.tickElapsed);
  const restartSlide = usePresentationStore((state) => state.restartSlide);
  const setSlideIndex = usePresentationStore((state) => state.setSlideIndex);
  const toggleHud = usePresentationStore((state) => state.toggleHud);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentSlide = SLIDES_METADATA[currentSlideIndex] ?? SLIDES_METADATA[0];
  const slideDuration = currentSlide ? currentSlide.durationSeconds : 35;
  const slideNumberPadded = currentSlide ? currentSlide.numberLabel : "01";
  const audioSrc = `/vo-slide-${slideNumberPadded}.mp3`;

  // Sync HTML5 Voice-Over Audio with Play/Pause and Replay
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setPlaying(false);
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, setPlaying]);

  // Reset audio to 0.0s when user restarts slide ('R') or changes slide
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.currentTime = 0;
    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setPlaying(false);
        });
      }
    }
  }, [replayGeneration, currentSlideIndex, isPlaying, setPlaying]);

  // High-precision animation loop locked to voice-over audio clock when available
  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    let lastTime = performance.now();
    let frameId = 0;

    const loop = (now: number): void => {
      const deltaSeconds = (now - lastTime) / 1000;
      lastTime = now;

      const audio = audioRef.current;
      if (audio && !audio.paused && !audio.ended && audio.readyState >= 2) {
        const drift = audio.currentTime - usePresentationStore.getState().elapsedSeconds;
        if (Math.abs(drift) > 0.04) {
          tickElapsed(drift);
        } else {
          tickElapsed(deltaSeconds);
        }
      } else {
        tickElapsed(deltaSeconds);
      }

      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isPlaying, tickElapsed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        restartSlide();
      } else if (event.key === "h" || event.key === "H") {
        event.preventDefault();
        toggleHud();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        setSlideIndex(currentSlideIndex + 1);
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        setSlideIndex(currentSlideIndex - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentSlideIndex, restartSlide, setSlideIndex, toggleHud, togglePlay]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-surface-canvas text-text-primary">
      <audio ref={audioRef} src={audioSrc} preload="auto">
        <track kind="captions" srcLang="en" label="Voice-over narration" />
      </audio>

      <main className="h-full w-full">
        {currentSlideIndex === 0 ? <Slide01Dilemma /> : currentSlideIndex === 1 ? <Slide02PerfectParking /> : null}
      </main>

      {/* Minimal Floating Control Pill (Toggle with 'H' key) */}
      {isHudVisible ? (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-track border border-border-subtle bg-surface-100/90 px-2.5 py-1.5 shadow-floating backdrop-blur-floating">
          <Button
            variant={ButtonVariants.Ghost}
            size={ButtonSizes.IconXs}
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <PauseIcon weight="fill" className="size-4" /> : <PlayIcon weight="fill" className="size-4" />}
          </Button>

          <Button
            variant={ButtonVariants.Ghost}
            size={ButtonSizes.IconXs}
            onClick={restartSlide}
            aria-label="Restart slide"
          >
            <ArrowCounterClockwiseIcon className="size-4" />
          </Button>

          <span className="px-2 font-mono text-xs text-text-secondary tabular-nums">
            {formatSeconds(elapsedSeconds)} / {formatSeconds(slideDuration)}
          </span>

          <div className="h-3.5 w-px bg-border-subtle" />

          <Button
            variant={ButtonVariants.Ghost}
            size={ButtonSizes.IconXs}
            disabled={currentSlideIndex <= 0}
            onClick={() => setSlideIndex(currentSlideIndex - 1)}
            aria-label="Previous slide"
          >
            <CaretLeftIcon className="size-4" />
          </Button>

          <span className="px-1 font-mono text-xs text-text-primary tabular-nums">{slideNumberPadded} / 16</span>

          <Button
            variant={ButtonVariants.Ghost}
            size={ButtonSizes.IconXs}
            disabled={currentSlideIndex >= SLIDES_METADATA.length - 1}
            onClick={() => setSlideIndex(currentSlideIndex + 1)}
            aria-label="Next slide"
          >
            <CaretRightIcon className="size-4" />
          </Button>

          <div className="h-3.5 w-px bg-border-subtle" />

          <Button
            variant={ButtonVariants.Ghost}
            size={ButtonSizes.IconXs}
            onClick={toggleHud}
            aria-label="Hide controls (H)"
          >
            <EyeSlashIcon className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default App;
