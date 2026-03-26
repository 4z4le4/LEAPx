import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import Logo2_1 from "../../assets/logo/Logo2_1.png";

/* ===================== types ===================== */
type ApiMajorCategory = {
  id: number;
  name_TH: string;
  name_EN: string;
  code?: string;
};

type ApiPublicEvent = {
  id: number;
  majorCategory?: ApiMajorCategory | null;
};

type EventsPublicResponse = {
  success: boolean;
  data?: ApiPublicEvent[];
  availableCategories?: ApiMajorCategory[];
  error?: string;
  message?: string;
};

type FooterItem = { label: string; href: string };

/* ===================== const ===================== */
const SERVER_URL = String(
  import.meta.env.VITE_LEAP_BACKEND_URL ??
    import.meta.env.VITE_SERVER_URL ??
    import.meta.env.VITE_BACKEND_URL ??
    ""
).replace(/\/$/, "");

// ✅ API ใหม่: limit=12 และมี availableCategories
const PUBLIC_EVENTS_PATH =
  "/api/events/public?page=1&limit=12&sortBy=activityStart";

const fetcher = async (url: string): Promise<EventsPublicResponse> => {
  const res = await fetch(url, { credentials: "include" });
  const data = (await res.json()) as EventsPublicResponse;

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Failed to fetch");
  }
  return data;
};

function isThaiLang(lang?: string): boolean {
  return Boolean(lang && lang.toLowerCase().startsWith("th"));
}

