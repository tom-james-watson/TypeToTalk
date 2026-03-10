import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";
import { FieldSelect } from "./ui/field-select";
import type { Preferences } from "../hooks/use-speech-synthesis";
import {
    getReadableLanguageName,
    SPEED_OPTIONS,
} from "../hooks/use-speech-synthesis";

interface PreferencesDialogProps {
    bestVoice?: SpeechSynthesisVoice;
    children: React.ReactNode;
    preferences: Preferences;
    setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
    voices: SpeechSynthesisVoice[];
}

export function PreferencesDialog({
    bestVoice,
    children,
    preferences,
    setPreferences,
    voices,
}: PreferencesDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Preferences</DialogTitle>
                    <DialogDescription>
                        Choose the voice and playback speed that sound most natural.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                    <label className="grid gap-2">
                        <span className="text-sm font-medium">Speed</span>
                        <FieldSelect
                            value={preferences.speed}
                            onChange={(event) =>
                                setPreferences((current) => ({
                                    ...current,
                                    speed: Number(event.target.value),
                                }))
                            }
                        >
                            {SPEED_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}x
                                </option>
                            ))}
                        </FieldSelect>
                    </label>

                    <label className="grid gap-2">
                        <span className="text-sm font-medium">Voice</span>
                        <FieldSelect
                            value={preferences.voice}
                            onChange={(event) =>
                                setPreferences((current) => ({
                                    ...current,
                                    voice: event.target.value,
                                }))
                            }
                        >
                            {bestVoice ? (
                                <option value={bestVoice.name}>
                                    {bestVoice.name} (default)
                                </option>
                            ) : null}
                            {voices
                                .filter((voice) => voice.name !== bestVoice?.name)
                                .sort((left, right) =>
                                    left.name.localeCompare(right.name),
                                )
                                .map((voice) => (
                                    <option key={voice.name} value={voice.name}>
                                        {voice.name} ({getReadableLanguageName(voice.lang)})
                                    </option>
                                ))}
                        </FieldSelect>
                    </label>
                </div>
            </DialogContent>
        </Dialog>
    );
}
