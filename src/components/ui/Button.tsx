import { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "whatsapp";
type Size = "sm" | "md" | "lg";

interface BaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

type ButtonAsAnchor = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[#1B2D72] text-white hover:bg-[#101D50] font-semibold shadow-lg shadow-[#1B2D72]/20",
  secondary:
    "border-2 border-[#1B2D72] text-[#1B2D72] hover:bg-[#EEF2FF] font-semibold",
  whatsapp:
    "bg-[#128C54] text-white hover:bg-[#0e7040] font-semibold shadow-lg shadow-[#128C54]/20",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-4 py-2 text-sm min-h-[40px]",
  md: "px-6 py-3 text-base min-h-[48px]",
  lg: "px-8 py-4 text-lg min-h-[56px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#1B2D72] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const combinedClasses = `${baseClasses} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if ("href" in props && props.href !== undefined) {
    const { href, ...anchorProps } = props as ButtonAsAnchor;
    return (
      <a href={href} className={combinedClasses} {...anchorProps}>
        {children}
      </a>
    );
  }

  const buttonProps = props as ButtonAsButton;
  return (
    <button className={combinedClasses} {...buttonProps}>
      {children}
    </button>
  );
}
