import { ArrowUp, RotateCw, Settings2 } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useId,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  LanguageOption,
  Preferences,
  PreviewState,
  VoiceOption,
} from "../hooks/use-speech-synthesis";
import { cn } from "../lib/utils";
import { PreferencesDialog } from "./preferences-dialog";
import { Button } from "./ui/button";
import { Field, FieldLabel } from "./ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";

type Phase = "loading" | "error" | "ready";

interface ComposerBarProps {
  className?: string;
  preparation: { progress: number | null } | null;
  isReady: boolean;
  needsDownload: boolean | null;
  error: string;
  onRetry: () => void;
  bestVoice?: VoiceOption;
  input: string;
  languageOptions: LanguageOption[];
  onArrowHistoryNavigate: (direction: "up" | "down") => boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  preferences: Preferences;
  previewing: PreviewState;
  onPreviewVoice: (voice: VoiceOption) => void;
  onStopPreview: () => void;
  getPreviewProgress: () => number | null;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  voices: VoiceOption[];
}

export function ComposerBar({
  bestVoice,
  preparation,
  isReady,
  needsDownload,
  error,
  onRetry,
  className,
  input,
  languageOptions,
  onArrowHistoryNavigate,
  onInputChange,
  onSubmit,
  preferences,
  previewing,
  onPreviewVoice,
  onStopPreview,
  getPreviewProgress,
  setPreferences,
  voices,
}: ComposerBarProps) {
  const inputId = useId();
  // InputGroupInput doesn't forward refs, so reach the input by its id.
  const focusInput = () =>
    document.getElementById(inputId)?.focus({ preventScroll: true });
  const phase: Phase = error ? "error" : isReady ? "ready" : "loading";
  const progress = preparation?.progress ?? null;
  // Only a real download gets the loading outline. With the model cached, the
  // input is usable at once and phrases wait for the short setup to finish.
  const showLoading = needsDownload === true;
  // The input waits for the outline to close, so the two arrive together.
  const [revealed, setRevealed] = useState(false);
  if (revealed && phase !== "ready") setRevealed(false);
  const showStatus = phase === "error" || (showLoading && !revealed);
  const blocked = showStatus || needsDownload === null;

  useEffect(() => {
    if (!blocked && !document.querySelector('[role="dialog"]'))
      document.getElementById(inputId)?.focus({ preventScroll: true });
  }, [blocked, inputId]);

  return (
    <div className={cn("flex w-full items-center", className)}>
      <form
        className="flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          if (!blocked) onSubmit();
        }}
      >
        <Field>
          <FieldLabel className="sr-only" htmlFor={inputId}>
            Phrase to speak
          </FieldLabel>
          <InputGroup
            aria-busy={showLoading && !revealed && phase !== "error"}
            className="h-14 rounded-full bg-background px-2 has-disabled:bg-background has-disabled:opacity-100 dark:bg-background dark:has-disabled:bg-background"
          >
            {showLoading ? (
              <PreparationOutline
                phase={phase}
                progress={progress}
                complete={revealed}
                onComplete={() => setRevealed(true)}
              />
            ) : null}
            <div className="h-12 min-w-0 flex-1">
              {showStatus ? (
                <p
                  role="status"
                  title={error || undefined}
                  className={cn(
                    "flex h-12 items-center px-2.5 text-[15px]",
                    phase === "error" && "text-destructive",
                  )}
                >
                  <span className="truncate">
                    {phase === "error" ? error : "Loading voice model…"}
                  </span>
                </p>
              ) : (
                <InputGroupInput
                  id={inputId}
                  disabled={blocked}
                  value={input}
                  onChange={(event) => onInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      (event.key === "ArrowUp" || event.key === "ArrowDown") &&
                      onArrowHistoryNavigate(
                        event.key === "ArrowUp" ? "up" : "down",
                      )
                    ) {
                      event.preventDefault();
                      return;
                    }

                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSubmit();
                    }
                  }}
                  placeholder="Type and press Enter to speak"
                  autoComplete="off"
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  spellCheck={false}
                  className="h-12 w-full animate-in text-[15px] duration-500 fade-in md:text-[15px]"
                />
              )}
            </div>
            <InputGroupAddon align="inline-end" className="gap-1 pl-1">
              {phase === "error" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-destructive hover:text-destructive"
                  onClick={() => {
                    onRetry();
                    focusInput();
                  }}
                >
                  <RotateCw />
                  Retry
                </Button>
              ) : null}
              <PreferencesDialog
                preparation={preparation}
                isReady={isReady}
                preparationError={error}
                onRetry={onRetry}
                bestVoice={bestVoice}
                languageOptions={languageOptions}
                preferences={preferences}
                previewing={previewing}
                onPreviewVoice={onPreviewVoice}
                onStopPreview={onStopPreview}
                getPreviewProgress={getPreviewProgress}
                setPreferences={setPreferences}
                voices={voices}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label="Voice settings"
                >
                  <Settings2 />
                </Button>
              </PreferencesDialog>
              <Button
                type="submit"
                size="icon"
                className="rounded-full"
                disabled={blocked || !input.trim()}
                aria-label="Speak phrase"
              >
                <ArrowUp />
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </form>
    </div>
  );
}

