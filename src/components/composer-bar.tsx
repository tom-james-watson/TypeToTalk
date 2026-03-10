import { MoreVertical, Settings2 } from "lucide-react";
import { useId } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ComposerBarProps {
    input: string;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
    settingsTrigger: React.ReactNode;
    menuTrigger: React.ReactNode;
}

export function ComposerBar({
    input,
    onInputChange,
    onSubmit,
    settingsTrigger,
    menuTrigger,
}: ComposerBarProps) {
    const inputId = useId();

    return (
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4">
            <form
                className="flex-1"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit();
                }}
            >
                <label className="sr-only" htmlFor={inputId}>
                    Phrase to speak
                </label>
                <Input
                    id={inputId}
                    value={input}
                    onChange={(event) => onInputChange(event.target.value)}
                    placeholder="Type something and press Enter..."
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11"
                />
            </form>

            {settingsTrigger}
            {menuTrigger}
        </div>
    );
}
