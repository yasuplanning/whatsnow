export async function compressImageToDataUrl(
  file: File,
  maxDim = 1024,
  quality = 0.75
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.onload = () => {
      const src = reader.result;
      if (typeof src !== "string") {
        reject(new Error("読み込み結果が不正です"));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.onload = () => {
        try {
          const { width, height } = img;
          let w = width;
          let h = height;
          const longest = Math.max(w, h);
          if (longest > maxDim) {
            const scale = maxDim / longest;
            w = Math.max(1, Math.round(w * scale));
            h = Math.max(1, Math.round(h * scale));
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("canvas を初期化できません"));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (err) {
          reject(err instanceof Error ? err : new Error("画像の圧縮に失敗しました"));
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
