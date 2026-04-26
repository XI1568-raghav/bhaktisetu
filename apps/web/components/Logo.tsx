interface LogoProps {
 size?: number;
 className?: string;
 color?: string;
}

/**
 * Darshya brand logo — a stylized shikhara (temple peak) silhouette enclosing
 * a diya/flame. The shikhara frames the "darshan" (divine sight); the flame
 * inside is what you come to see.
 * Works from 16px favicon to full display size. Single color.
 */
export function Logo({ size = 28, className = "", color = "#EA580C" }: LogoProps) {
 return (
 <svg
 width={size}
 height={size}
 viewBox="0 0 48 48"
 fill="none"
 xmlns="http://www.w3.org/2000/svg"
 className={className}
 aria-label="Darshya logo"
 >
 {/* Outer shikhara arch — temple silhouette */}
 <path
 d="M24 4 L36 18 L36 40 L12 40 L12 18 Z"
 fill={color}
 opacity="0.08"
 />
 <path
 d="M24 4 L36 18 L36 40 L12 40 L12 18 Z"
 stroke={color}
 strokeWidth="2"
 strokeLinejoin="round"
 fill="none"
 />
 {/* Inner gateway arch */}
 <path
 d="M18 40 L18 28 C18 24.5 20.7 22 24 22 C27.3 22 30 24.5 30 28 L30 40"
 stroke={color}
 strokeWidth="1.8"
 strokeLinejoin="round"
 fill="none"
 />
 {/* Diya base */}
 <ellipse cx="24" cy="16" rx="3.2" ry="1.1" fill="#D4A438" />
 <path
 d="M21.5 16 C21.5 14.3 22.6 13 24 13 C25.4 13 26.5 14.3 26.5 16"
 fill="#D4A438"
 />
 {/* Flame */}
 <path
 d="M24 8 C24 8 26.2 11 26.2 12.4 C26.2 13.8 25.2 14.2 24 14.2 C22.8 14.2 21.8 13.8 21.8 12.4 C21.8 11 24 8 24 8 Z"
 fill="#F59E0B"
 />
 {/* Flame inner highlight */}
 <path
 d="M24 10 C24 10 25.1 11.5 25.1 12.4 C25.1 13.1 24.6 13.3 24 13.3 C23.4 13.3 22.9 13.1 22.9 12.4 C22.9 11.5 24 10 24 10 Z"
 fill="#FDE68A"
 />
 </svg>
 );
}

export function LogoWithText({
 size = 28,
 className = "",
 color = "#EA580C",
}: LogoProps) {
 return (
 <span className={`inline-flex items-center gap-2 ${className}`}>
 <Logo size={size} color={color} />
 <span className="text-[15px] font-semibold text-surface-800 tracking-tight">
 Darsh<span className="text-saffron-600">ya</span>
 </span>
 </span>
 );
}
