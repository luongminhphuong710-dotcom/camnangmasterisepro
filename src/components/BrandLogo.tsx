type BrandLogoProps = {
  variant?: "light" | "dark";
  className?: string;
};

export function BrandLogo({ variant = "light", className = "" }: BrandLogoProps) {
  const isDarkSurface = variant === "dark";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/camnangmasterise-logo.png"
      alt="camnangmasterise"
      className={`brand-wordmark brand-wordmark-${variant} ${className}`}
      style={isDarkSurface ? { filter: "brightness(0) invert(1)" } : undefined}
    />
  );
}