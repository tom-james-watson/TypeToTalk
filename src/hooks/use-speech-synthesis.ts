import type { Phonon } from "phonon-webgpu";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPlaybackBuffer } from "../lib/playback-buffer";

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
  description: string;
  id: string;
  isCharacter: boolean;
  isDefault: boolean;
  label: string;
  language: string;
}

export type PreviewState = {
  voiceId: string;
  status: "generating" | "playing";
} | null;

export const DEFAULT_PREFERENCES: Preferences = {
  language: "en",
  speed: 1,
  voice: "",
};

const LANGUAGES = [
  { code: "en", label: "English", defaultVoice: "Delia" },
  { code: "es", label: "Spanish", defaultVoice: "Marcos" },
  { code: "fr", label: "French", defaultVoice: "Augustin" },
  { code: "de", label: "German", defaultVoice: "Mats" },
  { code: "pt", label: "Portuguese", defaultVoice: "Davi" },
];

export const MAX_HISTORY_ITEMS = 50;

export const SPEED_OPTIONS = [0.8, 0.9, 1, 1.1, 1.2, 1.3];

function readStoredJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeLocale(locale: string) {
  return locale.replace(/_/g, "-").toLowerCase();
}

function getRegionCode(locale: string) {
  const [, region] = normalizeLocale(locale).split("-");

  return region?.length === 2 ? region.toUpperCase() : null;
}

