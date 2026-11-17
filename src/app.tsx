import { Slide01Dilemma } from "@/slides/slide-01-dilemma";
import { Slide02PerfectParking } from "@/slides/slide-02-perfect-parking";
import { Slide03WheelPlane } from "@/slides/slide-03-wheel-plane";
import { SLIDES_METADATA, usePresentationStore } from "@/store/presentation-store";
import {
  ArrowCounterClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  EyeSlashIcon,
  PauseIcon,
  PlayIcon,
} from "@phosphor-icons/react";
import {
  Button,
  ButtonSizes,
  ButtonVariants,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  Slider,
} from "@ui/index";
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
  const seekTo = usePresentationStore((state) => state.seekTo);
  const restartSlide = usePresentationStore((state) => state.restartSlide);
  const setSlideIndex = usePresentationStore((state) => state.setSlideIndex);
  const toggleHud = usePresentationStore((state) => state.toggleHud);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentSlide = SLIDES_METADATA[currentSlideIndex] ?? SLIDES_METADATA[0];
  const slideDuration = currentSlide ? currentSlide.durationSeconds : 35;
  const slideNumberPadded = currentSlide ? currentSlide.numberLabel : "01";
  const audioSrc = `/vo-slide-${slideNumberPadded}.mp3`;

  const prevSyncRef = useRef<{ readonly audioSrc: string; readonly replayGeneration: number }>({
    audioSrc,
    replayGeneration,
  });

  // Reset and reload audio ONLY when switching slides or explicitly restarting ('R' / replay)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const prev = prevSyncRef.current;
    const srcChanged = prev.audioSrc !== audioSrc;
    const replayChanged = prev.replayGeneration !== replayGeneration;

    if (!srcChanged && !replayChanged) {
      return;
    }

    prevSyncRef.current = { audioSrc, replayGeneration };

    if (srcChanged) {
      audio.load();
    }
    audio.currentTime = 0;

    if (usePresentationStore.getState().isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "NotAllowedError") {
            setPlaying(false);
          }
        });
      }
    }
  }, [audioSrc, replayGeneration, setPlaying]);

  // Sync Play / Pause cleanly without resetting audio.currentTime
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      if (audio.error) {
        return;
      }
      const storeElapsed = usePresentationStore.getState().elapsedSeconds;
      const hasFiniteDuration = Number.isFinite(audio.duration);
      if (audio.readyState >= 1) {
        if (hasFiniteDuration && storeElapsed >= audio.duration) {
          return;
        }
        if (Math.abs(audio.currentTime - storeElapsed) > 0.12) {
          audio.currentTime = hasFiniteDuration ? Math.min(storeElapsed, audio.duration) : storeElapsed;
        }
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "NotAllowedError") {
            setPlaying(false);
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, setPlaying]);

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
      if (audio && !audio.error && !audio.paused && !audio.ended && audio.readyState >= 2) {
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
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      const isSliderFocused = target instanceof HTMLElement && target.getAttribute("role") === "slider";

      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        restartSlide();
      } else if (event.key === "h" || event.key === "H") {
        event.preventDefault();
        toggleHud();
      } else if (event.code === "ArrowRight" && !isSliderFocused) {
        event.preventDefault();
        setSlideIndex(currentSlideIndex + 1);
      } else if (event.code === "ArrowLeft" && !isSliderFocused) {
        event.preventDefault();
        setSlideIndex(currentSlideIndex - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentSlideIndex, restartSlide, setSlideIndex, toggleHud, togglePlay]);

  const handleSeek = (value: number | readonly number[]): void => {
    const rawSeconds = typeof value === "number" ? value : (value[0] ?? 0);
    const nextSeconds = Math.max(0, Math.min(rawSeconds, slideDuration));
    seekTo(nextSeconds);

    const audio = audioRef.current;
    if (!audio || audio.error || audio.readyState < 1) {
      return;
    }

    const hasFiniteDuration = Number.isFinite(audio.duration);
    audio.currentTime = hasFiniteDuration ? Math.min(nextSeconds, audio.duration) : nextSeconds;

    if (isPlaying && (!hasFiniteDuration || nextSeconds < audio.duration) && audio.paused) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "NotAllowedError") {
            setPlaying(false);
          }
        });
      }
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-surface-canvas text-text-primary">
      <audio ref={audioRef} src={audioSrc} preload="auto">
        <track kind="captions" srcLang="en" label="Voice-over narration" />
      </audio>

      <main className="h-full w-full">
        {currentSlideIndex === 0 ? (
          <Slide01Dilemma />
        ) : currentSlideIndex === 1 ? (
          <Slide02PerfectParking />
        ) : currentSlideIndex === 2 ? (
          <Slide03WheelPlane />
        ) : null}
      </main>

      {/* Minimal Floating Control Pill (Toggle with 'H' key) */}
      {isHudVisible ? (
        <div className="fixed bottom-5 left-1/2 z-50 flex w-fit -translate-x-1/2 items-center gap-1.5 rounded-track border border-border-subtle bg-surface-100/90 px-2.5 py-1.5 shadow-floating backdrop-blur-floating">
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

          <div className="px-1">
            <Slider
              aria-label="Seek slide timeline"
              className="w-28 sm:w-36"
              min={0}
              max={slideDuration}
              step={0.1}
              value={elapsedSeconds}
              onValueChange={handleSeek}
            />
          </div>

          <span className="px-1.5 font-mono text-xs whitespace-nowrap text-text-secondary tabular-nums">
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

          <Menu>
            <MenuTrigger
              aria-label="Select slide"
              className="min-size-6 inline-flex h-control-xs cursor-pointer items-center justify-center rounded-control px-1.5 font-mono text-xs whitespace-nowrap text-text-primary tabular-nums transition-colors duration-150 ease-ui hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
            >
              {slideNumberPadded} / 16
            </MenuTrigger>
            <MenuContent side="top" align="center" sideOffset={10} className="w-72">
              <MenuGroup>
                <MenuGroupLabel>Slides</MenuGroupLabel>
                <MenuRadioGroup
                  value={String(currentSlideIndex)}
                  onValueChange={(value: unknown): void => {
                    if (typeof value === "string") {
                      const parsed = Number.parseInt(value, 10);
                      if (!Number.isNaN(parsed)) {
                        setSlideIndex(parsed);
                      }
                    }
                  }}
                >
                  {SLIDES_METADATA.map((slide) => (
                    <MenuRadioItem key={slide.index} value={String(slide.index)}>
                      <span className="flex items-center gap-2 truncate">
                        <span className="font-mono text-text-muted tabular-nums">{slide.numberLabel}</span>
                        <span className="truncate">{slide.title}</span>
                      </span>
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
              </MenuGroup>
            </MenuContent>
          </Menu>

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
