import { useEffect, useMemo, useState } from "react";

export interface HistoryItem {
    id: number;
    text: string;
}

export interface Preferences {
    speed: number;
    voice: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
    speed: 1,
    voice: "",
};

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

function readStoredJSON<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

function findBestVoice(availableVoices: SpeechSynthesisVoice[]) {
    const language = navigator.language.toLowerCase();

    return (
        availableVoices.find(
            (voice) =>
                voice.name.includes("Google") &&
                voice.lang.toLowerCase() === language,
        ) ??
        availableVoices.find(
            (voice) =>
                voice.name.includes("Microsoft") &&
                voice.lang.toLowerCase() === language,
        ) ??
        availableVoices.find((voice) =>
            voice.lang.toLowerCase().startsWith(language.split("-")[0]),
        ) ??
        availableVoices[0]
    );
}

export function getReadableLanguageName(langCode: string) {
    try {
        const languageNames = new Intl.DisplayNames([navigator.language], {
            type: "language",
            style: "long",
        });
        return languageNames.of(langCode.split("-")[0]) ?? langCode;
    } catch {
        return langCode;
    }
}

export function useSpeechSynthesis() {
    const [input, setInput] = useState("");
    const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(
        null,
    );
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() =>
        readStoredJSON("history", []),
    );
    const [preferences, setPreferences] = useState<Preferences>(() =>
        readStoredJSON("preferences", DEFAULT_PREFERENCES),
    );
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [bestVoice, setBestVoice] = useState<SpeechSynthesisVoice>();

    const speechSupported =
        typeof window !== "undefined" && "speechSynthesis" in window;

    const selectedVoice = useMemo(
        () => voices.find((voice) => voice.name === preferences.voice),
        [preferences.voice, voices],
    );

    useEffect(() => {
        if (!speechSupported) {
            return;
        }

        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);

            if (availableVoices.length === 0) {
                return;
            }

            const suggestedVoice = findBestVoice(availableVoices);
            setBestVoice(suggestedVoice);

            setPreferences((current) => {
                if (current.voice || !suggestedVoice) {
                    return current;
                }

                return { ...current, voice: suggestedVoice.name };
            });
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            if (window.speechSynthesis.onvoiceschanged === loadVoices) {
                window.speechSynthesis.onvoiceschanged = null;
            }
            window.speechSynthesis.cancel();
        };
    }, [speechSupported]);

    useEffect(() => {
        localStorage.setItem("history", JSON.stringify(historyItems));
    }, [historyItems]);

    useEffect(() => {
        localStorage.setItem("preferences", JSON.stringify(preferences));
    }, [preferences]);

    const stopPlayback = () => {
        if (!speechSupported) {
            return;
        }

        window.speechSynthesis.cancel();
        setCurrentlyPlaying(null);
    };

    const speak = (text: string, id: number) => {
        if (!speechSupported) {
            return;
        }

        if (currentlyPlaying === id) {
            stopPlayback();
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = preferences.speed;

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onend = () => setCurrentlyPlaying(null);
        utterance.onerror = () => setCurrentlyPlaying(null);

        setCurrentlyPlaying(id);
        window.speechSynthesis.speak(utterance);
    };

    const submitInput = () => {
        const text = input.trim();

        if (!text) {
            return;
        }

        const newItem = {
            id: Date.now(),
            text,
        };

        setHistoryItems((current) => [newItem, ...current]);
        setInput("");
        speak(newItem.text, newItem.id);
    };

    const clearHistory = () => {
        stopPlayback();
        setHistoryItems([]);
    };

    return {
        bestVoice,
        clearHistory,
        currentlyPlaying,
        historyItems,
        input,
        preferences,
        selectedVoice,
        setInput,
        setPreferences,
        speak,
        speechSupported,
        stopPlayback,
        submitInput,
        voices,
    };
}
