export type Category = string;

export interface CategoryDefinition {
  id: string;
  name: string;
  color: string;
  builtin: boolean;
  subcategories: string[];
}

export const CATEGORY_COLOR_OPTIONS: string[] = [
  "bg-blue-200 text-blue-900",
  "bg-indigo-200 text-indigo-900",
  "bg-emerald-200 text-emerald-900",
  "bg-amber-200 text-amber-900",
  "bg-lime-200 text-lime-900",
  "bg-slate-300 text-slate-800",
  "bg-teal-200 text-teal-900",
  "bg-pink-200 text-pink-900",
  "bg-sky-200 text-sky-900",
  "bg-rose-200 text-rose-900",
  "bg-purple-200 text-purple-900",
  "bg-orange-200 text-orange-900",
  "bg-fuchsia-200 text-fuchsia-900",
  "bg-cyan-200 text-cyan-900",
];

export const OTHER_CATEGORY = "その他";
export const OTHER_CATEGORY_COLOR = "bg-slate-200 text-slate-800";

interface BuiltinSpec {
  name: string;
  color: string;
  keywords: string[];
}

const BUILTIN_SPECS: BuiltinSpec[] = [
  {
    name: "仕事",
    color: "bg-blue-200 text-blue-900",
    keywords: ["相談", "契約書", "弁護士", "顧問", "裁判所", "会議", "クライアント", "営業", "ミーティング"],
  },
  {
    name: "大学院・研究",
    color: "bg-indigo-200 text-indigo-900",
    keywords: ["大学院", "課題", "研究", "論文", "ゼミ", "学会", "発表資料", "授業"],
  },
  {
    name: "家事",
    color: "bg-emerald-200 text-emerald-900",
    keywords: ["買い物", "洗濯", "皿洗い", "乾燥機", "掃除", "ゴミ", "片付け", "炊事", "料理"],
  },
  {
    name: "食事",
    color: "bg-amber-200 text-amber-900",
    keywords: ["ご飯", "ごはん", "昼食", "夕食", "朝食", "ランチ", "ディナー", "朝ごはん", "昼ごはん", "夕ごはん", "間食", "おやつ", "外食"],
  },
  {
    name: "運動",
    color: "bg-lime-200 text-lime-900",
    keywords: ["ジム", "ランニング", "散歩", "ウォーキング", "ストレッチ", "ヨガ", "筋トレ", "プール", "走る"],
  },
  {
    name: "休憩",
    color: "bg-slate-300 text-slate-800",
    keywords: ["休憩", "仮眠", "昼寝", "ぼーっと", "リラックス"],
  },
  {
    name: "事務・手続",
    color: "bg-teal-200 text-teal-900",
    keywords: ["楽天証券", "東京電力", "カレンダー", "手続", "申請", "確定申告", "書類", "請求書"],
  },
  {
    name: "家族",
    color: "bg-pink-200 text-pink-900",
    keywords: ["家族", "子ども", "子供", "妻", "夫", "保育園", "幼稚園", "送迎", "PTA"],
  },
  {
    name: "移動",
    color: "bg-sky-200 text-sky-900",
    keywords: ["移動", "電車", "バス", "車", "タクシー", "出発", "到着", "出張", "通勤"],
  },
  {
    name: "健康",
    color: "bg-rose-200 text-rose-900",
    keywords: ["病院", "通院", "歯医者", "薬", "診療", "受診", "体調", "睡眠"],
  },
  {
    name: "趣味",
    color: "bg-purple-200 text-purple-900",
    keywords: ["ゲーム", "映画", "読書", "音楽", "漫画", "アニメ", "旅行", "カフェ"],
  },
];

const BUILTIN_KEYWORDS: Record<string, string[]> = Object.fromEntries(
  BUILTIN_SPECS.map((s) => [s.name, s.keywords])
);

export const BUILTIN_CATEGORY_NAMES: string[] = [
  ...BUILTIN_SPECS.map((s) => s.name),
  OTHER_CATEGORY,
];

