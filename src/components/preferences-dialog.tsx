import {
  cloneElement,
  useEffect,
  useState,
  type Dispatch,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import type {
  LanguageOption,
  Preferences,
  VoiceOption,
} from "../hooks/use-speech-synthesis";
import {
  getLanguageLabel,
  getVoiceLabel,
  SPEED_OPTIONS,
} from "../hooks/use-speech-synthesis";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "./ui/field";

interface PreferencesDialogProps {
  bestVoice?: VoiceOption;
  children: ReactElement;
  languageOptions: LanguageOption[];
  preferences: Preferences;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  voices: VoiceOption[];
}

const nativeSelectClassName = cn(
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
  "md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
);

export function PreferencesDialog({
  bestVoice,
  children,
  languageOptions,
  preferences,
  setPreferences,
  voices,
}: PreferencesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedLanguage =
    languageOptions.find(
      (language) => language.code === preferences.language,
    ) ?? languageOptions[0];
  const visibleBestVoice =
    voices.find((voice) => voice.isDefault) ?? voices[0] ?? bestVoice;
  const selectedVoice =
    voices.find((voice) => voice.id === preferences.voice) ?? visibleBestVoice;
  const selectedVoiceLabel = selectedVoice
    ? getVoiceLabel(selectedVoice, { includeFlag: true })
    : undefined;
  const selectedLanguageLabel = selectedLanguage
    ? getLanguageLabel(selectedLanguage, { includeFlag: true })
    : undefined;
  const dialog = isOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4 supports-backdrop-filter:backdrop-blur-xs"
      onClick={() => {
        setIsOpen(false);
      }}
    >
      <div
        aria-modal="true"
        role="dialog"
        aria-label="Preferences"
        className="grid w-full max-w-sm gap-4 rounded-xl bg-background p-4 text-sm ring-1 ring-foreground/10"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base leading-none font-medium">Preferences</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setIsOpen(false);
            }}
            aria-label="Close preferences"
          >
            ×
          </Button>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="speed-preference">Speed</FieldLabel>
            <FieldContent>
              <FieldDescription>
                Choose the playback rate for spoken phrases.
              </FieldDescription>
            </FieldContent>
            <select
              className={nativeSelectClassName}
              id="speed-preference"
              value={String(preferences.speed)}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  speed: Number(event.target.value),
                }))
              }
            >
              {SPEED_OPTIONS.map((option) => (
                <option key={option} value={String(option)}>
                  {option}x
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="language-preference">Language</FieldLabel>
            <FieldContent>
              <FieldDescription>
                Select the language you want to write in.
              </FieldDescription>
            </FieldContent>
            <select
              className={nativeSelectClassName}
              id="language-preference"
              value={preferences.language}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  language: event.target.value,
                  voice: "",
                }))
              }
            >
              {!preferences.language && selectedLanguageLabel ? (
                <option value="">{selectedLanguageLabel}</option>
              ) : null}
              {languageOptions.map((language) => (
                <option key={language.code} value={language.code}>
                  {getLanguageLabel(language, {
                    includeFlag: true,
                  })}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="voice-preference">Voice</FieldLabel>
            <FieldContent>
              <FieldDescription>
                Pick the voice that sounds the most natural for you.
              </FieldDescription>
            </FieldContent>
            <select
              className={nativeSelectClassName}
              id="voice-preference"
              value={preferences.voice}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  voice: event.target.value,
                }))
              }
            >
              {!preferences.voice && selectedVoiceLabel ? (
                <option value="">{selectedVoiceLabel}</option>
              ) : null}
              {visibleBestVoice ? (
                <option value={visibleBestVoice.id}>
                  {getVoiceLabel(visibleBestVoice, {
                    includeFlag: true,
                  })}
                </option>
              ) : null}
              {voices
                .filter((voice) => voice.id !== visibleBestVoice?.id)
                .map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {getVoiceLabel(voice, {
                      includeFlag: true,
                    })}
                  </option>
                ))}
            </select>
          </Field>
        </FieldGroup>

        <div className="-mx-4 -mb-4 flex justify-end rounded-b-xl border-t bg-muted/50 p-4">
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              setIsOpen(false);
            }}
          >
            Close
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
