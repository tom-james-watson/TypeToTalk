// The page's side of the Phonon worker, shaped like the parts of Phonon the
// app uses, so speech is made off the main thread without the app noticing.

export interface WorkerVoice {
  id: string;
  name: string;
  language: string;
}

interface WorkerError {
  name: string;
  message: string;
}

export type WorkerRequest =
  | { type: "load"; model: string }
  | { type: "speak"; id: number; text: string; voice: string; speed: number }
  | { type: "abort"; id: number };

export type WorkerResponse =
  | { type: "progress"; percent: number }
  | { type: "loaded"; voices: WorkerVoice[]; defaultVoice: string }
  | { type: "load-error"; error: WorkerError }
  | { type: "lost" }
  | { type: "audio"; id: number; samples: Float32Array }
  | { type: "done"; id: number; audio: Float32Array }
  | { type: "error"; id: number; error: WorkerError };

interface SpeakOptions {
  voice: string;
  speed: number;
  signal?: AbortSignal;
  onAudio?: (samples: Float32Array) => void;
}

export interface PhononClient {
  voices: readonly WorkerVoice[];
  defaultVoice: string;
  /** Settles when the GPU device is lost: load again to go on. */
  lost: Promise<void>;
  speak(text: string, options: SpeakOptions): Promise<{ audio: Float32Array }>;
}

const toError = ({ name, message }: WorkerError) =>
  Object.assign(new Error(message), { name });

export function loadPhonon({
  model,
  progress,
}: {
  model: string;
  progress?: (percent: number) => void;
}): Promise<PhononClient> {
  const worker = new Worker(new URL("./phonon-worker.ts", import.meta.url), {
    type: "module",
  });
  const post = (message: WorkerRequest) => worker.postMessage(message);
  const speeches = new Map<
    number,
    {
      onAudio?: (samples: Float32Array) => void;
      resolve: (speech: { audio: Float32Array }) => void;
      reject: (error: Error) => void;
    }
  >();
  let nextId = 0;
  let markLost = () => {};
  const lost = new Promise<void>((resolve) => {
    markLost = resolve;
  });

  return new Promise((resolve, reject) => {
    const fail = (error: Error) => {
      worker.terminate();
      reject(error);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      const error = new Error(event.message || "The voice worker failed");
      fail(error);
      speeches.forEach((speech) => speech.reject(error));
      speeches.clear();
      markLost();
    };
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      switch (data.type) {
        case "progress":
          progress?.(data.percent);
          break;
        case "load-error":
          fail(toError(data.error));
          break;
        case "lost":
          worker.terminate();
          markLost();
          break;
        case "audio":
          speeches.get(data.id)?.onAudio?.(data.samples);
          break;
        case "done":
          speeches.get(data.id)?.resolve({ audio: data.audio });
          speeches.delete(data.id);
          break;
        case "error":
          speeches.get(data.id)?.reject(toError(data.error));
          speeches.delete(data.id);
          break;
        case "loaded":
          resolve({
            voices: data.voices,
            defaultVoice: data.defaultVoice,
            lost,
            speak(text, { voice, speed, signal, onAudio }) {
              return new Promise((resolve, reject) => {
                if (signal?.aborted) {
                  reject(new DOMException("Aborted", "AbortError"));
                  return;
                }
                const id = nextId++;
                speeches.set(id, { onAudio, resolve, reject });
                signal?.addEventListener(
                  "abort",
                  () => post({ type: "abort", id }),
                  { once: true },
                );
                post({ type: "speak", id, text, voice, speed });
              });
            },
          });
          break;
      }
    };
    post({ type: "load", model });
  });
}
