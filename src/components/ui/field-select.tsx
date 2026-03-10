import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function FieldSelect({
    className,
    children,
    ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="relative">
            <select
                className={cn(
                    "flex h-10 w-full appearance-none rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 pr-9 text-sm text-[hsl(var(--foreground))] shadow-sm transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--popover))] disabled:cursor-not-allowed disabled:opacity-50",
                    className,
                )}
                {...props}
            >
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        </div>
    );
}
