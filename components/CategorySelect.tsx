"use client";

import { CATEGORIES, type Category } from "@/lib/category";

interface Props {
  value: Category;
  onChange: (next: Category) => void;
  label?: string;
}

export default function CategorySelect({ value, onChange, label = "カテゴリ" }: Props) {
  return (
    <div className="space-y-2">
      <label className="block text-sm text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Category)}
        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
