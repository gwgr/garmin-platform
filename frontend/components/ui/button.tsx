"use client";

import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/ui";

type ButtonVariant = "default" | "outline" | "link";
type ButtonSize = "default" | "sm";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "border-transparent bg-[var(--accent)] text-[#f7f7f2] hover:brightness-[1.03]",
  outline:
    "border-[color:var(--line)] bg-white/45 text-[var(--text)] hover:bg-white/65",
  link: "border-transparent bg-transparent px-0 text-[var(--accent)] hover:underline",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-11 px-4 text-sm",
  sm: "min-h-9 px-3 text-[0.82rem]",
};

export function Button({
  asChild = false,
  className,
  size = "default",
  variant = "default",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-bold transition disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
