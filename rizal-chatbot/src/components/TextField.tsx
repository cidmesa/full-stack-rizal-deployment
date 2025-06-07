import { Eye, EyeClosed } from "lucide-react";
import React, { useState } from "react";

interface TextFieldProps {
  placeholder: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
  error?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function TextField({
  placeholder,
  value,
  type = "text",
  onChange,
  error,
  onKeyDown,
}: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div
      className="
        flex flex-col
        relative gap-1
      "
    >
      <input
        type={isPassword ? (showPassword ? "text" : "password") : type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={`
          w-full
          p-3
          text-lg font-pica text-blue
          bg-white
          border-0 rounded-lg
          transition-all
          placeholder:text-gray-400 focus:outline-none focus:ring-3 focus:ring-blue duration-200
          ${error ? "ring-3 ring-red" : ""}
        `}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="
            text-blue font-pica
            absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-80
          "
        >
          {showPassword ? <Eye /> : <EyeClosed />}
        </button>
      )}
      {error && (
        <p
          className="
            text-red text-sm font-pica
          "
        >
          {error}
        </p>
      )}
    </div>
  );
}
