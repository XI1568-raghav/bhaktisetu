interface LogoProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Poojly brand logo — a minimal diya (sacred oil lamp) with flame.
 * Works from 16px favicon to full display size.
 * Clean linework, no gradients, single color.
 */
export function Logo({ size = 28, className = "", color = "#C8611A" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Poojly logo"
    >
      {/* Flame — teardrop shape */}
      <path
        d="M32 6C32 6 24 18 24 24c0 4.418 3.582 8 8 8s8-3.582 8-8c0-6-8-18-8-18z"
        fill={color}
      />
      {/* Inner flame glow */}
      <path
        d="M32 14c0 0-4 6-4 9c0 2.21 1.79 4 4 4s4-1.79 4-4c0-3-4-9-4-9z"
        fill="#FEFCF9"
      />
      {/* Diya bowl — smooth curved vessel */}
      <path
        d="M18 36c0 0 2 10 14 10s14-10 14-10H18z"
        fill={color}
      />
      {/* Diya rim — horizontal oval */}
      <ellipse
        cx="32"
        cy="36"
        rx="16"
        ry="3.5"
        fill={color}
      />
      {/* Diya base — small pedestal */}
      <path
        d="M26 46h12l-2 6H28l-2-6z"
        fill={color}
      />
      {/* Base plate */}
      <ellipse
        cx="32"
        cy="53"
        rx="8"
        ry="2"
        fill={color}
      />
    </svg>
  );
}

export function LogoWithText({
  size = 28,
  className = "",
  color = "#C8611A",
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Logo size={size} color={color} />
      <span className="text-[15px] font-semibold text-surface-800 tracking-tight">
        Pooj<span className="text-saffron-600">ly</span>
      </span>
    </span>
  );
}
