// import React from 'react';
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "th" ? "en" : "th";
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-slate-600"
    >
      <Globe size={18} className="inline-block mr-2 " />
      {i18n.language === "th" ? "EN" : "TH"}
    </button>
  );
}
