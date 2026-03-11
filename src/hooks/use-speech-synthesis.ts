import { useEffect, useMemo, useRef, useState } from "react";

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

export const MAX_HISTORY_ITEMS = 50;

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
    const [queuedIds, setQueuedIds] = useState<number[]>([]);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
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
    const queueRef = useRef<HistoryItem[]>([]);
    const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const currentIdRef = useRef<number | null>(null);
    const selectedVoiceRef = useRef<SpeechSynthesisVoice | undefined>(
        selectedVoice,
    );
    const preferencesRef = useRef(preferences);

    useEffect(() => {
        selectedVoiceRef.current = selectedVoice;
    }, [selectedVoice]);

    useEffect(() => {
        preferencesRef.current = preferences;
    }, [preferences]);

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
        localStorage.setItem("preferences", JSON.stringify(preferences));
    }, [preferences]);

    const playNextInQueue = () => {
        if (!speechSupported || currentIdRef.current !== null) {
            return;
        }

        const nextItem = queueRef.current.shift();

        setQueuedIds(queueRef.current.map((item) => item.id));

        if (!nextItem) {
            return;
        }

        const utterance = new SpeechSynthesisUtterance(nextItem.text);
        utterance.rate = preferencesRef.current.speed;

        if (selectedVoiceRef.current) {
            utterance.voice = selectedVoiceRef.current;
        }

        currentUtteranceRef.current = utterance;
        currentIdRef.current = nextItem.id;
        setCurrentlyPlaying(nextItem.id);

        utterance.onend = () => {
            if (currentIdRef.current !== nextItem.id) {
                return;
            }

            currentUtteranceRef.current = null;
            currentIdRef.current = null;
            setCurrentlyPlaying(null);
            playNextInQueue();
        };

        utterance.onerror = () => {
            if (currentIdRef.current !== nextItem.id) {
                return;
            }

            currentUtteranceRef.current = null;
            currentIdRef.current = null;
            setCurrentlyPlaying(null);
            playNextInQueue();
        };

        window.speechSynthesis.speak(utterance);
    };

    const stopPlayback = (options?: { clearQueue?: boolean }) => {
        if (!speechSupported) {
            return;
        }

        currentUtteranceRef.current = null;
        currentIdRef.current = null;
        window.speechSynthesis.cancel();
        setCurrentlyPlaying(null);

        if (options?.clearQueue) {
            queueRef.current = [];
            setQueuedIds([]);
            return;
        }

        playNextInQueue();
    };

    const speak = (text: string, id: number) => {
        if (!speechSupported) {
            return;
        }

        if (currentIdRef.current === id) {
            stopPlayback();
            return;
        }

        if (queueRef.current.some((item) => item.id === id)) {
            queueRef.current = queueRef.current.filter((item) => item.id !== id);
            setQueuedIds(queueRef.current.map((item) => item.id));
            return;
        }

        queueRef.current = [...queueRef.current, { id, text }];
        setQueuedIds(queueRef.current.map((item) => item.id));
        playNextInQueue();
    };

    const submitInput = () => {
        const text = input.replace(/\s+/g, " ").trim();

        if (!text) {
            return;
        }

        const newItem = {
            id: Date.now(),
            text,
        };

        setHistoryItems((current) => [...current, newItem].slice(-MAX_HISTORY_ITEMS));
        setInput("");
        speak(newItem.text, newItem.id);
    };

    const clearHistory = () => {
        stopPlayback({ clearQueue: true });
        setHistoryItems([]);
    };

    return {
        bestVoice,
        clearHistory,
        currentlyPlaying,
        historyItems,
        input,
        preferences,
        queuedIds,
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
