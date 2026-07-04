import Image from "next/image";

type PigeonLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function PigeonLogo({ size = 32, className = "", priority = false }: PigeonLogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt="Pigeon Box"
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
