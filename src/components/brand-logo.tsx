import Image from "next/image";

type BrandLogoSize = "compact" | "small" | "medium" | "large";

const logoSizes: Record<BrandLogoSize, { className: string; width: number; height: number }> = {
  compact: { className: "h-[30px] w-20 p-0.5", width: 160, height: 60 },
  small: { className: "h-8 w-[86px] p-0.5", width: 172, height: 64 },
  medium: { className: "h-10 w-[108px] p-0.5", width: 216, height: 80 },
  large: { className: "h-[50px] w-[134px] p-1", width: 268, height: 100 },
};

interface BrandLogoProps {
  size?: BrandLogoSize;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ size = "medium", className = "", priority = false }: BrandLogoProps) {
  const dimensions = logoSizes[size];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${dimensions.className} ${className}`}
    >
      <Image
        src="/meet-logo.png"
        alt="meet"
        width={dimensions.width}
        height={dimensions.height}
        className="h-full w-full object-contain"
        priority={priority}
      />
    </span>
  );
}
