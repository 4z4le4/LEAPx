// src/components/Event/BannerSlider.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

export type BannerItem = {
  src: string;
  alt?: string;
  href?: string;
};

type Props = {
  items?: BannerItem[];
  fetchUrl?: string;
  fallbackItems?: BannerItem[];

  heightClass?: string;
  autoPlayMs?: number;
  pauseOnHover?: boolean;
  rounded?: string;
  className?: string;
  maxSlides?: number;

  // เปิด/ปิดพื้นหลังเบลอ
  blurredBackdrop?: boolean;

  // ✅ ล็อกขนาดความกว้างขั้นต่ำของ “รูปชั้นหน้า” (กันรูปเล็กเกิน)
  // default = 380
  minImageWidthPx?: number;

  // ข้อความตอนไม่มีรูป (ถ้าไม่ส่งมา จะใช้ default)
  emptyText?: string;
};

type BannerApiItem = {
  id?: number;
  url: string;
  caption_TH?: string | null;
  caption_EN?: string | null;
  isMain?: boolean | null;
  sortOrder?: number | null;
};

type MediaRes =
  | {
      success: true;
      data:
        | { banners?: BannerApiItem[] | null }
        | BannerApiItem[]
        | BannerItem[];
    }
  | { success: false; data?: unknown }
  | { success?: boolean; data?: unknown };

const swrFetcher = async (url: string): Promise<MediaRes> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as MediaRes;
};

