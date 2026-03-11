import { WebSpeechVoiceManager } from "@readium/speech";
import { useEffect, useMemo, useRef, useState } from "react";

export interface HistoryItem {
  id: number;
  text: string;
}

export interface Preferences {
  language: string;
  speed: number;
  voice: string;
}

export interface LanguageOption {
  code: string;
  count: number;
  label: string;
}

export interface VoiceOption {
  id: string;
  isDefault: boolean;
  label: string;
  language: string;
  nativeVoice: SpeechSynthesisVoice;
}

export const DEFAULT_PREFERENCES: Preferences = {
  language: "",
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

function normalizeLocale(locale: string) {
  return locale.toLowerCase();
}

function getBaseLanguage(locale: string) {
  return normalizeLocale(locale).split("-")[0];
}

function getPreferredLanguages() {
  if (typeof navigator === "undefined") {
    return ["en"];
  }

  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  return languages.map(normalizeLocale);
}

function getRegionCode(locale: string) {
  const [, region] = locale.split("-");

  return region?.length === 2 ? region.toUpperCase() : null;
}

export function getFlagEmoji(locale: string) {
  const region = getRegionCode(locale);

  if (!region) {
    return "";
  }

  return String.fromCodePoint(
    ...[...region].map((char) => 127397 + char.charCodeAt(0)),
  );
}

export function getLanguageLabel(
  language: Pick<LanguageOption, "code" | "label">,
  options?: { includeFlag?: boolean },
) {
  const flag = options?.includeFlag ? getFlagEmoji(language.code) : "";

  return flag ? `${flag} ${language.label}` : language.label;
}

export function getVoiceOptionId(
  voice: Pick<SpeechSynthesisVoice, "name" | "voiceURI" | "lang">,
  language?: string,
) {
  return voice.voiceURI || `${voice.name}::${language ?? voice.lang}`;
}

export function getVoiceLabel(
  voice: Pick<VoiceOption, "label" | "language">,
  options?: { includeFlag?: boolean },
) {
  const flag = options?.includeFlag ? getFlagEmoji(voice.language) : "";

  return flag ? `${flag} ${voice.label}` : voice.label;
}

export function useSpeechSynthesis() {
  const [input, setInput] = useState("");
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [queuedIds, setQueuedIds] = useState<number[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(() =>
    readStoredJSON("preferences", DEFAULT_PREFERENCES),
  );
  const [languageOptions, setLanguageOptions] = useState<LanguageOption[]>([]);
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
  const [bestVoice, setBestVoice] = useState<VoiceOption>();
  const [voiceManager, setVoiceManager] =
    useState<WebSpeechVoiceManager | null>(null);

  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const selectedVoice = useMemo(
    () =>
      voiceOptions.find(
        (voice) =>
          getVoiceOptionId(voice.nativeVoice, voice.language) ===
          preferences.voice,
      ),
    [preferences.voice, voiceOptions],
  );
  const queueRef = useRef<HistoryItem[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentIdRef = useRef<number | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | undefined>(
    selectedVoice?.nativeVoice,
  );
  const preferencesRef = useRef(preferences);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice?.nativeVoice;
  }, [selectedVoice]);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    if (!speechSupported) {
      return;
    }

    let cancelled = false;

    const initializeVoiceManager = async () => {
      const manager = await WebSpeechVoiceManager.initialize();

      if (!cancelled) {
        setVoiceManager(manager);
      }
    };

    void initializeVoiceManager();

    return () => {
      cancelled = true;
      window.speechSynthesis.cancel();
    };
  }, [speechSupported]);

  useEffect(() => {
    if (!voiceManager) {
      return;
    }

    let cancelled = false;
    const filters = {
      excludeNovelty: true,
      excludeVeryLowQuality: true,
      removeDuplicates: true,
    } as const;

    const syncVoiceOptions = async () => {
      const browserLanguages = voiceManager.getLanguages(
        navigator.language,
        filters,
      );
      const availableLanguages = browserLanguages.filter(
        (language) => language.count > 0,
      );

      if (cancelled) {
        return;
      }

      setLanguageOptions(availableLanguages);

      const preferredLanguages = getPreferredLanguages();
      const currentLanguage =
        preferences.language ||
        availableLanguages.find((language) =>
          preferredLanguages.some((preferredLanguage) => {
            const baseLanguage = getBaseLanguage(preferredLanguage);

            return (
              language.code.toLowerCase() === preferredLanguage ||
              language.code.toLowerCase() === baseLanguage
            );
          }),
        )?.code ||
        availableLanguages[0]?.code ||
        "";
      const filteredVoices = voiceManager.getVoices({
        ...filters,
        languages: currentLanguage || preferredLanguages,
      });
      const sortedVoices =
        await voiceManager.sortVoicesByQuality(filteredVoices);
      const mappedVoices: VoiceOption[] = sortedVoices.flatMap((voice) => {
        const nativeVoice = voiceManager.convertToSpeechSynthesisVoice(voice);

        if (!nativeVoice) {
          return [];
        }

        return [
          {
            id: getVoiceOptionId(nativeVoice, voice.language),
            isDefault: false,
            label: voice.label || voice.name,
            language: voice.language,
            nativeVoice,
          },
        ];
      });
      const defaultReadiumVoice = await voiceManager.getDefaultVoice(
        currentLanguage || preferredLanguages,
        sortedVoices,
      );
      const defaultVoiceId = defaultReadiumVoice
        ? getVoiceOptionId(
            {
              name: defaultReadiumVoice.name,
              lang: defaultReadiumVoice.language,
              voiceURI: defaultReadiumVoice.voiceURI || "",
            },
            defaultReadiumVoice.language,
          )
        : "";
      const voiceOptionsWithDefault: VoiceOption[] = mappedVoices.map(
        (voice) => ({
          ...voice,
          isDefault: voice.id === defaultVoiceId,
        }),
      );
      const suggestedVoice =
        voiceOptionsWithDefault.find((voice) => voice.isDefault) ??
        voiceOptionsWithDefault[0];

      if (cancelled) {
        return;
      }

      setVoiceOptions(voiceOptionsWithDefault);
      setBestVoice(suggestedVoice);
      setPreferences((current) => {
        const nextLanguage = current.language || currentLanguage;
        const selectedVoiceStillAvailable = voiceOptionsWithDefault.some(
          (voice) => voice.id === current.voice,
        );

        if (selectedVoiceStillAvailable && nextLanguage === current.language) {
          return current;
        }

        return {
          ...current,
          language: nextLanguage,
          voice: selectedVoiceStillAvailable
            ? current.voice
            : suggestedVoice?.id || "",
        };
      });
    };

    void syncVoiceOptions();

    return () => {
      cancelled = true;
    };
  }, [preferences.language, voiceManager]);

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
    utterance.lang =
      selectedVoiceRef.current?.lang ||
      preferencesRef.current.language ||
      navigator.language ||
      "en-US";

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

    setHistoryItems((current) =>
      [...current, newItem].slice(-MAX_HISTORY_ITEMS),
    );
    setInput("");
    speak(newItem.text, newItem.id);
  };

  return {
    bestVoice,
    currentlyPlaying,
    historyItems,
    input,
    languageOptions,
    preferences,
    queuedIds,
    setInput,
    setPreferences,
    speak,
    submitInput,
    voices: voiceOptions,
  };
}
