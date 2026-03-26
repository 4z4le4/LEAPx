import * as React from "react";

type Props = {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;

  /** ✅ รับได้ทั้ง "URL" หรือ "ทั้งก้อน <iframe ...>" */
  mapUrl?: string | null;

  className?: string;
};

/* ===================== Helpers ===================== */

function extractUrlFromMaybeIframe(raw: string): string {
  const s = raw.trim();
  if (!s) return "";

  if (/<iframe/i.test(s)) {
    const m = s.match(/src\s*=\s*["']([^"']+)["']/i);
    return (m?.[1] ?? "").trim();
  }

  return s;
}

function normalizeUrl(raw: string): string {
  return extractUrlFromMaybeIframe(raw).replace(/&amp;/g, "&").trim();
}

/** ✅ ยอมรับทั้ง google.com/maps และ short link ของ Google Maps */
function isLikelyGoogleMapsUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;

  // google.* ที่ path มี /maps
  if (/(^|\.)google\.[a-z.]+\/maps/i.test(u)) return true;

  // short links
  if (/^https?:\/\/maps\.app\.goo\.gl\//i.test(u)) return true;
  if (/^https?:\/\/goo\.gl\/maps\//i.test(u)) return true;

  return false;
}

function isShortGoogleMapsUrl(url: string): boolean {
  return (
    /^https?:\/\/maps\.app\.goo\.gl\//i.test(url) ||
    /^https?:\/\/goo\.gl\/maps\//i.test(url)
  );
}

function extractLatLngFromGoogleMapsUrl(
  url: string
): { lat: number; lng: number } | null {
  // 1) /@lat,lng,zoom
  {
    const m = url.match(/\/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:,|$)/);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  // 2) !3dLAT!4dLNG
  {
    const m = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  // 3) q=lat,lng หรือ ll=lat,lng
  try {
    const u = new URL(url);
    const q =
      u.searchParams.get("q") ??
      u.searchParams.get("query") ??
      u.searchParams.get("ll");
    if (q) {
      const mm = q.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
      if (mm) {
        const lat = Number(mm[1]);
        const lng = Number(mm[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * ✅ ถ้าเป็น "embed link" อยู่แล้ว ให้ใช้ได้ทันที
 * - https://www.google.com/maps/embed?pb=...
 */
function asEmbedUrlIfPossible(url: string): string | null {
  if (/\/maps\/embed\?/i.test(url)) return url;

  try {
    const u = new URL(url);
    const pb = u.searchParams.get("pb");
    if (pb) return `https://www.google.com/maps/embed?pb=${pb}`;
  } catch {
    // ignore
  }

  return null;
}

function buildGoogleMapsEmbedSrc(input: {
  mapUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}): { src: string; reason?: "ok" | "short_fallback" | "unsupported" } {
  const mapUrl = normalizeUrl(input.mapUrl ?? "");

  // 1) มี URL มาก่อน
  if (mapUrl) {
    // ไม่ใช่ google maps -> ไม่แสดง
    if (!isLikelyGoogleMapsUrl(mapUrl))
      return { src: "", reason: "unsupported" };

    // 1.1 embed อยู่แล้ว
    const embed = asEmbedUrlIfPossible(mapUrl);
    if (embed) return { src: embed, reason: "ok" };

    // 1.2 แกะพิกัดได้ -> ใช้พิกัด
    const ll = extractLatLngFromGoogleMapsUrl(mapUrl);
    if (ll)
      return {
        src: `https://www.google.com/maps?q=${ll.lat},${ll.lng}&output=embed`,
        reason: "ok",
      };

    // 1.3 ✅ short link (maps.app.goo.gl / goo.gl/maps) แกะพิกัดไม่ได้ใน FE
    //     -> ถ้ามี address ให้ fallback เป็นค้นหาชื่อแทน เพื่อให้มีแผนที่แสดง
    if (isShortGoogleMapsUrl(mapUrl) && input.address) {
      return {
        src: `https://www.google.com/maps?q=${encodeURIComponent(
          input.address
        )}&output=embed`,
        reason: "short_fallback",
      };
    }

    // url เป็น google maps แต่แกะไม่ได้จริง ๆ และไม่อยาก fallback มั่ว
    return { src: "", reason: "unsupported" };
  }

  // 2) fallback: lat/lng
  if (input.lat != null && input.lng != null) {
    return {
      src: `https://www.google.com/maps?q=${input.lat},${input.lng}&output=embed`,
      reason: "ok",
    };
  }

  // 3) fallback: address
  if (input.address) {
    return {
      src: `https://www.google.com/maps?q=${encodeURIComponent(
        input.address
      )}&output=embed`,
      reason: "ok",
    };
  }

  return { src: "", reason: "unsupported" };
}

/* ===================== Component ===================== */

export default function GoogleMapNoKey({
  lat,
  lng,
  address,
  mapUrl,
  className,
}: Props) {
  const normalizedUrl = React.useMemo(
    () => normalizeUrl(mapUrl ?? ""),
    [mapUrl]
  );

  const built = React.useMemo(
    () => buildGoogleMapsEmbedSrc({ mapUrl, lat, lng, address }),
    [mapUrl, lat, lng, address]
  );

  const src = built.src;

  console.log("[GoogleMapNoKey] final iframe src:", src);

  // ✅ ถ้า build ไม่ได้ ให้ render fallback UI (กันพื้นที่ว่างโล่ง)
  if (!src) {
    const showOpen = !!normalizedUrl && isLikelyGoogleMapsUrl(normalizedUrl);

    return (
      <div
        className={[
          className ?? "",
          "grid place-items-center bg-slate-50 text-slate-500 text-sm",
        ].join(" ")}
      >
        <div className="text-center px-3">
          <div className="font-medium text-slate-600">
            ไม่สามารถฝังแผนที่จากลิงก์นี้ได้
          </div>
          <div className="mt-1 text-xs text-slate-500">
            ถ้าเป็นลิงก์แบบสั้น (maps.app.goo.gl) แนะนำให้ใช้ “Embed a map”
            หรือส่งพิกัด/ที่อยู่แทน
          </div>

          {showOpen && (
            <a
              href={normalizedUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-white text-xs font-semibold"
            >
              เปิดใน Google Maps
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <iframe
      className={className}
      src={src}
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
      title="Google Map"
    />
  );
}
