export const CATEGORIES = [
  "仕事",
  "大学院・研究",
  "家事",
  "食事",
  "運動",
  "休憩",
  "事務・手続",
  "家族",
  "移動",
  "健康",
  "趣味",
  "その他",
] as const;

export type Category = (typeof CATEGORIES)[number];

const KEYWORDS: Record<Exclude<Category, "その他">, string[]> = {
  仕事: ["相談", "契約書", "弁護士", "顧問", "裁判所", "会議", "クライアント", "営業", "ミーティング"],
  "大学院・研究": ["大学院", "課題", "研究", "論文", "ゼミ", "学会", "発表資料", "授業"],
  家事: ["買い物", "洗濯", "皿洗い", "乾燥機", "掃除", "ゴミ", "片付け", "炊事", "料理"],
  食事: ["ご飯", "ごはん", "昼食", "夕食", "朝食", "ランチ", "ディナー", "朝ごはん", "昼ごはん", "夕ごはん", "間食", "おやつ", "外食"],
  運動: ["ジム", "ランニング", "散歩", "ウォーキング", "ストレッチ", "ヨガ", "筋トレ", "プール", "走る"],
  休憩: ["休憩", "仮眠", "昼寝", "ぼーっと", "リラックス"],
  "事務・手続": ["楽天証券", "東京電力", "カレンダー", "手続", "申請", "確定申告", "書類", "請求書"],
  家族: ["家族", "子ども", "子供", "妻", "夫", "保育園", "幼稚園", "送迎", "PTA"],
  移動: ["移動", "電車", "バス", "車", "タクシー", "出発", "到着", "出張", "通勤"],
  健康: ["病院", "通院", "歯医者", "薬", "診療", "受診", "体調", "睡眠"],
  趣味: ["ゲーム", "映画", "読書", "音楽", "漫画", "アニメ", "旅行", "カフェ"],
};

export function inferCategory(text: string): Category {
  if (!text) return "その他";
  for (const [cat, words] of Object.entries(KEYWORDS) as [
    Exclude<Category, "その他">,
    string[],
  ][]) {
    for (const w of words) {
      if (text.includes(w)) return cat;
    }
  }
  return "その他";
}

export function inferCategoryFromTitleAndMemo(
  title: string,
  memo: string
): Category {
  const combined = `${title} ${memo}`;
  return inferCategory(combined);
}

export function normalizeCategory(value: unknown): Category {
  if (typeof value !== "string") return "その他";
  return (CATEGORIES as readonly string[]).includes(value)
    ? (value as Category)
    : "その他";
}

export const CATEGORY_COLOR: Record<Category, string> = {
  仕事: "bg-blue-200 text-blue-900",
  "大学院・研究": "bg-indigo-200 text-indigo-900",
  家事: "bg-emerald-200 text-emerald-900",
  食事: "bg-amber-200 text-amber-900",
  運動: "bg-lime-200 text-lime-900",
  休憩: "bg-slate-300 text-slate-800",
  "事務・手続": "bg-teal-200 text-teal-900",
  家族: "bg-pink-200 text-pink-900",
  移動: "bg-sky-200 text-sky-900",
  健康: "bg-rose-200 text-rose-900",
  趣味: "bg-purple-200 text-purple-900",
  その他: "bg-slate-200 text-slate-800",
};
