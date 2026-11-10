import * as React from "react";
import { cn } from "@/lib/utils";

// AdVault field style (ui/input.tsx there). text-base on phones: iOS zooms
// into any focused field under 16px; AdVault is desktop-first and uses text-sm.
export const fieldClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} ref={ref} className={cn(fieldClass, "h-11", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClass, "min-h-[88px] py-2.5", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(fieldClass, "h-11 appearance-auto pr-8", className)} {...props} />
  ),
);
Select.displayName = "Select";
