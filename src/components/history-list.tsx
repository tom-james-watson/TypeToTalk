import {
    MAX_HISTORY_ITEMS,
    type HistoryItem as HistoryItemModel,
} from "../hooks/use-speech-synthesis";
import { HistoryItem } from "./history-item";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./ui/empty";

interface HistoryListProps {
    currentId: number | null;
    items: HistoryItemModel[];
    queuedIds: number[];
    onTogglePlayback: (item: HistoryItemModel) => void;
}

export function HistoryList({
    currentId,
    items,
    queuedIds,
    onTogglePlayback,
}: HistoryListProps) {
    const isTruncated = items.length >= MAX_HISTORY_ITEMS;

    if (items.length === 0) {
        return (
            <Empty className="border-0 py-8">
                <EmptyHeader>
                    <EmptyTitle>Nothing yet</EmptyTitle>
                    <EmptyDescription>
                        Type something and press Enter.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className="mx-auto flex w-full flex-col">
            {isTruncated ? (
                <p className="mb-3 self-center rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
                    Showing the latest {MAX_HISTORY_ITEMS} phrases. Older
                    history is removed automatically.
                </p>
            ) : null}
            {items.map((item) => (
                <div key={item.id}>
                    <HistoryItem
                        text={item.text}
                        isPlaying={currentId === item.id}
                        isQueued={queuedIds.includes(item.id)}
                        onToggle={() => onTogglePlayback(item)}
                    />
                </div>
            ))}
        </div>
    );
}
