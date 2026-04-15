import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../index.js";

// ──────────────────────────────────────────────
// @bhaktisetu/ui — Badge Component
// ──────────────────────────────────────────────

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1",
    "rounded-full font-medium",
    "transition-colors duration-150",
    "whitespace-nowrap select-none",
  ],
  {
    variants: {
      variant: {
        default: "bg-stone-100 text-stone-700 border border-stone-200",
        saffron: "bg-saffron-100 text-saffron-800 border border-saffron-200",
        success: "bg-green-100 text-green-800 border border-green-200",
        warning: "bg-amber-100 text-amber-800 border border-amber-200",
        error: "bg-red-100 text-red-800 border border-red-200",
        info: "bg-blue-100 text-blue-800 border border-blue-200",
        purple: "bg-purple-100 text-purple-800 border border-purple-200",
        gold: "bg-yellow-100 text-yellow-800 border border-yellow-200",

        // Booking status specific
        pending: "bg-amber-100 text-amber-800 border border-amber-200",
        confirmed: "bg-blue-100 text-blue-800 border border-blue-200",
        priestAssigned:
          "bg-purple-100 text-purple-800 border border-purple-200",
        inProgress: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        completed: "bg-green-100 text-green-800 border border-green-200",
        cancelled: "bg-red-100 text-red-700 border border-red-200",
        refunded: "bg-stone-100 text-stone-600 border border-stone-200",
        failed: "bg-red-200 text-red-900 border border-red-300",

        // Outline variants
        outline: "border border-stone-300 text-stone-700 bg-transparent",
        outlineSaffron:
          "border border-saffron-400 text-saffron-700 bg-transparent",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

/**
 * Map a BookingStatus enum value to a badge variant.
 */
const bookingStatusVariantMap: Record<string, BadgeVariant> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PRIEST_ASSIGNED: "priestAssigned",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  FAILED: "failed",
};

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Show a small dot indicator before the label */
  dot?: boolean;
  /** Automatically map a BookingStatus value to the correct variant */
  bookingStatus?: string;
  /** Optional icon to display before the label */
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant, size, dot, bookingStatus, icon, children, ...props },
    ref
  ) => {
    const resolvedVariant = bookingStatus
      ? bookingStatusVariantMap[bookingStatus] ?? "default"
      : variant;

    return (
      <span
        ref={ref}
        className={cn(
          badgeVariants({ variant: resolvedVariant, size, className })
        )}
        {...props}
      >
        {dot && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
            aria-hidden="true"
          />
        )}
        {icon}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants, bookingStatusVariantMap };
