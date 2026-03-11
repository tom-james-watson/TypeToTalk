import type { Dispatch, ReactElement, SetStateAction } from "react";
import type { Preferences } from "../hooks/use-speech-synthesis";
import {
    getReadableLanguageName,
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
    bestVoice?: SpeechSynthesisVoice;
    children: ReactElement;
    onClearHistory: () => void;
    preferences: Preferences;
    setPreferences: Dispatch<SetStateAction<Preferences>>;
    voices: SpeechSynthesisVoice[];
}

export function PreferencesDialog({
    bestVoice,
    children,
    onClearHistory,
    preferences,
    setPreferences,
    voices,
}: PreferencesDialogProps) {
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
                                <SelectValue placeholder="Select voice" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {bestVoice ? (
                                        <SelectItem value={bestVoice.name}>
                                            {bestVoice.name} (default)
                                        </SelectItem>
                                    ) : null}
                                    {voices
                                        .filter(
                                            (voice) =>
                                                voice.name !== bestVoice?.name,
                                        )
                                        .sort((left, right) =>
                                            left.name.localeCompare(right.name),
                                        )
                                        .map((voice) => (
                                            <SelectItem
                                                key={voice.name}
                                                value={voice.name}
                                            >
                                                {voice.name} (
                                                {getReadableLanguageName(
                                                    voice.lang,
                                                )}
                                                )
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
