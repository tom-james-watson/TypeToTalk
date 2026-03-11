import { Ellipsis, Play, Square } from "lucide-react";
import { Button } from "./ui/button";

interface HistoryItemProps {
    isPlaying: boolean;
    isQueued: boolean;
    text: string;
    onToggle: () => void;
}

export function HistoryItem({
    isPlaying,
    isQueued,
    text,
    onToggle,
}: HistoryItemProps) {
    return (
        <article className="animate-history-in flex items-center gap-4 py-4 transition-colors pr-2 pl-4">
            <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-6 font-normal tracking-[-0.01em] text-foreground">
                    {text}
                </p>
            </div>
            <div className="flex w-9 shrink-0 justify-end pr-1">
                <Button
                    type="button"
                    variant={isPlaying || isQueued ? "secondary" : "ghost"}
                    size="icon"
                    className="rounded-full"
                    onClick={onToggle}
                    aria-label={
                        isPlaying
                            ? "Stop playback"
                            : isQueued
                              ? "Remove phrase from queue"
                              : "Queue phrase"
                    }
                    aria-pressed={isPlaying || isQueued}
                >
                    {isPlaying ? (
                        <Square />
                    ) : isQueued ? (
                        <Ellipsis />
                    ) : (
                        <Play />
                    )}
                </Button>
            </div>
        </article>
    );
}
