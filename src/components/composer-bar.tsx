import { ArrowUp, Settings2 } from "lucide-react";
import { useId, type Dispatch, type SetStateAction } from "react";
import type {
  LanguageOption,
  Preferences,
  VoiceOption,
} from "../hooks/use-speech-synthesis";
import { cn } from "../lib/utils";
import { PreferencesDialog } from "./preferences-dialog";
import { Button } from "./ui/button";
import { Field, FieldLabel } from "./ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";

interface ComposerBarProps {
  className?: string;
  bestVoice?: VoiceOption;
  input: string;
  languageOptions: LanguageOption[];
  onArrowHistoryNavigate: (direction: "up" | "down") => boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  preferences: Preferences;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  voices: VoiceOption[];
}

export function ComposerBar({
  bestVoice,
  className,
  input,
  languageOptions,
  onArrowHistoryNavigate,
  onInputChange,
  onSubmit,
  preferences,
  setPreferences,
  voices,
}: ComposerBarProps) {
  const inputId = useId();

  return (
    <div className={cn("flex w-full items-center", className)}>
      <form
        className="flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field>
          <FieldLabel className="sr-only" htmlFor={inputId}>
            Phrase to speak
          </FieldLabel>
          <InputGroup className="h-14 rounded-full bg-background px-2 has-disabled:bg-background has-disabled:opacity-100 dark:bg-background dark:has-disabled:bg-background">
            <InputGroupInput
              autoFocus
              id={inputId}
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
              className="h-12 px-2 text-[15px] md:text-[15px]"
            />
            <InputGroupAddon align="inline-end" className="gap-1 pl-1">
              <PreferencesDialog
                bestVoice={bestVoice}
                languageOptions={languageOptions}
                preferences={preferences}
                setPreferences={setPreferences}
                voices={voices}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label="Open preferences"
                >
                  <Settings2 />
                </Button>
              </PreferencesDialog>
              <Button
                type="submit"
                size="icon"
                className="rounded-full"
                disabled={!input.trim()}
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
