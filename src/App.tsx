import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react";
import { ComposerBar } from "./components/composer-bar";
import { HistoryList } from "./components/history-list";
import { useSpeechSynthesis } from "./hooks/use-speech-synthesis";
import { cn } from "./lib/utils";

function App() {
    const composerDockRef = useRef<HTMLDivElement>(null);
    const {
        bestVoice,
        clearHistory,
        currentlyPlaying,
        historyItems,
        input,
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
        historyItems.length > 0
            ? historyItems[historyItems.length - 1].id
            : null;
    const [composerFootprint, setComposerFootprint] = useState(0);

    useLayoutEffect(() => {
        const dock = composerDockRef.current;

        if (!dock) {
            return;
        }

        const updateComposerFootprint = () => {
            setComposerFootprint(
                Math.ceil(dock.getBoundingClientRect().height),
            );
        };

        updateComposerFootprint();

        const observer = new ResizeObserver(() => {
            updateComposerFootprint();
        });

        observer.observe(dock);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!hasHistory) {
            return;
        }

        let frameA = 0;
        let frameB = 0;

        frameA = window.requestAnimationFrame(() => {
            frameB = window.requestAnimationFrame(() => {
                const scrollingElement =
                    document.scrollingElement ?? document.documentElement;

                window.scrollTo({
                    top: scrollingElement.scrollHeight,
                    behavior: "auto",
                });
            });
        });

        return () => {
            window.cancelAnimationFrame(frameA);
            window.cancelAnimationFrame(frameB);
        };
    }, [composerFootprint, hasHistory, latestHistoryId]);

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
                target.closest(
                    "input, textarea, select, [contenteditable=true]",
                )
            ) {
                return;
            }

            const composerInput =
                composerDockRef.current?.querySelector<HTMLInputElement>(
                    "input",
                );

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
            onInputChange={setInput}
            onSubmit={submitInput}
            onClearHistory={clearHistory}
            bestVoice={bestVoice}
            preferences={preferences}
            setPreferences={setPreferences}
            voices={voices}
        />
    );

    return (
        <div
            className={cn(
                "bg-background text-foreground",
                hasHistory ? "min-h-screen" : "h-dvh overflow-hidden",
            )}
            style={
                {
                    "--composer-footprint": `${composerFootprint}px`,
                } as CSSProperties
            }
        >
            <main
                className={cn(
                    "mx-auto w-full max-w-xl px-4 sm:px-6",
                    hasHistory ? "conversation-layout" : "h-dvh",
                    !hasHistory && "h-dvh",
                )}
            >
                <section
                    className={cn(
                        "empty-state-shell",
                        !hasHistory && "flex items-center justify-center",
                        hasHistory ? "is-hidden" : "is-visible",
                    )}
                    aria-hidden={hasHistory}
                    style={
                        !hasHistory
                            ? {
                                  minHeight:
                                      "calc(100dvh - var(--composer-footprint, 0px))",
                              }
                            : undefined
                    }
                >
                    <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
                        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                            Type to Talk
                        </h1>
                        <p className="max-w-lg text-muted-foreground [text-wrap-style:balance]">
                            Built for moments when you&apos;ve lost your voice
                            or can&apos;t speak because of a medical condition.
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
                                onTogglePlayback={(item) =>
                                    speak(item.text, item.id)
                                }
                            />
                        ) : null}
                    </div>
                </section>
            </main>

            {hasHistory ? (
                <div className="pointer-events-none fixed inset-x-0 top-0 z-30">
                    <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
                        <div className="h-20 bg-linear-to-b from-background from-0% to-transparent" />
                    </div>
                </div>
            ) : null}

            <div className="composer-dock fixed inset-x-0 bottom-0 z-40">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-34 bg-linear-to-t from-background from-35% via-background via-57% to-transparent composer-dock__gradient" />
                <div
                    ref={composerDockRef}
                    className="relative mx-auto w-full max-w-xl px-4 pb-4 sm:px-6 sm:pb-6"
                >
                    {composer()}
                </div>
            </div>
        </div>
    );
}

export default App;
