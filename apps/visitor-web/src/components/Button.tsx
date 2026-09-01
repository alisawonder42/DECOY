import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "ghost";
};

export function Button({ children, variant = "primary", className, ...props }: Props) {
  const classes = ["btn", variant === "ghost" ? "btn-ghost" : "btn-primary", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
