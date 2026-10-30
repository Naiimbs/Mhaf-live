import Image from "next/image";

type BrandLogoSize = "compact" | "small" | "medium" | "large" | "xl";

const logoSizes: Record<BrandLogoSize, { className: string; width: number; height: number }> = {
  compact: { className: "h-6 w-[68px]", width: 136, height: 48 },
  small: { className: "h-8 w-[91px]", width: 182, height: 64 },
  medium: { className: "h-10 w-[114px]", width: 228, height: 80 },
  large: { className: "h-12 w-[136px]", width: 272, height: 96 },
  xl: { className: "h-16 w-[182px]", width: 364, height: 128 },
};

interface BrandLogoProps {
  size?: BrandLogoSize;
  className?: string;
  priority?: boolean;
  variant?: "default" | "white";
}

export function BrandLogo({
  size = "medium",
  className = "",
  priority = false,
  variant = "default",
}: BrandLogoProps) {
  const dimensions = logoSizes[size];
  const src = variant === "white" ? "/meet-logo-white.png" : "/meet-logo.png";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center select-none ${dimensions.className} ${className}`}
    >
      <Image
        src={src}
        alt="mhaf meet"
        width={dimensions.width}
        height={dimensions.height}
        className="h-full w-full object-contain"
        priority={priority}
      />
    </span>
  );
}