const PrimaryFooter: React.FC = () => {
  const { t, i18n } = useTranslation("footer");
  const th = isThaiLang(i18n.language);

  const safeT = (key: string, fallback: string): string => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const comingSoon = safeT("placeholders.comingSoon", "รอใส่ข้อมูล");

  const canFetch = Boolean(SERVER_URL);
  const eventsUrl = canFetch ? `${SERVER_URL}${PUBLIC_EVENTS_PATH}` : null;

  // ✅ SWR จะ cache ตาม key (eventsUrl) ให้อัตโนมัติ
  // ปรับ option ให้ “นิ่ง” สำหรับ footer (ไม่ต้อง refetch บ่อย)
  const { data: eventsRes } = useSWR<EventsPublicResponse>(eventsUrl, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 5 * 60 * 1000, // 5 นาที (กันยิงซ้ำถี่ ๆ)
    keepPreviousData: true, // ถ้าใช้ SWR v2 จะช่วยไม่ให้กระพริบ
  });

  const majorCategories = useMemo(() => {
    // ✅ ใช้ availableCategories ตาม API ใหม่เป็นหลัก
    const available = eventsRes?.availableCategories ?? [];
    if (available.length > 0) {
      const arr = [...available];
      arr.sort((a, b) => a.id - b.id);
      return arr;
    }

    // ✅ fallback รองรับกรณี backend เก่ายังส่งมาเป็น event list เท่านั้น
    const list = eventsRes?.data ?? [];
    const map = new Map<number, ApiMajorCategory>();
    for (const ev of list) {
      const mc = ev.majorCategory ?? null;
      if (!mc) continue;
      if (!map.has(mc.id)) map.set(mc.id, mc);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => a.id - b.id);
    return arr;
  }, [eventsRes]);

  const categories: FooterItem[] = useMemo(() => {
    const prefixTH = safeT("categories.itemPrefix", "กิจกรรม สาขา");
    const prefixEN = safeT("categories.itemPrefix", "Activities by ");
    const prefix = th ? prefixTH : prefixEN;

    const top = majorCategories.slice(0, 4).map((mc) => {
      const name = th ? mc.name_TH : mc.name_EN;
      return {
        label: `${prefix}${name}`,
        href: `/activities?majorCategoryId=${encodeURIComponent(
          String(mc.id)
        )}`,
      };
    });

    if (top.length > 0) return top;
    return [{ label: comingSoon, href: "/activities" }];
  }, [majorCategories, th, i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ===================== quick links: ไม่ให้ซ้ำ ===================== */
  const rawQuickLinks: FooterItem[] = useMemo(() => {
    return [
      { label: safeT("quickLinks.items.about", comingSoon), href: "/" },
      { label: safeT("quickLinks.items.faq", comingSoon), href: "/faq" },
      {
        label: safeT("quickLinks.items.contact", comingSoon),
        href: "/contact",
      },
    ];
  }, [i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  const quickLinksToShow: FooterItem[] = useMemo(() => {
    const real = rawQuickLinks.filter((x) => x.label !== comingSoon);
    if (real.length > 0) return real;
    return [];
  }, [rawQuickLinks, comingSoon]);

  /* ===================== contact: ไม่ให้ซ้ำ ===================== */
  const contactOrg = safeT("contact.org", "");
  const contactPhone = safeT("contact.phone", "");

  const hasOrg = contactOrg.trim().length > 0 && contactOrg !== "contact.org";
  const hasPhone =
    contactPhone.trim().length > 0 && contactPhone !== "contact.phone";

  const facebookHref = safeT("contact.social.facebookHref", "#") || "#";
  const instagramHref = safeT("contact.social.instagramHref", "#") || "#";
  const locationHref = safeT("contact.social.locationHref", "#") || "#";

  const hasAnySocial =
    facebookHref !== "#" || instagramHref !== "#" || locationHref !== "#";

  const shouldShowContactComingSoon = !hasOrg && !hasPhone && !hasAnySocial;

  return (
    <footer className="w-full bg-white border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-10">
        <div className="grid gap-10 lg:grid-cols-[440px_1fr]">
          {/* Left: Brand */}
          <div className="min-w-0">
            <img
              src={Logo2_1}
              alt={safeT("brand.logoAlt", "LEAP")}
              className="h-20 w-auto"
              loading="lazy"
            />

            <div className="mt-3">
              <div className="text-sm font-semibold text-slate-900">
                {safeT(
                  "brand.name",
                  "Learning & Experience Advancement Platform"
                )}
              </div>
              <div className="mt-1 text-sm text-slate-700">
                {safeT(
                  "brand.tagline",
                  "ระบบเพื่อการเรียนรู้สะสมประสบการณ์และการพัฒนาศักยภาพ"
                )}
              </div>
              <div className="mt-4 text-sm text-slate-400">
                {safeT(
                  "brand.copyright",
                  "© 2025 LEAP Platform. All rights reserved."
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
              <Link to="/terms" className="hover:text-slate-900 transition">
                {safeT("policies.terms", "เงื่อนไขการใช้งาน")}
              </Link>
              <Link to="/privacy" className="hover:text-slate-900 transition">
                {safeT("policies.privacy", "นโยบายความเป็นส่วนตัว")}
              </Link>
              <Link to="/security" className="hover:text-slate-900 transition">
                {safeT("policies.security", "ความปลอดภัย")}
              </Link>
              <Link to="/cookies" className="hover:text-slate-900 transition">
                {safeT("policies.cookies", "นโยบายคุกกี้")}
              </Link>
            </div>
          </div>

          {/* Right: Columns */}
          <div className="grid gap-10 sm:grid-cols-3">
            {/* Categories */}
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {safeT("sections.categories", "หมวดหมู่กิจกรรม")}
              </div>

              {!canFetch ? (
                <div className="mt-4 text-sm text-slate-600">{comingSoon}</div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {categories.map((c, idx) => (
                    <li key={`${c.href}-${idx}`}>
                      <Link
                        to={c.href}
                        className="text-sm text-slate-700 hover:text-slate-900 transition"
                      >
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Quick links */}
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {safeT("sections.quickLinks", "ลิงก์ด่วน")}
              </div>

              {quickLinksToShow.length === 0 ? (
                <div className="mt-4 text-sm text-slate-600">{comingSoon}</div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {quickLinksToShow.map((l) => (
                    <li key={l.href}>
                      <Link
                        to={l.href}
                        className="text-sm text-slate-700 hover:text-slate-900 transition"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Contact */}
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {safeT("sections.contact", "ข้อมูลการติดต่อ")}
              </div>

              {shouldShowContactComingSoon ? (
                <div className="mt-4 text-sm text-slate-600">{comingSoon}</div>
              ) : (
                <>
                  <div className="mt-4 space-y-2 text-sm text-slate-700">
                    {hasOrg && <div>{contactOrg}</div>}
                    {hasPhone && <div>{contactPhone}</div>}
                  </div>

                  {hasAnySocial && (
                    <div className="mt-5 flex items-center gap-4 text-slate-600">
                      {facebookHref !== "#" && (
                        <a
                          href={facebookHref}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="facebook"
                          className="hover:text-slate-900 transition"
                        >
                          <Facebook size={18} />
                        </a>
                      )}
                      {instagramHref !== "#" && (
                        <a
                          href={instagramHref}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="instagram"
                          className="hover:text-slate-900 transition"
                        >
                          <Instagram size={18} />
                        </a>
                      )}
                      {locationHref !== "#" && (
                        <a
                          href={locationHref}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="location"
                          className="hover:text-slate-900 transition"
                        >
                          <MapPin size={18} />
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-4 w-full bg-gradient-to-r from-teal-200 to-sky-200" />
    </footer>
  );
};

export default PrimaryFooter;
