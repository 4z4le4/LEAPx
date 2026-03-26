// src/pages/Contact/Contact.tsx
import React, { useMemo } from "react";
import Navbar from "../../components/Navbar/Navbar";
import PrimaryFooter from "../../components/Footer/PrimaryFooter";
import { useTranslation } from "react-i18next";
import GoogleMapNoKey from "../../components/Event/GoogleMapNoKey";

function isThaiLang(lang?: string): boolean {
    return Boolean(lang && lang.toLowerCase().startsWith("th"));
}

const CONTACT_LAT = 18.795448643904432;
const CONTACT_LNG = 98.95251926625272;

const Contact: React.FC = () => {
    const { t, i18n } = useTranslation("contactPage");
    const th = isThaiLang(i18n.language);

    //  ใช้ embed iframe ได้เลย (GoogleMapNoKey จะ extract src ให้)
    const mapUrl =
        `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d427.2553999293222!2d98.95251926625272!3d18.795448643904432!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30da3b00086f7a71%3A0x52f0cc12b12dcb3b!2z4Lit4Liy4LiE4Liy4LijIDMw4Lib4Li1IOC4hOC4k-C4sOC4p-C4tOC4qOC4p-C4geC4o-C4o-C4oeC4qOC4suC4quC4leC4o-C5jA!5e1!3m2!1sth!2sth!4v1766522563633!5m2!1sth!2sth" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;

    const addressTH = "อาคาร 30 ปี คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเชียงใหม่";
    const addressEN =
        "30th Anniversary Building, Faculty of Engineering, Chiang Mai University";

    const address = th ? addressTH : addressEN;

    //  เปิดด้วยพิกัดจริง (ชัวร์กว่าเปิดด้วย address แล้วเพี้ยน)
    const openInMapsHref = useMemo(() => {
        return `https://www.google.com/maps?q=${CONTACT_LAT},${CONTACT_LNG}`;
    }, []);

    return (
        <div className="min-h-screen bg-[#f7f8f9]">
            <Navbar />

            <div className="mx-auto max-w-6xl px-4 py-10">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 text-center">
                        {t("title")}
                    </h1>
                    <p className="mt-3 text-center text-slate-600">{t("subtitle")}</p>
                </div>

                {/*  บล็อคเดียว อยู่กลาง */}
                <div className="mx-auto w-full max-w-3xl">
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                        {/* Primary */}
                        <h2 className="text-lg font-semibold text-slate-900">
                            {t("primary.title")}
                        </h2>

                        <ul className="mt-4 space-y-2 text-slate-700">
                            <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-semibold">{t("labels.email")}</span>
                                <a
                                    href="mailto:talentdev@cmu.ac.th"
                                    className="text-teal-600 hover:underline"
                                >
                                    talentdev@cmu.ac.th
                                </a>
                            </li>

                            <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-semibold">{t("labels.phone")}</span>
                                <span>-</span>
                            </li>

                            <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-semibold">{t("labels.hours")}</span>
                                <span>{t("primary.hoursValue")}</span>
                            </li>
                        </ul>

                        {/* Secondary */}
                        <div className="mt-8 border-t border-slate-100 pt-6">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {t("secondary.title")}
                            </h2>

                            <ul className="mt-4 space-y-2 text-slate-700">
                                <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="font-semibold">{t("labels.email")}</span>
                                    <span>-</span>
                                </li>
                                <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="font-semibold">{t("labels.phone")}</span>
                                    <span>-</span>
                                </li>
                                <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="font-semibold">{t("labels.hours")}</span>
                                    <span>-</span>
                                </li>
                            </ul>
                        </div>

                        {/* Issues */}
                        <div className="mt-8 border-t border-slate-100 pt-6">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {t("issues.title")}
                            </h2>
                            <ul className="mt-4 list-disc pl-5 space-y-2 text-slate-700">
                                <li>{t("issues.items.0")}</li>
                                <li>{t("issues.items.1")}</li>
                                <li>{t("issues.items.2")}</li>
                                <li>{t("issues.items.3")}</li>
                            </ul>
                        </div>

                        {/* Office + Map */}
                        <div className="mt-8 border-t border-slate-100 pt-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        {t("office.title")}
                                    </h2>
                                    <p className="mt-2 text-sm text-slate-600">{address}</p>
                                </div>

                                <a
                                    href={openInMapsHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    {t("office.openInMaps")}
                                </a>
                            </div>

                            <div className="mt-4">
                                {/*  ส่งเฉพาะ props ที่ GoogleMapNoKey รองรับจริง ๆ */}
                                <GoogleMapNoKey
                                    mapUrl={mapUrl}
                                    address={address}
                                    className="w-full h-[380px] rounded-2xl border border-slate-200"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <PrimaryFooter />
        </div>
    );
};

export default Contact;
