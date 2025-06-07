import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export enum ButtonVariant {
  Filled,
  Outlined,
}

export enum ButonSize {
  Stretched,
  Compact,
}

interface ActionButtonProps {
  label: ReactNode;
  variant?: ButtonVariant;
  size?: ButonSize;
  color?: string;
  onClick: () => void;
  icon?: LucideIcon;
}

export default function ActionButton({
  label,
  variant = ButtonVariant.Filled,
  size = ButonSize.Stretched,
  color = "blue",
  onClick,
  icon: Icon,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        borderColor: `var(--color-${color})`,
      }}
      className={`
        flex
        p-2
        text-lg font-pica
        rounded-lg border-2
        transition-all
        hover:cursor-pointer items-center justify-center gap-2
        ${variant === ButtonVariant.Outlined ? `text-${color}` : `text-white`}
        ${variant === ButtonVariant.Filled ? `bg-${color}` : `bg-transparent`}
        ${variant === ButtonVariant.Filled ? `hover:opacity-80` : `hover:bg-${color} hover:text-white`}
        ${size === ButonSize.Stretched ? "w-full" : "w-fit"}
      `}
    >
      {Icon && <Icon size={20} />}
      {label}
    </button>
  );
}
