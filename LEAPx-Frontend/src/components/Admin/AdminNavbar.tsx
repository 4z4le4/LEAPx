// src/components/Admin/AdminNavbar.tsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Monitor,
  CalendarDays,
  Users,
  FileBarChart2,
  ClipboardCheck,
  ClipboardList,
  Activity,
  UserCog,
  BadgeCheck,
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Logo2_1 from "../../assets/logo/Logo2_1.png";
import LanguageSwitcher from "../Language/LanguageSwitcher";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

/** ===== Props & Types ===== */
type RoutesShape = {
  ADMIN: {
    ROOT: string;
    DASHBOARD: string;
    ROLES: string;
    SKILLS: string;
    EVENTS: {
      ROOT: string;
      LIST: string;
      CREATE: string;
      CATEGORIES: string;
      SKILL_LEVELS: string;
    };
    PARTICIPATION: { ROOT: string; LEAVE_REQUESTS: string; HISTORY: string };
    STAFF: {
      ROOT: string;
      ACCEPT: string;
      ASSIGNMENTS: string;
      CANCELLATIONS: string;
      REQUESTS_HISTORY: string;
    };
    REPORTS: { ROOT?: string; REGISTRATIONS: string };
    EVALUATIONS: { ROOT: string; FORMS: string; REPORTS: string };
    TRACKING: {
      ROOT: string;
      USER_EXP_SKILLS: string;
      USER_PARTICIPATION: string;
    };
  };
};

type Props = {
  mobile?: boolean;
  onCloseMobile?: () => void;

  routes?: RoutesShape;

  /** โหมดพับ (icon-only) */
  collapsed?: boolean;

  /** callback ตอนกดพับ/ขยาย */
  onToggleCollapsed?: () => void;
};

type RoleName =
  | "SUPREME"
  | "SKILL_ADMIN"
  | "ACTIVITY_ADMIN"
  | "STUDENT"
  | "ALUMNI"
  | "USER";

type Item = { label: string; to: string; roles?: RoleName[] };

type Group =
  | {
    id: string;
    label: string;
    icon: LucideIcon;
    to: string;
    roles?: RoleName[] | undefined;
  }
  | {
    id: string;
    label: string;
    icon: LucideIcon;
    base?: string;
    items: Item[];
    roles?: RoleName[] | undefined;
  };

type AdminRoutesResolved = RoutesShape["ADMIN"];

const DEFAULT_ADMIN_ROUTES: AdminRoutesResolved = {
  ROOT: "/admin",
  DASHBOARD: "/admin/dashboard",
  ROLES: "/admin/roles",
  SKILLS: "/admin/skills",
  EVENTS: {
    ROOT: "/admin/events",
    LIST: "/admin/events",
    CREATE: "/admin/events/create",
    CATEGORIES: "/admin/events/categories",
    SKILL_LEVELS: "/admin/events/skill-levels",
  },
  PARTICIPATION: {
    ROOT: "/admin/participation",
    LEAVE_REQUESTS: "/admin/participation/leave-requests",
    HISTORY: "/admin/participation/history",
  },
  STAFF: {
    ROOT: "/admin/staff",
    ACCEPT: "/admin/staff/accept",
    ASSIGNMENTS: "/admin/staff/assignments",
    CANCELLATIONS: "/admin/staff/cancellations",
    REQUESTS_HISTORY: "/admin/staff/requests-history",
  },
  REPORTS: { REGISTRATIONS: "/admin/reports/registrations" },
  EVALUATIONS: {
    ROOT: "/admin/evaluations",
    FORMS: "/admin/evaluations/forms",
    REPORTS: "/admin/evaluations/reports",
  },
  TRACKING: {
    ROOT: "/admin/tracking",
    USER_EXP_SKILLS: "/admin/tracking/user-exp-skills",
    USER_PARTICIPATION: "/admin/tracking/user-participation",
  },
};

