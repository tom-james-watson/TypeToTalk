import type { HistoryItem as HistoryItemModel } from "../hooks/use-speech-synthesis";
import { HistoryItem } from "./history-item";

interface HistoryListProps {
    currentId: number | null;
    items: HistoryItemModel[];
    reverseOnDesktop?: boolean;
    onTogglePlayback: (item: HistoryItemModel) => void;
}

export function HistoryList({
    currentId,
    items,
    reverseOnDesktop = false,
    onTogglePlayback,
}: HistoryListProps) {
    if (items.length === 0) {
        return (
            <div className="py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                Nothing yet. Type something and press Enter.
            </div>
        );
    }

    return (
        <div
            className={`flex flex-col gap-2 pb-4 ${
                reverseOnDesktop ? "md:flex-col-reverse" : ""
            }`}
        >
            {items.map((item) => (
                <HistoryItem
                    key={item.id}
                    text={item.text}
                    isPlaying={currentId === item.id}
                    onToggle={() => onTogglePlayback(item)}
                />
            ))}
        </div>
    );
}
