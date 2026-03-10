import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface HistoryActionsMenuProps {
    children: React.ReactNode;
    onClearHistory: () => void;
}

export function HistoryActionsMenu({
    children,
    onClearHistory,
}: HistoryActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" sideOffset={8}>
                <DropdownMenuItem onClick={onClearHistory}>
                    Clear history
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
