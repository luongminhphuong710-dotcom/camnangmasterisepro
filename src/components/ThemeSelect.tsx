"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Option = {
  value: string;
  label: string;
};

type ThemeSelectProps = {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
};

export function ThemeSelect({ label, value, options, onChange }: ThemeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div className="theme-select" ref={rootRef}>
      <button
        className="theme-select-button"
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
      >
        <span>{current?.label}</span>
        <ChevronDown size={18} aria-hidden className={isOpen ? "rotate-180 transition" : "transition"} />
      </button>
      <div className={`theme-select-menu ${isOpen ? "open" : ""}`} role="listbox">
        {options.map((option) => (
          <button
            key={option.value}
            className={`theme-select-option ${option.value === value ? "active" : ""}`}
            type="button"
            role="option"
            aria-selected={option.value === value}
            onClick={() => {
              onChange(option.value);
              setIsOpen(false);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
