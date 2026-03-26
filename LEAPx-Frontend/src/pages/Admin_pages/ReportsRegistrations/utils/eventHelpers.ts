export function formatDate(date?: string | null) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCapacity(current?: number, max?: number) {
  const c = current ?? 0;
  const m = max ?? 0;

  // treat large sentinel value as unlimited
  if (!m || m >= 1000000) {
    return `${c.toLocaleString()}/ไม่จำกัด`;
  }

  return `${c.toLocaleString()}/${m.toLocaleString()}`;
}

export function getEventCover(
  photos?: {
    isMain?: boolean;
    cloudinaryImage?: { url: string };
  }[]
) {
  if (!photos || photos.length === 0) return null;

  const main = photos.find((p) => p.isMain);

  return main?.cloudinaryImage?.url ?? photos[0]?.cloudinaryImage?.url ?? null;
}