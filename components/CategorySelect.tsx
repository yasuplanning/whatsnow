"use client";

import { useMemo } from "react";
import type { Category, CategoryDefinition } from "@/lib/category";

interface Props {
  categories: CategoryDefinition[];
  value: Category;
  onChange: (next: Category) => void;
  subcategoryValue?: string | null;
  onSubcategoryChange?: (next: string | null) => void;
  onAddSubcategory?: (categoryName: string) => void;
  label?: string;
}

export default function CategorySelect({
  categories,
  value,
  onChange,
  subcategoryValue,
  onSubcategoryChange,
  onAddSubcategory,
  label = "カテゴリ",
}: Props) {
  const def = useMemo(
    () => categories.find((c) => c.name === value) ?? null,
    [categories, value]
  );
  const hasSubcategories = !!def && def.subcategories.length > 0;

  return (
    <div className="space-y-2">
      <label className="block text-sm text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (onSubcategoryChange) onSubcategoryChange(null);
        }}
        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
      {hasSubcategories && onSubcategoryChange && (
        <div className="flex items-center gap-2">
          <select
            value={subcategoryValue ?? ""}
            onChange={(e) =>
              onSubcategoryChange(e.target.value === "" ? null : e.target.value)
            }
            className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-base text-white"
          >
            <option value="">サブカテゴリなし</option>
            {def!.subcategories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {onAddSubcategory && (
            <button
              type="button"
              onClick={() => onAddSubcategory(value)}
              aria-label="サブカテゴリを追加"
              title="サブカテゴリを追加"
              className="shrink-0 rounded-xl bg-slate-700 px-3 py-3 text-base font-bold text-white hover:bg-slate-600"
            >
              ＋
            </button>
          )}
        </div>
      )}
    </div>
  );
}
