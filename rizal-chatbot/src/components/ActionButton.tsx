export enum ButtonVariant {
  Filled,
  Outlined,
}

export enum ButonSize {
  Stretched,
  Compact,
}

interface ActionButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButonSize;
  color?: string;
  onClick: () => void;
}

export default function ActionButton({
  label,
  variant = ButtonVariant.Filled,
  size = ButonSize.Stretched,
  color = "blue",
  onClick,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{ borderColor: `var(--color-${color})` }}
      className={`
        p-2
        text-lg font-pica
        rounded-lg border-2
        transition-all
        hover:cursor-pointer
        ${variant === ButtonVariant.Outlined ? `text-${color}` : `text-white`}
        ${variant === ButtonVariant.Filled ? `bg-${color}` : `bg-transparent`}
        ${variant === ButtonVariant.Filled ? `hover:opacity-80` : `hover:bg-blue hover:text-white`}
        ${size === ButonSize.Stretched ? "w-full" : "w-fit"}
      `}
    >
      {label}
    </button>
  );
}
