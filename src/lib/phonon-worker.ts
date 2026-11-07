/// <reference lib="webworker" />
// Runs Phonon off the main thread: making speech keeps the GPU's command
// queue fed from script, which would otherwise stall typing and animation.
import { Phonon, type ModelId } from "phonon-webgpu";
import type { WorkerRequest, WorkerResponse } from "./phonon-client";

declare const self: DedicatedWorkerGlobalScope;

let model: Phonon | null = null;
const speeches = new Map<number, AbortController>();

const post = (message: WorkerResponse, transfer: Transferable[] = []) =>
  self.postMessage(message, transfer);

const describe = (error: unknown) => ({
  name: error instanceof Error ? error.name : "Error",
  message: error instanceof Error ? error.message : String(error),
});

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type === "load") {
    try {
      model = await Phonon.load({
        model: data.model as ModelId,
        progress: (percent) => post({ type: "progress", percent }),
      });
      void model.lost.then(() => post({ type: "lost" }));
      post({
        type: "loaded",
        voices: model.voices.map(({ id, name, language }) => ({
          id,
          name,
          language,
        })),
        defaultVoice: model.defaultVoice,
      });
    } catch (error) {
      post({ type: "load-error", error: describe(error) });
    }
  } else if (data.type === "speak") {
    const controller = new AbortController();
    speeches.set(data.id, controller);
    try {
      if (!model) throw new Error("The model isn't loaded");
      const speech = await model.speak(data.text, {
        voice: data.voice,
        speed: data.speed,
        signal: controller.signal,
        onAudio: (samples) => {
          // A copy, so handing it over can't detach memory Phonon still uses.
          const chunk = samples.slice();
          post({ type: "audio", id: data.id, samples: chunk }, [chunk.buffer]);
        },
      });
      const audio = speech.audio.slice();
      post({ type: "done", id: data.id, audio }, [audio.buffer]);
    } catch (error) {
      post({ type: "error", id: data.id, error: describe(error) });
    } finally {
      speeches.delete(data.id);
    }
  } else if (data.type === "abort") {
    speeches.get(data.id)?.abort();
  }
};
