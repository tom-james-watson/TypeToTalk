// What earlier phrases taught us about this device, so even a phrase's first
// chunks can be held back the right amount.
const STATS_KEY = "phonon-generation";
// Characters of text per second of audio at speed 1; a typical English pace.
const DEFAULT_CHARS_PER_SECOND = 15;
// Start only when the rest should arrive this much sooner than it is needed.
const MARGIN = 1.15;

interface Stats {
  /** Seconds of audio made per second of work: below 1, playback outruns it. */
  rate: number;
  charsPerSecond: number;
}

function readStats(): Partial<Stats> {
  try {
    const stats = JSON.parse(localStorage.getItem(STATS_KEY) ?? "{}");
    return typeof stats === "object" && stats ? stats : {};
  } catch {
    return {};
  }
}

function saveStats(stats: Stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* Storage is optional. */
  }
}

/**
 * Plays streamed audio without gaps on devices that make it slower than it
 * plays. Chunks are held until the rest of the phrase should arrive before
 * playback reaches it, which on a fast device is at once.
 */
export function createPlaybackBuffer({
  text,
  speed,
  play,
}: {
  text: string;
  speed: number;
  /** Schedules a chunk straight after the previous one. */
  play: (samples: Float32Array) => void;
}) {
  const stats = readStats();
  const charsPerSecond = stats.charsPerSecond ?? DEFAULT_CHARS_PER_SECOND;
  const expected = text.length / (charsPerSecond * speed);
  const startedAt = performance.now();
  const held: Float32Array[] = [];
  let made = 0;
  let chunks = 0;
  let playing = false;

  const release = () => {
    playing = true;
    held.splice(0).forEach(play);
  };

  return {
    push(samples: Float32Array) {
      made += samples.length / 24000;
      chunks++;
      if (playing) {
        play(samples);
        return;
      }
      held.push(samples);
      const seconds = (performance.now() - startedAt) / 1000;
      // This phrase's own pace once it has one; until then, the last phrases'.
      const rate =
        chunks >= 2 || stats.rate == null ? made / seconds : stats.rate;
      if (chunks < 2 && stats.rate == null) return;
      // Making carries on while it plays, so the phrase stays ahead if the
      // rest arrives before playback, which takes the whole phrase, reaches it.
      const remaining = Math.max(expected - made, 0);
      if ((remaining / rate) * MARGIN <= expected) release();
    },
    /** The phrase is fully made: play whatever is held, and learn from it. */
    end() {
      if (!playing) release();
      const seconds = (performance.now() - startedAt) / 1000;
      if (made > 0.5 && seconds > 0) {
        const learn = (previous: number | undefined, next: number) =>
          previous == null ? next : previous + (next - previous) * 0.5;
        saveStats({
          rate: learn(stats.rate, made / seconds),
          charsPerSecond: learn(
            stats.charsPerSecond,
            text.length / (made * speed),
          ),
        });
      }
    },
  };
}