const BannerSlider: React.FC<Props> = ({
  items,
  fetchUrl,
  fallbackItems = [],
  heightClass = "h-[220px] md:h-[300px] lg:h-[380px]",
  autoPlayMs = 4500,
  pauseOnHover = true,
  rounded = "",
  className = "",
  maxSlides = 6,
  blurredBackdrop = true,
  minImageWidthPx = 380,
  emptyText = "ยังไม่มีรูปแบนเนอร์",
}) => {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const { data, error, isLoading } = useSWR<MediaRes>(
    fetchUrl || null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const slides: BannerItem[] = useMemo(() => {
    // 0) items มาก่อนเสมอ
    if (items?.length) {
      return items
        .filter((x) => typeof x?.src === "string" && x.src.trim().length > 0)
        .slice(0, maxSlides);
    }

    // 1) โหมดดึงจาก backend
    if (fetchUrl) {
      // ระหว่างโหลด: ไม่โชว์รูป (แต่เราจะ render skeleton/empty ที่ด้านล่าง)
      if (isLoading) return [];

      // ถ้าโหลดพัง: ใช้ fallbackItems ได้
      if (error) {
        return fallbackItems
          .filter((x) => typeof x?.src === "string" && x.src.trim().length > 0)
          .slice(0, maxSlides);
      }

      const rawData = data?.data;

      // 1.1) { banners: [...] }
      if (rawData && !Array.isArray(rawData)) {
        const asObj = rawData as { banners?: BannerApiItem[] | null };

        if (Array.isArray(asObj.banners) && asObj.banners.length) {
          return asObj.banners
            .slice()
            .sort((a, b) => {
              const aMain = a.isMain ? 1 : 0;
              const bMain = b.isMain ? 1 : 0;
              if (bMain !== aMain) return bMain - aMain;

              const ao =
                typeof a.sortOrder === "number"
                  ? a.sortOrder
                  : Number.POSITIVE_INFINITY;
              const bo =
                typeof b.sortOrder === "number"
                  ? b.sortOrder
                  : Number.POSITIVE_INFINITY;
              return ao - bo;
            })
            .map<BannerItem>((b) => ({
              src: b.url,
              alt: b.caption_TH || b.caption_EN || "banner",
            }))
            .filter((b) => typeof b.src === "string" && b.src.trim().length > 0)
            .slice(0, maxSlides);
        }

        // backend มี data แต่ empty => ไม่มีรูป
        return [];
      }

      // 1.2) data เป็น array ตรง ๆ
      if (Array.isArray(rawData)) {
        if (rawData.length === 0) return [];

        const first = rawData[0] as BannerApiItem | BannerItem;

        if (
          "url" in first &&
          (Object.prototype.hasOwnProperty.call(first, "caption_TH") ||
            Object.prototype.hasOwnProperty.call(first, "caption_EN") ||
            Object.prototype.hasOwnProperty.call(first, "sortOrder") ||
            Object.prototype.hasOwnProperty.call(first, "isMain"))
        ) {
          const arr = rawData as BannerApiItem[];
          return arr
            .slice()
            .sort((a, b) => {
              const aMain = a.isMain ? 1 : 0;
              const bMain = b.isMain ? 1 : 0;
              if (bMain !== aMain) return bMain - aMain;

              const ao =
                typeof a.sortOrder === "number"
                  ? a.sortOrder
                  : Number.POSITIVE_INFINITY;
              const bo =
                typeof b.sortOrder === "number"
                  ? b.sortOrder
                  : Number.POSITIVE_INFINITY;
              return ao - bo;
            })
            .map<BannerItem>((b, i) => ({
              src: b.url,
              alt: b.caption_TH || b.caption_EN || `banner-${i + 1}`,
            }))
            .filter((b) => typeof b.src === "string" && b.src.trim().length > 0)
            .slice(0, maxSlides);
        }

        const arr = (rawData as BannerItem[])
          .filter((b) => typeof b?.src === "string" && b.src.trim().length > 0)
          .slice(0, maxSlides);

        return arr;
      }

      // ไม่เข้า format => ไม่มีรูป
      return [];
    }

    // 2) manual mode
    return fallbackItems
      .filter((x) => typeof x?.src === "string" && x.src.trim().length > 0)
      .slice(0, maxSlides);
  }, [items, fetchUrl, isLoading, error, data, fallbackItems, maxSlides]);

  const total = slides.length;
  const hasSlides = total > 0;
  const safeTotal = Math.max(total, 1);

  useEffect(() => {
    if (!hasSlides) {
      setIndex(0);
      return;
    }
    setIndex((prev) => Math.min(Math.max(prev, 0), total - 1));
  }, [hasSlides, total]);

  useEffect(() => {
    if (!hasSlides) return;
    const t = window.setTimeout(() => setAnimating(false), 750);
    return () => window.clearTimeout(t);
  }, [index, hasSlides]);

  // autoplay
  useEffect(() => {
    if (!hasSlides) return;
    if (!autoPlayMs || autoPlayMs < 1000 || total <= 1) return;

    const el = wrapRef.current;
    let hovering = false;

    const handleEnter = () => {
      if (pauseOnHover) hovering = true;
    };
    const handleLeave = () => {
      hovering = false;
    };

    el?.addEventListener("mouseenter", handleEnter);
    el?.addEventListener("mouseleave", handleLeave);

    const id = window.setInterval(() => {
      if (!hovering) {
        setAnimating(true);
        setIndex((prevIdx) => (prevIdx + 1) % total);
      }
    }, autoPlayMs);

    return () => {
      window.clearInterval(id);
      el?.removeEventListener("mouseenter", handleEnter);
      el?.removeEventListener("mouseleave", handleLeave);
    };
  }, [autoPlayMs, pauseOnHover, total, hasSlides]);

  // swipe
  useEffect(() => {
    if (!hasSlides) return;
    const el = wrapRef.current;
    if (!el || total <= 1) return;

    let startX = 0;
    let delta = 0;

    const updateDelta = (x: number) => {
      delta = x - startX;
    };

    const handleMouseMove = (e: MouseEvent) => updateDelta(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateDelta(e.touches[0].clientX);
    };

    const finishSwipe = () => {
      if (Math.abs(delta) > 40) {
        setAnimating(true);
        setIndex((prevIdx) => {
          if (delta < 0) return (prevIdx + 1) % total;
          return (prevIdx - 1 + total) % total;
        });
      }
      delta = 0;
    };

    const handleMouseUp = () => {
      finishSwipe();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    const handleTouchEnd = () => {
      finishSwipe();
      el.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    const handleMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      delta = 0;
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        startX = e.touches[0].clientX;
        delta = 0;
        el.addEventListener("touchmove", handleTouchMove, { passive: true });
        window.addEventListener("touchend", handleTouchEnd);
      }
    };

    el.addEventListener("mousedown", handleMouseDown);
    el.addEventListener("touchstart", handleTouchStart, { passive: true });

    return () => {
      el.removeEventListener("mousedown", handleMouseDown);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [total, hasSlides]);

  const trackWidthPct = safeTotal * 100;
  const slideWidthPct = 100 / safeTotal;
  const shiftPct = (index * 100) / safeTotal;

  const goto = (i: number) => {
    if (!total) return;
    const nextIdx = (i + total) % total;
    setAnimating(true);
    setIndex(nextIdx);
  };

  const next = () => goto(index + 1);
  const prev = () => goto(index - 1);

  // ✅ กันรูปเล็ก: อย่างน้อย 380px แต่ไม่เกิน 100% ของ container
  // clamp(min, preferred, max)
  const frontImgWidth = `clamp(${Math.max(0, minImageWidthPx)}px, 70vw, 100%)`;

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-hidden bg-white ${rounded} ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="สไลด์แบนเนอร์"
    >
      <div className={heightClass} style={{ position: "relative" }}>
        {/* กรณีไม่มีรูป: เว้นพื้นที่ + โชว์ข้อความ */}
        {!hasSlides ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center px-6">
              <div className="text-slate-700 font-semibold">
                {isLoading ? "กำลังโหลดแบนเนอร์..." : emptyText}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {error ? "โหลดแบนเนอร์ไม่ได้" : "โปรดเพิ่มรูปแบนเนอร์"}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex h-full"
            style={{
              width: `${trackWidthPct}%`,
              transform: `translateX(-${shiftPct}%)`,
              transition: animating
                ? "transform 750ms cubic-bezier(0.22, 0.61, 0.36, 1)"
                : "none",
              willChange: "transform",
            }}
          >
            {slides.map((it, i) => {
              const isActive = i === index;

              return (
                <div
                  key={i}
                  className="relative overflow-hidden"
                  style={{ width: `${slideWidthPct}%`, height: "100%" }}
                >
                  {/* ชั้นหลัง: รูปเดียวกันทำเป็นพื้นหลังเบลอ */}
                  {blurredBackdrop && it.src ? (
                    <div className="absolute inset-0" aria-hidden="true">
                      <img
                        src={it.src}
                        alt=""
                        className="h-full w-full object-cover blur-3xl scale-110 brightness-110 saturate-150"
                        draggable={false}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-white/55" />
                    </div>
                  ) : (
                    <div
                      className="absolute inset-0 bg-white"
                      aria-hidden="true"
                    />
                  )}

                  {/* ชั้นหน้า: รูปจริงแบบ contain แต่กันรูปเล็กเกิน */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={it.src}
                      alt={it.alt || `banner-${i + 1}`}
                      className="select-none"
                      draggable={false}
                      loading={i === 0 ? "eager" : "lazy"}
                      style={{
                        width: frontImgWidth, // ✅ อย่างน้อย 380px (ปรับได้)
                        height: "100%",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",

                        transform: isActive
                          ? "translateX(0)"
                          : `translateX(${(i - index) * 6}%)`,
                        transition: animating
                          ? "transform 750ms cubic-bezier(0.22, 0.61, 0.36, 1)"
                          : "transform 300ms ease",
                        willChange: "transform",
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity =
                          "0";
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prev / Next */}
      {hasSlides && total > 1 && (
        <>
          <button
            type="button"
            aria-label="ก่อนหน้า"
            onClick={prev}
            className={`
              group absolute inset-y-0 left-0 w-[12%] md:w-[10%]
              bg-gradient-to-l from-transparent to-cyan-200/0
              hover:to-cyan-200/35 active:to-cyan-300/40
              focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60
              transition-colors
            `}
          />
          <button
            type="button"
            aria-label="ถัดไป"
            onClick={next}
            className={`
              group absolute inset-y-0 right-0 w-[12%] md:w-[10%]
              bg-gradient-to-r from-transparent to-cyan-200/0
              hover:to-cyan-200/35 active:to-cyan-300/40
              focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60
              transition-colors
            `}
          />
        </>
      )}

      {/* Dots */}
      {hasSlides && total > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`ไปสไลด์ที่ ${i + 1}`}
              aria-current={index === i ? "true" : undefined}
              onClick={() => goto(i)}
              className={
                `h-2.5 w-2.5 rounded-full transition ` +
                (i === index
                  ? "bg-white ring-1 ring-black/30 shadow"
                  : "bg-slate-500/90 hover:bg-slate-400")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerSlider;
