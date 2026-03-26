import React, { useMemo } from "react";
import Navbar from "../../components/Navbar/Navbar";
import PrimaryFooter from "../../components/Footer/PrimaryFooter";
import HeroImage from "../../assets/aboutUs/img_aboutUs.png";
import { Link, useNavigate } from "react-router-dom";
import useSWR from "swr";
import BannerSlider from "../../components/Event/BannerSlider";
import { useTranslation } from "react-i18next";

/* ===================== types ===================== */

type ApiMajorCategory = {
  id: number;
  name_TH: string;
  name_EN: string;
};

type ApiPublicEvent = {
  id: number;
  majorCategory?: ApiMajorCategory | null;
};

type ApiPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type EventsPublicResponse = {
  success: boolean;
  data: ApiPublicEvent[];
  pagination?: ApiPagination;
  error?: string;
  message?: string;
};

/* ===================== const ===================== */

const SERVER_URL = String(
  import.meta.env.VITE_LEAP_BACKEND_URL ??
    import.meta.env.VITE_SERVER_URL ??
    import.meta.env.VITE_BACKEND_URL ??
    ""
).replace(/\/$/, "");

/**
 * ใช้เส้นเดียวกับที่ user ระบุ (หน้าแรก + sort ตามวันเริ่ม)
 * หมายเหตุ: หมวดหมู่ที่โชว์จะได้ “ตามอีเว้นในหน้านี้” เท่านั้น
 */
const PUBLIC_EVENTS_PATH =
  "/api/events/public?page=1&limit=200&sortBy=activityStart";

/**
 * ปรับได้ตาม backend จริงของ media
 * BannerSlider รองรับได้ทั้ง:
 * - { success: true, data: { banners: [...] } }
 * - { success: true, data: [...] }
 */
const BANNER_FETCH_PATH = "/api/media?type=banner";

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

