import { MoreVertical } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

interface HistoryActionsMenuProps {
    onClearHistory: () => void;
}

export function HistoryActionsMenu({ onClearHistory }: HistoryActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Open history actions">
                        <MoreVertical />
                    </Button>
                }
            />
            <DropdownMenuContent align="end" side="top" sideOffset={8}>
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={onClearHistory}>
                        Clear history
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
