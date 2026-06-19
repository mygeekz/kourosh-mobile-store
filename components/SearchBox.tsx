import React from "react";
import TextField from "./ui/TextField";

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  preview?: string;
  className?: string;
};

export default function SearchBox({ value, onChange, preview, className }: SearchBoxProps) {
  return (
    <TextField
      type="search"
      inputMode="search"
      enterKeyHint="search"
      dir="rtl"
      value={value}
      preview={preview || "جستجو..."}
      onChange={(e) => onChange(e.target.value)}
      icon={<i className="fa-solid fa-magnifying-glass" />}
      wrapperClassName="ux-search-field app-form-field--search"
      className={className || "h-14 w-full rounded-[22px] text-[15px] shadow-sm md:text-base"}
    />
  );
}
