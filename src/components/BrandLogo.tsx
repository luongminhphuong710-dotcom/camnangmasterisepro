type BrandLogoProps = {
  variant?: "light" | "dark";
  className?: string;
  src?: string;
};

const defaultLogoSrc = "/brand/camnangmasterise-logo.png";

export function BrandLogo({ variant = "light", className = "", src }: BrandLogoProps) {
  const logoSrc = src?.trim() || defaultLogoSrc;
  const isDefaultLogo = logoSrc === defaultLogoSrc;
  const isDarkSurface = variant === "dark";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoSrc}
      alt="camnangmasterise"
      className={`brand-wordmark brand-wordmark-${variant} ${className}`}
      style={isDefaultLogo && isDarkSurface ? { filter: "brightness(0) invert(1)" } : undefined}
    />
  );
}