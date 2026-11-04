import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Minus, Plus } from "lucide-react";
import type {
  LanguageOption,
  Preferences,
  PreviewState,
  VoiceOption,
} from "../hooks/use-speech-synthesis";
import { getLanguageLabel, SPEED_OPTIONS } from "../hooks/use-speech-synthesis";
import { cn } from "../lib/utils";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";

interface PreferencesDialogProps {
  bestVoice?: VoiceOption;
  preparation: { progress: number | null } | null;
  isReady: boolean;
  preparationError: string;
  onRetry: () => void;
  children: ReactElement;
  languageOptions: LanguageOption[];
  preferences: Preferences;
  previewing: PreviewState;
  onPreviewVoice: (voice: VoiceOption) => void;
  onStopPreview: () => void;
  getPreviewProgress: () => number | null;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  voices: VoiceOption[];
}

export function PreferencesDialog({
  bestVoice,
  preparation,
  isReady,
  preparationError,
  onRetry,
  children,
  languageOptions,
  preferences,
  previewing,
  onPreviewVoice,
  onStopPreview,
  getPreviewProgress,
  setPreferences,
  voices,
}: PreferencesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => {
    onStopPreview();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  const defaultVoice =
    voices.find((voice) => voice.isDefault) ?? voices[0] ?? bestVoice;
  const selectedVoice =
    voices.find((voice) => voice.id === preferences.voice) ?? defaultVoice;
  const speedIndex = SPEED_OPTIONS.indexOf(preferences.speed);
  const setSpeed = (speed: number | undefined) => {
    if (speed === undefined) return;
    onStopPreview();
    setPreferences((current) => ({ ...current, speed }));
  };

  const dialog = isOpen ? (
    <div
      className="fixed inset-0 z-50 flex bg-black/10 supports-backdrop-filter:backdrop-blur-xs sm:items-center sm:justify-center sm:p-4"
      onClick={close}
    >
      <div
        aria-modal="true"
        role="dialog"
        aria-label="Voice settings"
        // Full screen on phones, where the list wants all the height; a dialog on wider screens.
        className="flex h-dvh w-full flex-col bg-background text-sm sm:h-[min(40rem,calc(100dvh-2rem))] sm:max-w-md sm:rounded-xl sm:ring-1 sm:ring-foreground/10"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <div className="relative">
            <select
              aria-label="Language"
              value={preferences.language}
              onChange={(event) => {
                onStopPreview();
                setPreferences((current) => ({
                  ...current,
                  language: event.target.value,
                  voice: "",
                }));
              }}
              className="h-9 appearance-none rounded-full border bg-transparent pr-8 pl-3.5 text-sm font-medium outline-none [field-sizing:content] hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {languageOptions.map((language) => (
                <option key={language.code} value={language.code}>
                  {getLanguageLabel(language)}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
          </div>

          <div
            role="group"
            aria-label="Speed"
            className="flex h-9 items-center rounded-full border"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="rounded-full"
              aria-label="Slower"
              disabled={speedIndex <= 0}
              onClick={() => setSpeed(SPEED_OPTIONS[speedIndex - 1])}
            >
              <Minus />
            </Button>
            <span
              className="w-10 text-center text-sm font-medium tabular-nums"
              aria-live="polite"
            >
              {preferences.speed}×
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="rounded-full"
              aria-label="Faster"
              disabled={speedIndex >= SPEED_OPTIONS.length - 1}
              onClick={() => setSpeed(SPEED_OPTIONS[speedIndex + 1])}
            >
              <Plus />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {!isReady || preparationError ? (
            <div className="mx-2 mt-4 flex items-center gap-3" role="status">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground">
                  {preparationError
                    ? "Couldn’t prepare your voices"
                    : "Loading voice model…"}
                </p>
                {!preparationError ? (
                  <Progress
                    className="mt-2"
                    value={preparation?.progress ?? null}
                    aria-label="Voice model download"
                  />
                ) : null}
              </div>
              {preparationError ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                >
                  Retry
                </Button>
              ) : null}
            </div>
          ) : null}

          {voices.length ? (
            <VoiceList
              voices={voices}
              selectedId={selectedVoice?.id}
              previewing={previewing}
              getPreviewProgress={getPreviewProgress}
              onChoose={(voice) => {
                setPreferences((current) => ({ ...current, voice: voice.id }));
                onPreviewVoice(voice);
              }}
            />
          ) : (
            <p className="mx-2 mt-4 text-muted-foreground">Loading voices…</p>
          )}

          <p className="mx-2 mt-6 text-xs text-muted-foreground">
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href="https://huggingface.co/gradium/phonon-40m-multilingual"
              target="_blank"
              rel="noreferrer"
            >
              Gradium Phonon
            </a>{" "}
            ·{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href="https://creativecommons.org/licenses/by-nc/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-NC 4.0
            </a>
          </p>
        </div>

        <div className="border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            size="lg"
            className="h-11 w-full text-[15px]"
            onClick={close}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {cloneElement(children, {
        onClick: (event: ReactMouseEvent) => {
          children.props.onClick?.(event);
          setIsOpen(true);
        },
      })}

      {dialog && typeof document !== "undefined"
        ? createPortal(dialog, document.body)
        : null}
    </>
  );
}

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

function groupOf(voice: VoiceOption) {
  if (voice.isCharacter) return { name: "Characters" };
  const [language, region] = voice.language.split("-");
  return {
    name:
      languageNames.of(
        region ? `${language}-${region.toUpperCase()}` : language,
      ) ?? voice.language,
  };
}

/**
 * Voices grouped by accent. Choosing a voice also plays it, so trying voices
 * and picking one are the same gesture.
 */
function VoiceList({
  voices,
  selectedId,
  previewing,
  getPreviewProgress,
  onChoose,
}: {
  voices: VoiceOption[];
  selectedId?: string;
  previewing: PreviewState;
  getPreviewProgress: () => number | null;
  onChoose: (voice: VoiceOption) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const groups = new Map<string, { name: string; voices: VoiceOption[] }>();
  for (const voice of voices) {
    const group = groupOf(voice);
    const existing = groups.get(group.name);
    if (existing) existing.voices.push(voice);
    else groups.set(group.name, { ...group, voices: [voice] });
  }

  // Bring the chosen voice into view when the list opens or its language
  // changes, but not on every choice, which would scroll under the finger.
  const listKey = voices[0]?.id;
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-checked="true"]')
      ?.scrollIntoView({ block: "center", inline: "nearest" });
  }, [listKey]);

  return (
    <div ref={listRef} role="radiogroup" aria-label="Voice">
      {[...groups.values()].map((group) => (
        <section key={group.name} className="mt-4">
          <h3 className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">
            {group.name}
          </h3>
          <ul className="flex flex-wrap gap-1.5 px-2">
            {group.voices.map((voice) => {
              const isSelected = voice.id === selectedId;
              const preview =
                previewing?.voiceId === voice.id ? previewing.status : null;
              return (
                // Tiles grow to fill each row, so rows pack edge to edge.
                <li key={voice.id} className="flex min-w-0 flex-auto">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    title={voice.description}
                    onClick={() => onChoose(voice)}
                    className={cn(
                      "relative h-9 w-full min-w-0 truncate overflow-hidden rounded-lg border px-3 text-center text-sm outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
                      isSelected &&
                        "border-foreground bg-foreground text-background hover:bg-foreground",
                    )}
                  >
                    {preview === "playing" ? (
                      <PlaybackFill getProgress={getPreviewProgress} />
                    ) : null}
                    <span className="relative">{voice.label}</span>
                  </button>
                </li>
              );
            })}
            {/* Soaks up the last row's spare space, so its tiles keep their natural width. */}
            <li aria-hidden="true" className="flex-[1000]" />
          </ul>
        </section>
      ))}
    </div>
  );
}

/** A faint fill that sweeps across a tile in step with its preview's playback. */
function PlaybackFill({ getProgress }: { getProgress: () => number | null }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    let shown = 0;
    const tick = () => {
      // Never step back when more audio streams in and the end moves out.
      shown = Math.max(shown, getProgress() ?? 0);
      ref.current?.style.setProperty("transform", `scaleX(${shown})`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [getProgress]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      // Scaled through transform alone: Tailwind's scale utilities use the separate
      // `scale` property, which would multiply with this and hold it at zero.
      style={{ transform: "scaleX(0)" }}
      className="absolute inset-0 origin-left bg-current opacity-25"
    />
  );
}
