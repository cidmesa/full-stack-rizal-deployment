import { Send, X } from "lucide-react";

interface TextFieldProps {
  placeholder: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
  isEditing?: boolean;
  onCancel?: () => void;
}
export default function ChatInput({
  placeholder,
  value,
  type = "text",
  onChange,
  onClick,
  onKeyDown,
  disabled,
  isEditing = false,
  onCancel,
}: TextFieldProps) {
  return (
    <div
      style={{ backgroundColor: "var(--color-sand)" }}
      className="
        flex flex-row
        p-5
        border-0 rounded-lg
        relative gap-1
      "
    >
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={`
          w-full
          text-lg font-pica text-brown
          transition-all
          placeholder:text-brown placeholder:opacity-60 focus:outline-none focus:ring-0
        `}
      />

      <div className="flex gap-2">
        {isEditing && onCancel && (
          <button
            onClick={onCancel}
            className="
              cursor-pointer
              p-1
            "
            title="Cancel edit"
          >
            <X size={20} color="var(--color-brown)" />
          </button>
        )}
        
        <button
          disabled={disabled}
          onClick={onClick}
          className="
            cursor-pointer
          "
          title={isEditing ? "Save changes" : "Send message"}
        >
          <Send size={20} color="var(--color-brown)" />
        </button>
      </div>
    </div>
  );
}