function capitalizeLabel(label: string) {
  if (!label) {
    return label;
  }

  return label.replace(
    /\p{L}[\p{L}\p{M}'-]*/gu,
    (word) => word.charAt(0).toLocaleUpperCase() + word.slice(1),
  );
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
  const label = capitalizeLabel(language.label);

  return flag ? `${flag} ${label}` : label;
}

export function getVoiceLabel(
  voice: Pick<VoiceOption, "label" | "language">,
  options?: { includeFlag?: boolean },
) {
  const flag = options?.includeFlag ? getFlagEmoji(voice.language) : "";

  return flag ? `${flag} ${voice.label}` : voice.label;
}

// Pinned to the same voice assets as the runtime; catalogue discovery needs no GPU.
const VOICE_BASE =
  "https://huggingface.co/gradium/phonon-voices/resolve/0ee17205f254b5abc43b266c8a0f215565c352f7";
let catalogRequest: Promise<VoiceOption[]> | undefined;
function loadVoiceCatalog() {
  catalogRequest ??= fetch(`${VOICE_BASE}/voices.jsonl`)
    .then(async (response) => {
      if (!response.ok) throw new Error("Voice catalogue unavailable");
      return (await response.text())
        .trim()
        .split("\n")
        .map((line) => {
          const voice = JSON.parse(line) as {
            name: string;
            voice_id: string;
            language: string;
            locale: string;
            description?: string;
          };
          return {
            description: voice.description ?? "",
            id: voice.voice_id,
            label: voice.name,
            // Character voices use "characters" as their locale.
            language:
              voice.locale === "characters"
                ? voice.language
                : voice.locale || voice.language,
            isCharacter: voice.locale === "characters",
            isDefault: LANGUAGES.some(
              (language) => language.defaultVoice === voice.name,
            ),
          };
        });
    })
    .catch((error: unknown) => {
      catalogRequest = undefined;
      throw error;
    });
  return catalogRequest;
}

const MODEL = "phonon-40m-multilingual";

const PREVIEW_PHRASES: Record<string, (name: string) => string> = {
  en: (name) => `Hi, I’m ${name}. This is how I sound.`,
  es: (name) => `Hola, soy ${name}. Así es como sueno.`,
  fr: (name) => `Bonjour, je suis ${name}. Voici ma voix.`,
  de: (name) => `Hallo, ich bin ${name}. So klinge ich.`,
  pt: (name) => `Olá, eu sou ${name}. É assim que eu falo.`,
};

/** Whether the model is already in the browser cache, so loading needs no download. */
async function hasCachedModel() {
  try {
    const { MODELS } = await import("phonon-webgpu");
    const cache = await caches.open("phonon-webgpu");
    return !!(await cache.match(MODELS[MODEL].weights));
  } catch {
    return false;
  }
}

async function prepareDefaultVoices(model: Phonon, selectedVoice: string) {
  const cache = await caches.open("phonon-webgpu").catch(() => null);
  await Promise.all(
    model.voices
      .filter(
        (voice) =>
          voice.id === selectedVoice ||
          LANGUAGES.some((language) => language.defaultVoice === voice.name),
      )
      .map(async (voice) => {
        const url = `${VOICE_BASE}/voices/${voice.id}.safetensors`;
        if (await cache?.match(url)) return;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Voice download failed");
        if (cache) await cache.put(url, response).catch(() => {});
        else await response.arrayBuffer();
      }),
  );
}

export function useSpeechSynthesis() {
  const [input, setInput] = useState("");
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [queuedIds, setQueuedIds] = useState<number[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(() => {
    const saved = readStoredJSON("phonon-preferences", DEFAULT_PREFERENCES);
    return {
      language: LANGUAGES.some((language) => language.code === saved.language)
        ? saved.language
        : "en",
      voice: saved.voice,
      speed: SPEED_OPTIONS.includes(saved.speed) ? saved.speed : 1,
    };
  });
  const [voiceCatalog, setVoiceOptions] = useState<VoiceOption[]>([]);
  const [status, setStatus] = useState<{ progress: number | null } | null>({
    progress: null,
  });
  const [isReady, setIsReady] = useState(false);
  const [needsDownload, setNeedsDownload] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const voiceOptions = voiceCatalog.filter(
    (voice) =>
      normalizeLocale(voice.language).split("-")[0] === preferences.language,
  );
  const languageOptions: LanguageOption[] = LANGUAGES.map((language) => ({
    ...language,
    count: voiceCatalog.filter(
      (voice) =>
        normalizeLocale(voice.language).split("-")[0] === language.code,
    ).length,
  }));
  const modelRef = useRef<Promise<Phonon> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const queueRef = useRef<HistoryItem[]>([]);
  const currentIdRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef<Promise<unknown>>(Promise.resolve());
  const mountedRef = useRef(true);
  const [previewing, setPreviewing] = useState<PreviewState>(null);
  const previewRef = useRef<{
    controller: AbortController;
    sources: Set<AudioBufferSourceNode>;
    // Audio-clock span of the scheduled audio; the end grows as chunks stream in.
    start?: number;
    end?: number;
  } | null>(null);
  const previewCacheRef = useRef(new Map<string, Float32Array>());
  const preferencesRef = useRef(preferences);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);
  useEffect(() => {
    try {
      localStorage.setItem("phonon-preferences", JSON.stringify(preferences));
    } catch {
      /* Storage is optional. */
    }
  }, [preferences]);
  useEffect(() => {
    mountedRef.current = true;
    const sources = sourcesRef.current;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      previewRef.current?.controller.abort();
      previewRef.current?.sources.forEach((source) => source.stop());
      sources.forEach((source) => source.stop());
      sources.clear();
      void audioRef.current?.close();
      audioRef.current = null;
    };
  }, []);

  const loadModel = useCallback(() => {
    if (!modelRef.current) {
      setStatus({ progress: null });
      modelRef.current = import("phonon-webgpu")
        .then(({ Phonon }) =>
          Phonon.load({
            model: MODEL,
            progress: (percent) => {
              if (mountedRef.current) setStatus({ progress: percent });
            },
          }),
        )
        .then(async (model) => {
          await prepareDefaultVoices(model, preferencesRef.current.voice);
          if (mountedRef.current) {
            setIsReady(true);
            setStatus(null);
          }
          void model.lost.then(() => {
            modelRef.current = null;
            if (mountedRef.current) {
              setIsReady(false);
              setError("Your voice connection was interrupted. Please retry.");
            }
          });
          return model;
        })
        .catch((reason: unknown) => {
          modelRef.current = null;
          throw reason;
        });
    }
    return modelRef.current;
  }, []);

  const retryPreparation = useCallback(() => {
    setError("");
    void Promise.all([
      loadVoiceCatalog().then((voices) => {
        if (mountedRef.current) setVoiceOptions(voices);
      }),
      loadModel(),
    ]).catch((reason: unknown) => {
      console.error("Voice preparation failed", reason);
      if (mountedRef.current) {
        setStatus(null);
        setError(
          "Couldn’t get your voices ready. Retry or try another browser.",
        );
      }
    });
  }, [loadModel]);

  useEffect(() => {
    void hasCachedModel().then((cached) => {
      if (mountedRef.current) setNeedsDownload(!cached);
    });
    retryPreparation();
  }, [retryPreparation]);

  const playNextInQueue = () => {
    if (currentIdRef.current !== null) return;
    const item = queueRef.current.shift();
    setQueuedIds(queueRef.current.map((queued) => queued.id));
    if (!item) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    currentIdRef.current = item.id;
    setCurrentlyPlaying(item.id);
    setError("");
    const context = audioRef.current!;
    const previous = generationRef.current;
    let nextTime = 0;
    let pending = 0;
    let generated = false;
    const finish = () => {
      if (!mountedRef.current || controller.signal.aborted) return;
      currentIdRef.current = null;
      setCurrentlyPlaying(null);
      playNextInQueue();
    };
    const run = async () => {
      // The model has shared GPU state: wait for cancelled synthesis to settle.
      await previous;
      if (controller.signal.aborted) return;
      const prefs = preferencesRef.current;
      const model = await loadModel();
      if (controller.signal.aborted) return;
      const availableVoices = model.voices.filter(
        (voice) => voice.language === prefs.language,
      );
      const defaultVoice = LANGUAGES.find(
        (language) => language.code === prefs.language,
      )?.defaultVoice;

      const playback = createPlaybackBuffer({
        text: item.text,
        speed: prefs.speed,
        play: (samples) => {
          if (controller.signal.aborted) return;
          const buffer = context.createBuffer(1, samples.length, 24000);
          buffer.getChannelData(0).set(samples);
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
          sourcesRef.current.add(source);
          pending++;
          source.onended = () => {
            source.disconnect();
            sourcesRef.current.delete(source);
            pending--;
            if (generated && pending === 0) finish();
          };
          nextTime = Math.max(nextTime, context.currentTime + 0.02);
          source.start(nextTime);
          nextTime += buffer.duration;
        },
      });

      await model.speak(item.text, {
        voice: availableVoices.some((voice) => voice.id === prefs.voice)
          ? prefs.voice
          : (defaultVoice ?? model.defaultVoice),
        speed: prefs.speed,
        signal: controller.signal,
        onAudio: playback.push,
      });
      if (controller.signal.aborted) return;
      playback.end();
      setStatus(null);
      generated = true;
      if (pending === 0) finish();
    };
    generationRef.current = run().catch((reason: unknown) => {
      if (controller.signal.aborted || !mountedRef.current) return;
      controller.abort();
      sourcesRef.current.forEach((source) => source.stop());
      sourcesRef.current.clear();
      currentIdRef.current = null;
      queueRef.current = [];
      setCurrentlyPlaying(null);
      setQueuedIds([]);
      setStatus(null);
      console.error("Speech playback failed", reason);
      setError(
        "We couldn’t prepare your voice. Try the phrase again, or use another browser if this keeps happening.",
      );
    });
  };

  const stopPreview = useCallback(() => {
    previewRef.current?.controller.abort();
    previewRef.current?.sources.forEach((source) => source.stop());
    previewRef.current = null;
    setPreviewing(null);
  }, []);

  /** How far the playing preview has got, from 0 to 1, or null when none is playing. */
  const getPreviewProgress = useCallback(() => {
    const preview = previewRef.current;
    const context = audioRef.current;
    if (!preview?.start || !preview.end || !context) return null;
    const span = preview.end - preview.start;
    return Math.min(
      Math.max((context.currentTime - preview.start) / span, 0),
      1,
    );
  }, []);

  /** Plays a voice introducing itself, so voices can be compared while choosing. */
  const previewVoice = (voice: VoiceOption) => {
    stopPreview();
    let context: AudioContext;
    try {
      context = audioRef.current ??= new AudioContext();
      void context.resume().catch(() => {});
    } catch {
      return;
    }
    const controller = new AbortController();
    const sources = new Set<AudioBufferSourceNode>();
    const preview: NonNullable<typeof previewRef.current> = {
      controller,
      sources,
    };
    previewRef.current = preview;
    const { language, speed } = preferencesRef.current;
    const key = `${voice.id}|${speed}`;
    let nextTime = 0;
    let pending = 0;
    let generated = false;
    const finish = () => {
      if (!controller.signal.aborted && mountedRef.current) setPreviewing(null);
    };
    const schedule = (samples: Float32Array) => {
      if (controller.signal.aborted) return;
      const buffer = context.createBuffer(1, samples.length, 24000);
      buffer.getChannelData(0).set(samples);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      sources.add(source);
      pending++;
      source.onended = () => {
        source.disconnect();
        sources.delete(source);
        pending--;
        if (generated && pending === 0) finish();
      };
      nextTime = Math.max(nextTime, context.currentTime + 0.02);
      source.start(nextTime);
      preview.start ??= nextTime;
      nextTime += buffer.duration;
      preview.end = nextTime;
      setPreviewing({ voiceId: voice.id, status: "playing" });
    };

    const cached = previewCacheRef.current.get(key);
    if (cached) {
      generated = true;
      schedule(cached);
      return;
    }
    setPreviewing({ voiceId: voice.id, status: "generating" });
    const previous = generationRef.current;
    generationRef.current = (async () => {
      // The model has shared GPU state: wait for other synthesis to settle.
      await previous;
      if (controller.signal.aborted) return;
      const model = await loadModel();
      if (controller.signal.aborted) return;
      const phrase = (PREVIEW_PHRASES[language] ?? PREVIEW_PHRASES.en)(
        voice.label,
      );
      const playback = createPlaybackBuffer({
        text: phrase,
        speed,
        play: schedule,
      });
      const speech = await model.speak(phrase, {
        voice: voice.id,
        speed,
        signal: controller.signal,
        onAudio: playback.push,
      });
      if (controller.signal.aborted) return;
      playback.end();
      previewCacheRef.current.set(key, speech.audio);
      generated = true;
      if (pending === 0) finish();
    })().catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      console.error("Voice preview failed", reason);
      finish();
    });
  };

  const speak = (text: string, id: number) => {
    if (!("gpu" in navigator)) {
      setError(
        "Speech isn’t available in this browser on your device. Please try another browser.",
      );
      return;
    }
    if (currentIdRef.current === id) {
      controllerRef.current?.abort();
      sourcesRef.current.forEach((source) => source.stop());
      sourcesRef.current.clear();
      currentIdRef.current = null;
      setCurrentlyPlaying(null);
      setStatus(null);
      playNextInQueue();
      return;
    }
    if (queueRef.current.some((item) => item.id === id)) {
      queueRef.current = queueRef.current.filter((item) => item.id !== id);
      setQueuedIds(queueRef.current.map((item) => item.id));
      return;
    }
    try {
      audioRef.current ??= new AudioContext();
      // Resume during the user's gesture, before downloading or generating audio.
      void audioRef.current
        .resume()
        .catch(() =>
          setError("Audio could not start. Tap the phrase to retry."),
        );
    } catch {
      setError("Audio playback is unavailable in this browser.");
      return;
    }
    queueRef.current.push({ id, text });
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
    bestVoice: voiceOptions.find((voice) => voice.isDefault) ?? voiceOptions[0],
    status,
    isReady,
    needsDownload,
    retryPreparation,
    error,
    currentlyPlaying,
    historyItems,
    input,
    languageOptions,
    preferences,
    previewing,
    previewVoice,
    getPreviewProgress,
    queuedIds,
    stopPreview,
    setInput,
    setPreferences,
    speak,
    submitInput,
    voices: voiceOptions,
  };
}