export function getDefaultCategories(): CategoryDefinition[] {
  const items: CategoryDefinition[] = BUILTIN_SPECS.map((s) => ({
    id: `builtin-${s.name}`,
    name: s.name,
    color: s.color,
    builtin: true,
    subcategories: [],
  }));
  items.push({
    id: "builtin-その他",
    name: OTHER_CATEGORY,
    color: OTHER_CATEGORY_COLOR,
    builtin: true,
    subcategories: [],
  });
  return items;
}

// Log categories never carry subcategories. Builtin defaults are a focused
// set of common activity buckets; users edit the list independently of the
// ToDo category set.
const LOG_BUILTIN_SPECS: { name: string; color: string }[] = [
  { name: "仕事", color: "bg-blue-200 text-blue-900" },
  { name: "家事", color: "bg-emerald-200 text-emerald-900" },
  { name: "食事", color: "bg-amber-200 text-amber-900" },
  { name: "休憩", color: "bg-slate-300 text-slate-800" },
  { name: "移動", color: "bg-sky-200 text-sky-900" },
];

export function getDefaultLogCategories(): CategoryDefinition[] {
  const items: CategoryDefinition[] = LOG_BUILTIN_SPECS.map((s) => ({
    id: `log-builtin-${s.name}`,
    name: s.name,
    color: s.color,
    builtin: true,
    subcategories: [],
  }));
  items.push({
    id: "log-builtin-その他",
    name: OTHER_CATEGORY,
    color: OTHER_CATEGORY_COLOR,
    builtin: true,
    subcategories: [],
  });
  return items;
}

export function resolveLogCategory(
  name: string,
  logCategories: CategoryDefinition[]
): string {
  if (logCategories.some((c) => c.name === name)) return name;
  return logCategories[0]?.name ?? OTHER_CATEGORY;
}

export function inferCategory(text: string): Category {
  if (!text) return OTHER_CATEGORY;
  for (const [cat, words] of Object.entries(BUILTIN_KEYWORDS)) {
    for (const w of words) {
      if (text.includes(w)) return cat;
    }
  }
  return OTHER_CATEGORY;
}

export function inferCategoryFromTitleAndMemo(
  title: string,
  memo: string
): Category {
  return inferCategory(`${title} ${memo}`);
}

export function normalizeCategory(value: unknown): Category {
  if (typeof value !== "string") return OTHER_CATEGORY;
  return value;
}

export function resolveCategoryName(
  value: string,
  categories: CategoryDefinition[]
): string {
  if (!value) return OTHER_CATEGORY;
  return categories.some((c) => c.name === value) ? value : OTHER_CATEGORY;
}

export function findCategory(
  value: string,
  categories: CategoryDefinition[]
): CategoryDefinition | null {
  return categories.find((c) => c.name === value) ?? null;
}

export function formatCategoryLabel(
  category: string,
  subcategory: string | null | undefined
): string {
  return subcategory ? `${category} / ${subcategory}` : category;
}

export function getCategoryColor(
  value: string,
  categories: CategoryDefinition[]
): string {
  const def = findCategory(value, categories);
  if (def) return def.color;
  return OTHER_CATEGORY_COLOR;
}

export function isSubcategoryValid(
  categoryName: string,
  subcategory: string | null | undefined,
  categories: CategoryDefinition[]
): boolean {
  if (!subcategory) return true;
  const def = findCategory(categoryName, categories);
  if (!def) return false;
  return def.subcategories.includes(subcategory);
}

export function normalizeSubcategory(
  categoryName: string,
  subcategory: unknown,
  categories: CategoryDefinition[]
): string | null {
  if (typeof subcategory !== "string" || subcategory === "") return null;
  return isSubcategoryValid(categoryName, subcategory, categories)
    ? subcategory
    : null;
}

// Legacy export for backwards compatibility — used like CATEGORY_COLOR[name]
export const CATEGORY_COLOR: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const s of BUILTIN_SPECS) map[s.name] = s.color;
  map[OTHER_CATEGORY] = OTHER_CATEGORY_COLOR;
  return new Proxy(map, {
    get(target, prop: string) {
      return target[prop] ?? OTHER_CATEGORY_COLOR;
    },
  });
})();