// How long setup after the download took last time; it reports no progress.
const SETUP_KEY = "phonon-setup-seconds";

function readSetupSeconds() {
  try {
    const seconds = Number(localStorage.getItem(SETUP_KEY));
    return seconds > 0 && seconds < 120 ? seconds : null;
  } catch {
    return null;
  }
}

function saveSetupSeconds(seconds: number) {
  try {
    localStorage.setItem(SETUP_KEY, seconds.toFixed(2));
  } catch {
    /* Storage is optional. */
  }
}

/**
 * Plans the close once the voice is ready: a curve from the current position
 * and speed to the full outline in at most 0.6s. It starts at the speed the
 * outline already has, so the finish reads as the same motion carrying on.
 */
function planClose(from: number, speed: number) {
  const remaining = 100 - from;
  const duration = Math.min(
    Math.max(remaining / Math.max(speed, 0.001), 0.05),
    0.6,
  );
  const average = remaining / duration;
  // Within three times the average speed, a cubic Hermite curve can't overshoot.
  const startSpeed = Math.min(speed, 3 * average);
  const endSpeed = Math.min(Math.max(startSpeed, 1.25 * average), 3 * average);

  return (seconds: number) => {
    const u = Math.min(seconds / duration, 1);
    if (u === 1) return 100;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * from +
      (u3 - 2 * u2 + u) * duration * startSpeed +
      (-2 * u3 + 3 * u2) * 100 +
      (u3 - u2) * duration * endSpeed
    );
  };
}

/**
 * A stroke that traces the input's outline while the voice loads, then ripples
 * outward once it closes. Rather than drawing raw percentages, it estimates
 * when loading will finish and steers its speed toward landing there, so the
 * whole load reads as one continuous motion.
 */
function PreparationOutline({
  phase,
  progress,
  complete,
  onComplete,
}: {
  phase: Phase;
  progress: number | null;
  complete: boolean;
  onComplete: () => void;
}) {
  const rectRef = useRef<SVGRectElement>(null);
  const latest = useRef({ phase, progress, onComplete });

  useLayoutEffect(() => {
    latest.current = { phase, progress, onComplete };
  }, [phase, progress, onComplete]);

  useEffect(() => {
    if (complete) return;
    // Pad the guess slightly: finishing early reads better than stalling.
    const setupSeconds = (readSetupSeconds() ?? 3) * 1.1;
    // Plan for a long download until the connection's speed is known.
    let finish = 20 + setupSeconds;
    const startedAt = performance.now();
    let frame = 0;
    let last = startedAt;
    let shown = 0;
    let speed = 0;
    // Download speed in percent per second, from recent samples: connections
    // ramp up, so an average since the start would lag well behind.
    let rate: number | null = null;
    let sample: { at: number; progress: number } | null = null;
    let downloadEnd: number | null = null;
    let readyAt: number | null = null;
    let closing: ReturnType<typeof planClose> | null = null;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      const elapsed = (now - startedAt) / 1000;
      last = now;
      const { phase, progress, onComplete } = latest.current;

      if (progress != null && progress < 100) {
        if (!sample) {
          sample = { at: elapsed, progress };
        } else if (progress > sample.progress && elapsed - sample.at >= 0.2) {
          const span = elapsed - sample.at;
          const recent = (progress - sample.progress) / span;
          rate =
            rate == null
              ? recent
              : rate + (recent - rate) * (1 - Math.exp(-span / 0.5));
          sample = { at: elapsed, progress };
        }
      }
      if (progress === 100) downloadEnd ??= elapsed;
      if (phase === "ready" && readyAt == null) {
        readyAt = elapsed;
        saveSetupSeconds(readyAt - (downloadEnd ?? 0));
        closing = planClose(shown, speed);
      }

      if (phase === "ready" && closing && readyAt != null) {
        shown = closing(elapsed - readyAt);
      } else if (phase === "error") {
        speed = 0;
      } else {
        if (downloadEnd != null) {
          finish = downloadEnd + setupSeconds;
        } else if (rate && progress != null) {
          finish = elapsed + (100 - progress) / rate + setupSeconds;
        }
        const desired = (100 - shown) / Math.max(finish - elapsed, 0.6);
        // Change speed gradually so estimate updates never show as jolts:
        // pick up pace readily, but ease off slowly.
        const smoothing = desired > speed ? 0.4 : 1.5;
        speed += (desired - speed) * (1 - Math.exp(-dt / smoothing));
        shown = Math.min(shown + speed * dt, 99.5);
      }

      rectRef.current?.style.setProperty("stroke-dasharray", `${shown} 100`);
      if (shown >= 100) onComplete();
      else frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [complete]);

  if (complete) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px animate-outline-release rounded-full"
      />
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -inset-px size-[calc(100%+2px)] overflow-visible"
    >
      <rect
        ref={rectRef}
        x={0.75}
        y={0.75}
        rx={27.25}
        pathLength={100}
        fill="none"
        strokeWidth={1.5}
        style={{
          width: "calc(100% - 1.5px)",
          height: "calc(100% - 1.5px)",
          strokeDasharray: "0 100",
        }}
        className={
          phase === "error" ? "stroke-destructive" : "stroke-foreground"
        }
      />
    </svg>
  );
}
