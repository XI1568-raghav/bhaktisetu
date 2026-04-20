import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../index.js";

// ──────────────────────────────────────────────
// @poojly/ui — Button Component
// ──────────────────────────────────────────────

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-lg font-medium",
    "transition-colors duration-200 ease-in-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "select-none",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-saffron-500 text-white",
          "hover:bg-saffron-600",
          "active:bg-saffron-700",
          "focus-visible:ring-saffron-500",
          "shadow-sm hover:shadow-md",
        ],
        secondary: [
          "bg-stone-100 text-stone-800",
          "hover:bg-stone-200",
          "active:bg-stone-300",
          "focus-visible:ring-stone-400",
          "border border-stone-200",
        ],
        ghost: [
          "text-stone-700",
          "hover:bg-stone-100",
          "active:bg-stone-200",
          "focus-visible:ring-stone-400",
        ],
        destructive: [
          "bg-red-600 text-white",
          "hover:bg-red-700",
          "active:bg-red-800",
          "focus-visible:ring-red-500",
          "shadow-sm",
        ],
        outline: [
          "border-2 border-saffron-500 text-saffron-600",
          "hover:bg-saffron-50",
          "active:bg-saffron-100",
          "focus-visible:ring-saffron-500",
        ],
        link: [
          "text-saffron-600 underline-offset-4",
          "hover:underline",
          "active:text-saffron-800",
          "focus-visible:ring-saffron-500",
          "p-0 h-auto",
        ],
      },
      size: {
        sm: "h-8 px-3 text-sm rounded-md",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-10 w-10",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show a loading spinner and disable the button */
  isLoading?: boolean;
  /** Icon element to render before the label */
  leftIcon?: React.ReactNode;
  /** Icon element to render after the label */
  rightIcon?: React.ReactNode;
  /** Render as a child component (e.g., for wrapping with Link) */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
