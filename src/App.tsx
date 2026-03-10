import { MoreVertical, Settings2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { ComposerBar } from "./components/composer-bar";
import { HistoryActionsMenu } from "./components/history-actions-menu";
import { HistoryList } from "./components/history-list";
import { PreferencesDialog } from "./components/preferences-dialog";
import { Button } from "./components/ui/button";
import { useSpeechSynthesis } from "./hooks/use-speech-synthesis";

function App() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const {
        bestVoice,
        clearHistory,
        currentlyPlaying,
        historyItems,
        input,
        preferences,
        setInput,
        setPreferences,
        speak,
        submitInput,
        voices,
    } = useSpeechSynthesis();

    useEffect(() => {
        const container = scrollContainerRef.current;

        if (!container) {
            return;
        }

        container.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }, [historyItems]);

    const composer = (
        <ComposerBar
            input={input}
            onInputChange={setInput}
            onSubmit={submitInput}
            settingsTrigger={
                <PreferencesDialog
                    bestVoice={bestVoice}
                    preferences={preferences}
                    setPreferences={setPreferences}
                    voices={voices}
                >
                    <Button type="button" variant="outline" size="icon" aria-label="Open preferences">
                        <Settings2 className="h-4 w-4" />
                    </Button>
                </PreferencesDialog>
            }
            menuTrigger={
                <HistoryActionsMenu onClearHistory={clearHistory}>
                    <Button type="button" variant="outline" size="icon" aria-label="Open history actions">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </HistoryActionsMenu>
            }
        />
    );

    return (
        <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
            <div className="md:hidden">
                <div className="sticky top-0 z-20 border-b border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.88)] py-3 backdrop-blur">
                    {composer}
                </div>
                <div ref={scrollContainerRef} className="overflow-auto">
                    <div className="mx-auto w-full max-w-2xl px-4 py-4">
                        <HistoryList
                            currentId={currentlyPlaying}
                            items={historyItems}
                            onTogglePlayback={(item) => speak(item.text, item.id)}
                        />
                    </div>
                </div>
            </div>

            <div className="hidden min-h-screen flex-col md:flex">
                <div
                    ref={scrollContainerRef}
                    className="flex flex-1 items-end overflow-auto"
                >
                    <div className="mx-auto w-full max-w-2xl px-4 py-4">
                        <HistoryList
                            currentId={currentlyPlaying}
                            items={historyItems}
                            reverseOnDesktop
                            onTogglePlayback={(item) => speak(item.text, item.id)}
                        />
                    </div>
                </div>
                <div className="sticky bottom-0 z-20 border-t border-[hsl(var(--border)/0.65)] bg-[hsl(var(--background)/0.88)] py-3 backdrop-blur">
                    {composer}
                </div>
            </div>
        </div>
    );
}

export default App;
