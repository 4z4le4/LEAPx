import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import th from "./locales/th.json";
import thActivitiesDetails from "./locales/th/activityDetail.json";
import thEventCard from "./locales/th/eventCard.json";
import thActivitiesPage from "./locales/th/activitiesPage.json";
import thDashboardHome from "./locales/th/dashboardHome.json";
import thEventCardMini from "./locales/th/eventCardmini.json";
import thFooter from "./locales/th/footer.json";
import thMyStaffEvents from "./locales/th/myStaffEvents.json";
import thOrganizerEvents from "./locales/th/organizerEvents.json";
import thFAQ from "./locales/th/faq.json";
import aboutUsTH from "./locales/th/aboutUs.json";
import profilePageTH from "./locales/th/profilePage.json";
import thContactPage from "./locales/th/contactPage.json";

import en from "./locales/en.json";
import enActivitiesDetails from "./locales/en/activityDetail.json";
import enEventCard from "./locales/en/eventCard.json";
import enActivitiesPage from "./locales/en/activitiesPage.json";
import enDashboardHome from "./locales/en/dashboardHome.json";
import enEventCardMini from "./locales/en/eventCardmini.json";
import enFooter from "./locales/en/footer.json";
import enMyStaffEvents from "./locales/en/myStaffEvents.json";
import enOrganizerEvents from "./locales/en/organizerEvents.json";
import enFAQ from "./locales/en/faq.json";
import aboutUsEN from "./locales/en/aboutUs.json";
import profilePageEN from "./locales/en/profilePage.json";
import enContactPage from "./locales/en/contactPage.json";


i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      th: {
        translation: th,
        activityDetail: thActivitiesDetails,
        eventCard: thEventCard,
        activitiesPage: thActivitiesPage,
        dashboardHome: thDashboardHome,
        eventCardMini: thEventCardMini,
        footer: thFooter,

        myStaffEvents: thMyStaffEvents,
        organizerEvents: thOrganizerEvents,

        faq: thFAQ,
        aboutUs: aboutUsTH,
        profilePage: profilePageTH,
        contactPage: thContactPage,
      },
      en: {
        translation: en,
        activityDetail: enActivitiesDetails,
        eventCard: enEventCard,
        activitiesPage: enActivitiesPage,
        dashboardHome: enDashboardHome,
        eventCardMini: enEventCardMini,
        footer: enFooter,

        myStaffEvents: enMyStaffEvents,
        organizerEvents: enOrganizerEvents,

        faq: enFAQ,
        aboutUs: aboutUsEN,
        profilePage: profilePageEN,
        contactPage: enContactPage,
      },
    },

    fallbackLng: "th",
    lng: "th",

    ns: [
      "translation",
      "activityDetail",
      "eventCard",
      "activitiesPage",
      "dashboardHome",
      "eventCardMini",
      "footer",

      "myStaffEvents",
      "organizerEvents",


      "faq",
      "aboutUs",
      "profilePage",
      "contactPage",
    ],
    defaultNS: "translation",

    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;