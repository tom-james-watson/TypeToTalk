import { useEffect, useRef } from "react";
import { ComposerBar } from "./components/composer-bar";
import { HistoryList } from "./components/history-list";
import { useComposerHistoryNavigation } from "./hooks/use-composer-history-navigation";
import { useSpeechSynthesis } from "./hooks/use-speech-synthesis";
import { cn } from "./lib/utils";

function App() {
  const composerDockRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const {
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
    voices,
  } = useSpeechSynthesis();
  const hasHistory = historyItems.length > 0;
  const latestHistoryId =
    historyItems.length > 0 ? historyItems[historyItems.length - 1].id : null;
  const { handleArrowHistoryNavigate, handleInputChange, handleSubmit } =
    useComposerHistoryNavigation({
      historyItems,
      input,
      setInput,
      submitInput,
    });

  useEffect(() => {
    if (!hasHistory) {
      return;
    }

    let frameA = 0;
    let frameB = 0;

    frameA = window.requestAnimationFrame(() => {
      frameB = window.requestAnimationFrame(() => {
        mainRef.current?.scrollTo({
          top: mainRef.current.scrollHeight,
          behavior: "auto",
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(frameA);
      window.cancelAnimationFrame(frameB);
    };
  }, [hasHistory, latestHistoryId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.key.length !== 1 ||
        event.key.trim().length === 0
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (
        target.closest('[role="dialog"]') ||
        target.closest("input, textarea, select, [contenteditable=true]")
      ) {
        return;
      }

      const composerInput =
        composerDockRef.current?.querySelector<HTMLInputElement>("input");

      if (!composerInput) {
        return;
      }

      event.preventDefault();
      composerInput.focus();
      setInput((current) => current + event.key);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setInput]);

  const composer = () => (
    <ComposerBar
      input={input}
      onArrowHistoryNavigate={handleArrowHistoryNavigate}
      onInputChange={handleInputChange}
      onSubmit={handleSubmit}
      bestVoice={bestVoice}
      preferences={preferences}
      setPreferences={setPreferences}
      languageOptions={languageOptions}
      voices={voices}
    />
  );

  return (
    <div
      ref={mainRef}
      className="h-dvh overflow-y-auto bg-background text-foreground"
    >
      <div className="flex min-h-dvh flex-col">
        <main
          className={cn(
            "flex w-full flex-1",
            hasHistory ? "conversation-layout" : "empty-layout",
          )}
        >
          <div className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col px-4 sm:px-6">
            <section
              className={cn(
                "empty-state-shell",
                !hasHistory &&
                  "flex min-h-full flex-1 items-center justify-center",
                hasHistory ? "is-hidden" : "is-visible",
              )}
              aria-hidden={hasHistory}
            >
              <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
                <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                  Type to Talk
                </h1>
                <p className="max-w-lg text-muted-foreground [text-wrap-style:balance]">
                  Built for moments when you&apos;ve lost your voice or can&apos;t
                  speak because of a medical condition.
                </p>
              </div>
            </section>

            <section
              className={cn(
                "conversation-shell",
                hasHistory ? "is-visible" : "is-hidden",
              )}
              aria-hidden={!hasHistory}
            >
              <div className="mx-auto w-full conversation-list-frame">
                {hasHistory ? (
                  <HistoryList
                    currentId={currentlyPlaying}
                    items={historyItems}
                    queuedIds={queuedIds}
                    onTogglePlayback={(item) => speak(item.text, item.id)}
                  />
                ) : null}
              </div>
            </section>
          </div>
        </main>

        {hasHistory ? (
          <div className="pointer-events-none sticky top-0 z-30 -mb-14">
            <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
              <div className="h-14 bg-linear-to-b from-background from-0% to-transparent" />
            </div>
          </div>
        ) : null}

        <div className="composer-dock sticky bottom-0 z-40 mt-auto">
          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            <div className="mx-auto h-34 w-full max-w-xl px-4 sm:px-6">
              <div className="h-full bg-linear-to-t from-background from-35% via-background via-57% to-transparent composer-dock__gradient" />
            </div>
          </div>
          <div
            ref={composerDockRef}
            className="relative mx-auto w-full max-w-xl px-4 pb-4 sm:px-6 sm:pb-6"
          >
            {composer()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
