import type { Dispatch, ReactElement, SetStateAction } from "react";
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
import { Button } from "./ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "./ui/field";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";

interface PreferencesDialogProps {
    bestVoice?: VoiceOption;
    children: ReactElement;
    languageOptions: LanguageOption[];
    onClearHistory: () => void;
    preferences: Preferences;
    setPreferences: Dispatch<SetStateAction<Preferences>>;
    voices: VoiceOption[];
}

export function PreferencesDialog({
    bestVoice,
    children,
    languageOptions,
    onClearHistory,
    preferences,
    setPreferences,
    voices,
}: PreferencesDialogProps) {
    const selectedLanguage =
        languageOptions.find(
            (language) => language.code === preferences.language,
        ) ?? languageOptions[0];
    const selectedVoice =
        voices.find((voice) => voice.id === preferences.voice) ?? bestVoice;
    const selectedVoiceLabel = selectedVoice
        ? getVoiceLabel(selectedVoice, { includeFlag: true })
        : undefined;
    const selectedLanguageLabel = selectedLanguage
        ? getLanguageLabel(selectedLanguage, { includeFlag: true })
        : undefined;

    return (
        <Dialog>
            <DialogTrigger render={children} />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Preferences</DialogTitle>
                </DialogHeader>

                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="speed-preference">
                            Speed
                        </FieldLabel>
                        <FieldContent>
                            <FieldDescription>
                                Choose the playback rate for spoken phrases.
                            </FieldDescription>
                        </FieldContent>
                        <Select
                            value={String(preferences.speed)}
                            onValueChange={(value) =>
                                setPreferences((current) => ({
                                    ...current,
                                    speed: Number(value),
                                }))
                            }
                        >
                            <SelectTrigger
                                className="w-full"
                                id="speed-preference"
                            >
                                <SelectValue placeholder="Select speed" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {SPEED_OPTIONS.map((option) => (
                                        <SelectItem
                                            key={option}
                                            value={String(option)}
                                        >
                                            {option}x
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="language-preference">
                            Language
                        </FieldLabel>
                        <FieldContent>
                            <FieldDescription>
                                Select the language you want to write in.
                            </FieldDescription>
                        </FieldContent>
                        <Select
                            value={preferences.language}
                            onValueChange={(value) =>
                                setPreferences((current) => ({
                                    ...current,
                                    language: value ?? current.language,
                                    voice: "",
                                }))
                            }
                        >
                            <SelectTrigger
                                className="w-full"
                                id="language-preference"
                            >
                                <SelectValue placeholder="Select language">
                                    {selectedLanguageLabel}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {languageOptions.map((language) => (
                                        <SelectItem
                                            key={language.code}
                                            value={language.code}
                                        >
                                            {getLanguageLabel(language, {
                                                includeFlag: true,
                                            })}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="voice-preference">
                            Voice
                        </FieldLabel>
                        <FieldContent>
                            <FieldDescription>
                                Pick the voice that sounds the most natural for
                                you.
                            </FieldDescription>
                        </FieldContent>
                        <Select
                            value={preferences.voice}
                            onValueChange={(value) =>
                                setPreferences((current) => ({
                                    ...current,
                                    voice: value ?? current.voice,
                                }))
                            }
                        >
                            <SelectTrigger
                                className="w-full"
                                id="voice-preference"
                            >
                                <SelectValue placeholder="Select voice">
                                    {selectedVoiceLabel}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {bestVoice ? (
                                        <SelectItem value={bestVoice.id}>
                                            {getVoiceLabel(bestVoice, {
                                                includeFlag: true,
                                            })}
                                        </SelectItem>
                                    ) : null}
                                    {voices
                                        .filter(
                                            (voice) =>
                                                voice.id !== bestVoice?.id,
                                        )
                                        .map((voice) => (
                                            <SelectItem
                                                key={voice.id}
                                                value={voice.id}
                                            >
                                                {getVoiceLabel(voice, {
                                                    includeFlag: true,
                                                })}
                                            </SelectItem>
                                        ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={onClearHistory}
                            />
                        }
                    >
                        Clear message history
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
