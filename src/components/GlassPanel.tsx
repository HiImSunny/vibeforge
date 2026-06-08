import type { CSSProperties, ReactNode } from "react";

interface GlassPanelProps {
  /** Glass transparency level: low (55%), medium (72%), high (88%) */
  intensity?: "low" | "medium" | "high";
  /** Show subtle 1px border (default true) */
  border?: boolean;
  /** Add amber glow border effect */
  amberGlow?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Panel content */
  children: ReactNode;
}

/**
 * GlassPanel - Midnight Forge reusable glassmorphism panel.
 *
 * Renders a container with backdrop-filter blur, semi-transparent
 * background, and optional amber glow. Respects reduced-motion and
 * provides an opaque fallback when backdrop-filter is unavailable
 * (via the @supports rule in App.css).
 */
export default function GlassPanel({
  intensity = "medium",
  border = true,
  amberGlow = false,
  className,
  style,
  children,
}: GlassPanelProps) {
  const classNames = [
    "glass-panel",
    `intensity-${intensity}`,
    !border ? "no-border" : "",
    amberGlow ? "amber-glow" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} style={style}>
      {children}
    </div>
  );
}