const AdminNavbar: React.FC<Props> = ({
  mobile,
  onCloseMobile,
  routes,
  collapsed = false,
  onToggleCollapsed,
}) => {
  const { i18n } = useTranslation();
  const isTH = i18n.language?.startsWith("th");
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const R: AdminRoutesResolved = useMemo(() => {
    return routes?.ADMIN ?? DEFAULT_ADMIN_ROUTES;
  }, [routes]);

  const L = useMemo(() => {
    return isTH
      ? {
        dashboard: "แดชบอร์ด",
        events: "จัดการกิจกรรม",
        staff: "จัดการสตาฟ",
        regReports: "รายงานการลงทะเบียน",
        participation: "การเข้าร่วมกิจกรรม",
        evaluation: "แบบประเมิน",
        tracking: "ติดตามผู้ใช้",
        roles: "จัดการบทบาทผู้ใช้งาน",
        skills: "จัดการสกิลภายในระบบ",
        events_all: "กิจกรรมทั้งหมด",
        events_cats: "หมวดหมู่สาขาที่จัดทำ",
        events_skillLevels: "จัดการแต้มสกิล",
        staff_accept: "ตรวจสอบคำขอสมัครสตาฟ",
        staff_cancel: "ตรวจสอบคำขอยกเลิกสตาฟ",
        staff_history: "ประวัติคำขอสมัคร/ยกเลิก",
        staff_assign: "มอบหมายหน้าที่สตาฟ",
        participation_leave: "คำขอยกเลิก/ลา",
        participation_history: "ประวัติคำขอยกเลิก/ลา",
        evaluation_forms: "จัดการแบบประเมิน",
        evaluation_reports: "รายงานแบบประเมิน",
        tracking_participation: "ประวัติการเข้าร่วมกิจกรรม",
        tracking_exp: "ประวัติคะแนน EXP และทักษะ",
        backToSite: "กลับหน้าเว็บไซต์",
        closeMenu: "ปิดเมนู",
        collapse: "พับเมนู",
        expand: "ขยายเมนู",
      }
      : {
        dashboard: "Dashboard",
        events: "Event Management",
        staff: "Staff",
        regReports: "Registration Reports",
        participation: "Participation",
        evaluation: "Evaluation Forms",
        tracking: "Tracking",
        roles: "Role Management",
        skills: "Skill Management",
        events_all: "All Events",
        events_cats: "Event Categories",
        events_skillLevels: "Skill Points",
        staff_accept: "Review Staff Applications",
        staff_cancel: "Review Staff Cancellations",
        staff_history: "Application/Cancellation History",
        staff_assign: "Staff Assignments",
        participation_leave: "Leave/Cancel Requests",
        participation_history: "Leave/Cancel History",
        evaluation_forms: "Manage Forms",
        evaluation_reports: "Evaluation Reports",
        tracking_participation: "User Participation",
        tracking_exp: "User EXP & Skills",
        backToSite: "Back to site",
        closeMenu: "Close menu",
        collapse: "Collapse",
        expand: "Expand",
      };
  }, [isTH]);

  const groups: Group[] = useMemo(
    () => [
      { id: "dashboard", label: L.dashboard, icon: Monitor, to: R.DASHBOARD },

      {
        id: "events",
        label: L.events,
        icon: CalendarDays,
        base: R.EVENTS.ROOT,
        items: [
          { label: L.events_all, to: R.EVENTS.LIST },
          { label: L.events_cats, to: R.EVENTS.CATEGORIES },
          { label: L.events_skillLevels, to: R.EVENTS.SKILL_LEVELS },
        ],
      },

      {
        id: "staff",
        label: L.staff,
        icon: Users,
        base: R.STAFF.ROOT,
        items: [
          { label: L.staff_accept, to: R.STAFF.ACCEPT },
          { label: L.staff_cancel, to: R.STAFF.CANCELLATIONS },
          { label: L.staff_history, to: R.STAFF.REQUESTS_HISTORY },
          { label: L.staff_assign, to: R.STAFF.ASSIGNMENTS },
        ],
      },

      {
        id: "regReports",
        label: L.regReports,
        icon: FileBarChart2,
        to: R.REPORTS.REGISTRATIONS,
      },

      {
        id: "participation",
        label: L.participation,
        icon: ClipboardCheck,
        base: R.PARTICIPATION.ROOT,
        items: [
          { label: L.participation_leave, to: R.PARTICIPATION.LEAVE_REQUESTS },
          { label: L.participation_history, to: R.PARTICIPATION.HISTORY },
        ],
      },

      {
        id: "evaluation",
        label: L.evaluation,
        icon: ClipboardList,
        base: R.EVALUATIONS.ROOT,
        items: [
          { label: L.evaluation_forms, to: R.EVALUATIONS.FORMS },
          { label: L.evaluation_reports, to: R.EVALUATIONS.REPORTS },
        ],
      },

      {
        id: "tracking",
        label: L.tracking,
        icon: Activity,
        base: R.TRACKING.ROOT,
        items: [
          {
            label: L.tracking_participation,
            to: R.TRACKING.USER_PARTICIPATION,
          },
          { label: L.tracking_exp, to: R.TRACKING.USER_EXP_SKILLS },
        ],
      },

      { id: "roles", label: L.roles, icon: UserCog, to: R.ROLES },
      { id: "skills", label: L.skills, icon: BadgeCheck, to: R.SKILLS },
    ],
    [L, R]
  );

  const initialOpen = useMemo(() => {
    const obj: Record<string, boolean> = {};
    groups.forEach((g) => {
      if ("items" in g) {
        const hit =
          g.items.some((it) => location.pathname.startsWith(it.to)) ||
          (g.base ? location.pathname.startsWith(g.base) : false);
        obj[g.id] = hit;
      }
    });
    return obj;
  }, [groups, location.pathname]);

  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen);

  useEffect(() => {
    setOpen(initialOpen);
  }, [initialOpen]);

  const Content = (
    <div className="h-full flex flex-col bg-white" style={{ backgroundImage: "none" }}>
      {/* Header */}
      <div
        className="shrink-0 border-b bg-white relative overflow-hidden"
        style={{ backgroundImage: "none" }}
      >
        {/* ✅ ทับทุกอย่างที่โผล่ซ้อนใน header แบบชัวร์สุด */}
        <div className="pointer-events-none absolute inset-0 bg-white z-[1]" aria-hidden="true" />

        {/* ✅ เนื้อหา header ให้อยู่เหนือ overlay */}
        <div className="relative z-[2] px-3 pt-3">
          {/* แถวบน: โลโก้ + ปุ่มพับ/ขยาย */}
          <div className="relative flex items-center justify-between gap-2">
            {/* โลโก้ */}
            <button
              type="button"
              onClick={() => navigate("/home")}
              title={L.backToSite}
              className="flex items-center gap-2 rounded-xl hover:bg-slate-50 px-2 py-2"
            >
              <img
                src={Logo2_1}
                alt="LEAP Admin"
                className={["select-none", collapsed ? "hidden" : "w-40 h-auto"].join(" ")}
                draggable={false}
              />
            </button>

            {/* ✅ Desktop: ปุ่มพับ/ขยาย - ตอนพับให้อยู่กลาง */}
            {!mobile && (
              <button
                type="button"
                onClick={onToggleCollapsed}
                className={[
                  "rounded-xl p-2 hover:bg-slate-100",
                  collapsed ? "absolute left-1/2 -translate-x-1/2" : "",
                ].join(" ")}
                aria-label={collapsed ? L.expand : L.collapse}
                title={collapsed ? L.expand : L.collapse}
              >
                {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            )}

            {/* mobile close */}
            {mobile && (
              <button
                onClick={() => onCloseMobile?.()}
                className="ml-auto rounded-xl p-2 hover:bg-slate-100"
                aria-label={L.closeMenu}
                title={L.closeMenu}
                type="button"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* ✅ user + language
              - ตอนพับ: ซ่อนจุดเขียว + ซ่อน LanguageSwitcher */}
          {!collapsed && (
            <div className="mt-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  className="flex-1 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 bg-white"
                  title={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()}
                  type="button"
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="truncate text-sm text-slate-700 font-medium">
                    {user ? `${user.firstName} ${user.lastName}` : isTH ? "ผู้ดูแลระบบ" : "Admin"}
                  </span>
                </button>

                <div className="shrink-0">
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          )}

          {/* ตอนพับ: เว้นระยะนิดเพื่อไม่ให้เมนูชิดเกิน */}
          {collapsed && <div className="mt-2 mb-2" />}
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-2 pb-6 pt-2 bg-white" style={{ backgroundImage: "none" }}>
        {groups.map((g) => {
          const Icon = g.icon;

          // single link
          if ("to" in g) {
            const active = location.pathname === g.to;

            return (
              <div key={g.id} className="px-1 mb-1">
                <NavLink
                  to={g.to}
                  className={[
                    "flex items-center rounded-xl transition",
                    collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3",
                    active
                      ? "bg-teal-50 text-teal-700 border border-teal-200"
                      : "text-slate-800 hover:bg-slate-50",
                  ].join(" ")}
                  title={g.label}
                >
                  <Icon size={20} className={active ? "text-teal-600" : "text-slate-700"} />
                  {!collapsed && <span className="text-base">{g.label}</span>}
                </NavLink>
              </div>
            );
          }

          // group
          const isOpen = open[g.id] ?? false;
          const anyActive =
            g.items.some((it) => location.pathname.startsWith(it.to)) ||
            (g.base ? location.pathname.startsWith(g.base) : false);

          const onClickGroup = () => {
            // ตอนพับ: กดแล้วไปหน้าแรกของกลุ่ม
            if (collapsed) {
              const first = g.items?.[0]?.to ?? g.base ?? R.ROOT;
              navigate(first);
              return;
            }
            setOpen((s) => ({ ...s, [g.id]: !isOpen }));
          };

          return (
            <div key={g.id} className="px-1 mb-1">
              <button
                onClick={onClickGroup}
                className={[
                  "w-full flex items-center rounded-xl transition",
                  collapsed ? "justify-center px-2 py-3" : "justify-between px-3 py-3",
                  anyActive
                    ? "bg-teal-50 text-teal-700 border border-teal-200"
                    : "text-slate-800 hover:bg-slate-50",
                ].join(" ")}
                type="button"
                title={g.label}
              >
                <span className={collapsed ? "inline-flex items-center" : "inline-flex items-center gap-3"}>
                  <Icon size={20} className={anyActive ? "text-teal-600" : "text-slate-700"} />
                  {!collapsed && <span className="text-base">{g.label}</span>}
                </span>

                {!collapsed && (
                  <ChevronDown
                    size={18}
                    className={["transition-transform", isOpen ? "rotate-180" : ""].join(" ")}
                  />
                )}
              </button>

              {!collapsed && isOpen && (
                <div className="mt-1 space-y-1 pl-10 pr-2">
                  {g.items.map((it) => {
                    const isBaseItem = g.base && it.to === g.base;
                    const active = isBaseItem
                      ? location.pathname === it.to
                      : location.pathname.startsWith(it.to);

                    return (
                      <NavLink
                        key={it.to}
                        to={it.to}
                        {...(isBaseItem ? { end: true } : {})}
                        className={[
                          "block rounded-lg px-3 py-2 text-sm transition",
                          active
                            ? "bg-teal-50 text-teal-700 border border-teal-200"
                            : "text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {it.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  // mobile overlay
  if (mobile) {
    return (
      <div className="fixed inset-0 z-50">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => onCloseMobile?.()}
          aria-hidden="true"
        />
        <aside
          className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl overflow-hidden"
          style={{ backgroundImage: "none" }}
        >
          {Content}
        </aside>
      </div>
    );
  }

  // desktop: layout จะเป็นคนครอบ aside เอง
  return Content;
};

export default AdminNavbar;