const AboutUs: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("aboutUs");
  const th = isThaiLang(i18n.language);

  const canFetch = Boolean(SERVER_URL);
  const eventsUrl = canFetch ? `${SERVER_URL}${PUBLIC_EVENTS_PATH}` : null;
  const bannerFetchUrl = canFetch ? `${SERVER_URL}${BANNER_FETCH_PATH}` : "";

  const {
    data: eventsRes,
    error,
    isLoading,
    mutate,
  } = useSWR<EventsPublicResponse>(eventsUrl, fetcher, {
    revalidateOnFocus: false,
  });

  // ✅ ดึงเฉพาะ “หมวดหมู่ที่มีอีเว้นจัดอยู่” จากผล events/public แล้ว dedupe ด้วย id
  const majorCategories = useMemo(() => {
    const list = eventsRes?.data ?? [];
    const map = new Map<number, ApiMajorCategory>();

    for (const ev of list) {
      const mc = ev.majorCategory ?? null;
      if (!mc) continue;
      if (!map.has(mc.id)) map.set(mc.id, mc);
    }

    const arr = Array.from(map.values());

    // ✅ เรียงตามภาษาที่กำลังใช้
    arr.sort((a, b) => {
      const aName = th ? a.name_TH : a.name_EN;
      const bName = th ? b.name_TH : b.name_EN;
      return aName.localeCompare(bName, th ? "th" : "en");
    });

    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }, [eventsRes, th]);

  return (
    <div className="w-full bg-white">
      <Navbar />

      {/* ✅ เปลี่ยนจากข้อความ → BannerSlider */}
      <BannerSlider
        fetchUrl={bannerFetchUrl}
        heightClass="h-[220px] md:h-[320px] lg:h-[420px]"
        maxSlides={6}
        autoPlayMs={4500}
        pauseOnHover
        blurredBackdrop
        emptyText={t("banner.empty")}
      />

      {/* Main Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              {t("hero.title.line1")}
              <br />
              {t("hero.title.line2")}
            </h2>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              {t("hero.desc")}
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/activities")}
                className="px-8 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors"
              >
                {t("hero.cta.activities")}
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById("conditions")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="px-8 py-3 border-2 border-teal-500 text-teal-500 rounded-lg font-medium hover:bg-teal-50 transition-colors"
              >
                {t("hero.cta.conditions")}
              </button>
            </div>
          </div>

          {/* Right Illustration */}
          <div className="flex justify-center">
            <div className="relative">
              <img
                src={HeroImage}
                alt={t("hero.imageAlt")}
                className="w-full h-auto max-w-md rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <section className="mx-auto max-w-7xl text-black">
          <h2 className="mb-8 text-xl md:text-2xl font-bold">
            {t("howItWorks.title")}
          </h2>

          <div className="grid gap-6 md:grid-cols-4">
            {(
              [
                {
                  step: t("howItWorks.steps.1.step"),
                  title: t("howItWorks.steps.1.title"),
                  desc: t("howItWorks.steps.1.desc"),
                },
                {
                  step: t("howItWorks.steps.2.step"),
                  title: t("howItWorks.steps.2.title"),
                  desc: t("howItWorks.steps.2.desc"),
                },
                {
                  step: t("howItWorks.steps.3.step"),
                  title: t("howItWorks.steps.3.title"),
                  desc: t("howItWorks.steps.3.desc"),
                },
                {
                  step: t("howItWorks.steps.4.step"),
                  title: t("howItWorks.steps.4.title"),
                  desc: t("howItWorks.steps.4.desc"),
                },
              ] as const
            ).map((it, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-2 text-sm font-semibold text-rose-500">
                  {it.step}
                </div>
                <h3 className="mb-2 text-lg font-bold">{it.title}</h3>
                <p className="text-sm text-gray-600">{it.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Conditions + Categories (boxed) */}
        <section className="mt-24 mb-24">
          <div className="grid gap-8 md:grid-cols-2">
            {/* === Box: เงื่อนไขการผ่านเกณฑ์กิจกรรม === */}
            <div
              id="conditions"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm scroll-mt-24 md:scroll-mt-28"
            >
              <h3 className="mb-6 text-xl md:text-2xl font-bold text-gray-900">
                {t("conditions.title", {
                  defaultValue: "เงื่อนไขการผ่านเกณฑ์กิจกรรม",
                })}
              </h3>

              <div className="space-y-5">
                {(
                  [
                    {
                      label: t("conditions.items.1.label", {
                        defaultValue: "ระดับของสกิล",
                      }),
                      text: t("conditions.items.1.text", {
                        defaultValue: "ต้องมีสกิลย่อยทุกสกิล รวม 10 Lv",
                      }),
                    },
                    {
                      label: t("conditions.items.2.label", {
                        defaultValue: "สกิลหลัก",
                      }),
                      text: t("conditions.items.2.text", {
                        defaultValue: "ต้องมีสกิลหลักอย่างน้อย 3 สกิล",
                      }),
                    },
                  ] as const
                ).map((c, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-500 text-white font-semibold">
                      {i + 1}
                    </div>
                    <div className="leading-snug">
                      <div className="font-semibold text-gray-900">
                        {c.label}
                      </div>
                      <div className="text-gray-700">{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* === Box: หมวดหมู่กิจกรรม === */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-6 text-xl md:text-2xl font-bold text-gray-900">
                {t("categories.title")}
              </h3>

              {!canFetch ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {t("categories.noServerUrl.prefix")}{" "}
                  <span className="font-semibold">SERVER_URL</span>{" "}
                  {t("categories.noServerUrl.suffix")}
                </div>
              ) : error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <div className="text-sm font-semibold text-rose-700">
                    {t("categories.error.title")}
                  </div>
                  <div className="mt-1 text-sm text-rose-700/90">
                    {error instanceof Error ? error.message : "Unknown error"}
                  </div>
                  <button
                    type="button"
                    onClick={() => mutate()}
                    className="mt-3 inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100/60"
                  >
                    {t("categories.error.retry")}
                  </button>
                </div>
              ) : isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm min-h-[52px] animate-pulse"
                    >
                      <div className="h-4 w-3/4 rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
              ) : majorCategories.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {t("categories.empty")}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                  {majorCategories.map((mc) => {
                    console.log("MC", mc.id, mc.name_TH, mc.name_EN);
                    const name = th ? mc.name_TH : mc.name_EN;

                    return (
                      <Link
                        key={mc.id}
                        to={`/activities?majorCategoryId=${encodeURIComponent(
                          String(mc.id)
                        )}`}
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3
                          text-sm text-gray-700 shadow-sm
                          flex items-center justify-start text-left min-h-[52px]
                          hover:bg-slate-50 hover:shadow-md transition"
                        title={`${mc.name_TH} (${mc.name_EN})`}
                      >
                        {t("categories.itemPrefix")}
                        {name}
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="mt-4">
                <Link
                  to="/activities"
                  className="text-sm font-medium text-rose-500 hover:text-rose-600"
                >
                  {t("categories.viewAll")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <div className="mb-24">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
            {t("benefits.title")}
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <h4 className="text-lg font-bold text-gray-900 mb-3">
                {t("benefits.student.title")}
              </h4>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>{t("benefits.student.items.1")}</li>
                <li>{t("benefits.student.items.2")}</li>
                <li>{t("benefits.student.items.3")}</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <h4 className="text-lg font-bold text-gray-900 mb-3">
                {t("benefits.staff.title")}
              </h4>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>{t("benefits.staff.items.1")}</li>
                <li>{t("benefits.staff.items.2")}</li>
                <li>{t("benefits.staff.items.3")}</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <h4 className="text-lg font-bold text-gray-900 mb-3">
                {t("benefits.university.title")}
              </h4>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>{t("benefits.university.items.1")}</li>
                <li>{t("benefits.university.items.2")}</li>
                <li>{t("benefits.university.items.3")}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section — full-bleed */}
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
        <div className="bg-[linear-gradient(180deg,#E6FAF6_0%,#56A8D3_100%)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              {t("cta.title")}
            </h2>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center justify-center px-6 md:px-7 py-3 rounded-lg
                  font-semibold text-[#2E6FA1] bg-white shadow
                  hover:bg-white/95 hover:shadow-md
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {t("cta.login")}
              </button>

              <button
                onClick={() => navigate("/activities")}
                className="inline-flex items-center justify-center px-6 md:px-7 py-3 rounded-lg
                  font-semibold text-white border border-white/80 bg-white/0
                  hover:bg-white/10
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {t("cta.viewAll")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <PrimaryFooter />
    </div>
  );
};

export default AboutUs;
