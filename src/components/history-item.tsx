import { Play, Square } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface HistoryItemProps {
    isPlaying: boolean;
    text: string;
    onToggle: () => void;
}

export function HistoryItem({ isPlaying, text, onToggle }: HistoryItemProps) {
    return (
        <article className="animate-history-in relative rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 pr-12 text-[hsl(var(--card-foreground))] shadow-sm">
            <div className="break-words pr-2 text-sm leading-6">{text}</div>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                    "absolute right-2 top-2 h-8 w-8 rounded-md text-[hsl(var(--muted-foreground))]",
                    isPlaying && "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
                )}
                onClick={onToggle}
                aria-label={isPlaying ? "Stop playback" : "Play phrase"}
                aria-pressed={isPlaying}
            >
                <span className="relative h-4 w-4">
                    <Play
                        className={cn(
                            "absolute inset-0 h-4 w-4 transition-all duration-150",
                            isPlaying ? "scale-75 opacity-0" : "scale-100 opacity-100",
                        )}
                    />
                    <Square
                        className={cn(
                            "absolute inset-0 h-4 w-4 transition-all duration-150",
                            isPlaying ? "scale-100 opacity-100" : "scale-75 opacity-0",
                        )}
                    />
                </span>
            </Button>
        </article>
    );
}
