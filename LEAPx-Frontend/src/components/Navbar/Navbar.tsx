import React, { useEffect, useRef, useState } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  QrCode,
  // ClipboardCheck,
  Loader2,
  ScanHeart,
  ScanFace
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import Logo2_1 from "../../assets/logo/Logo2_1.png";
import LanguageSwitcher from "../Language/LanguageSwitcher";

type RoutesShape = {
  ADMIN?: {
    ROOT?: string;
  };
  STAFF?: {
    MY_EVENTS?: string;
  };
  ORGANIZER?: {
    ROOT?: string;
    EVENTS?: string;
  };
};

type Props = { routes?: RoutesShape };

const Navbar: React.FC<Props> = ({ routes }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, loading } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: "/home", label: t("nav.home") },
    { path: "/activities", label: t("nav.activities") },
    { path: "/profile/card_id", label: t("nav.qrcode") },
    { path: "/faq", label: t("nav.faq") },
    { path: "/contact", label: t("nav.contact") },
    { path: "/", label: t("nav.about") },
  ];

  const adminRoot: string = routes?.ADMIN?.ROOT ?? "/admin";
  const staffEventsPath: string =
    routes?.STAFF?.MY_EVENTS ?? "/staff/my-events-staff";
  const organizerEventsPath: string =
    routes?.ORGANIZER?.EVENTS ?? "/organizer/events";
  // const onAdminArea = location.pathname.startsWith(adminRoot);

  type UserRole = "SUPREME" | "SKILL_ADMIN" | "ACTIVITY_ADMIN" | string;
  type RoleValue = UserRole | number;

  function getRoleValue(u: unknown): RoleValue | undefined {
    if (!u || typeof u !== "object") return undefined;
    const obj = u as Record<string, unknown>;
    const role = obj["role"];
    const roleId = obj["role_id"];

    if (typeof role === "string") return role;
    if (typeof roleId === "number") return roleId;
    return undefined;
  }

  const roleValue = getRoleValue(user);

  const canSeeAdmin = (role?: RoleValue) => {
    if (role == null) return false;
    if (typeof role === "string") {
      return ["SUPREME", "SKILL_ADMIN", "ACTIVITY_ADMIN"].includes(role);
    }
    return role >= 4;
  };

  const showAdminBtn = isAuthenticated && canSeeAdmin(roleValue);
  const showOrganizerBtn = isAuthenticated && canSeeAdmin(roleValue);

  const toggleMenu = () => {
    setIsMenuOpen((s) => !s);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => setIsDropdownOpen((s) => !s);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handle = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsDropdownOpen(false);
      setIsMenuOpen(false);
      navigate("/");
    } catch {
      // handle error silently
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <img src={Logo2_1} alt="LEAP Logo" className="h-auto w-28 sm:w-40" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden 2xl:flex absolute inset-x-0 justify-center pointer-events-none">
            <div className="flex items-center gap-6 pointer-events-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`transition-colors ${isActive(link.path)
                    ? "text-teal-500 font-semibold"
                    : "text-gray-700 hover:text-teal-400"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right desktop */}
          <div className="ml-auto hidden 2xl:flex items-center space-x-4">
            <LanguageSwitcher />
            
            {loading ? (
              <div className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={toggleDropdown}
                  className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors min-w-0"
                >
                  {user.photo && user.photo !== "-" ? (
                    <img
                      src={user.photo}
                      alt={user.firstName}
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <User size={18} className="shrink-0" />
                  )}

                  <span className="min-w-0 max-w-[180px] truncate">
                    {user.firstName} {user.lastName}
                  </span>

                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform ${isDropdownOpen ? "rotate-180" : ""
                      }`}
                    aria-hidden="true"
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 w-64 overflow-hidden">
                    {/* User Section */}
                    <div className="px-4 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        {user.photo && user.photo !== "-" ? (
                          <img
                            src={user.photo}
                            alt={user.firstName}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center ring-2 ring-white">
                            <User size={20} className="text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-slate-600 truncate">
                            {user.email || "No email"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* User Menu */}
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigate("/profile");
                          setIsDropdownOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-slate-700 w-full text-left hover:bg-slate-50 transition-colors"
                      >
                        <User size={18} className="text-slate-500" />
                        <span className="font-medium">{t("nav.profile")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigate("/profile/card_id");
                          setIsDropdownOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-slate-700 w-full text-left hover:bg-slate-50 transition-colors"
                      >
                        <QrCode size={18} className="text-slate-500" />
                        <span className="font-medium">{t("nav.qrcode")}</span>
                      </button>
                    </div>

                    {/* Staff Section */}
                    <div className="border-t border-slate-200">
                      <div className="px-4 py-2 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Staff
                        </p>
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            navigate(staffEventsPath);
                            setIsDropdownOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-slate-700 w-full text-left hover:bg-slate-50 transition-colors"
                        >
                          <ScanFace size={18} className="text-blue-500" />
                          <span className="font-medium">{t("nav.staff")}</span>
                        </button>
                      </div>
                    </div>

                    {/* Admin Section */}
                    {(showAdminBtn || showOrganizerBtn) && (
                      <div className="border-t border-slate-200">
                        <div className="px-4 py-2 bg-slate-50">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Admin
                          </p>
                        </div>
                        <div className="py-1">
                          {/* {showOrganizerBtn && (
                            <button
                              type="button"
                              onClick={() => {
                                navigate(organizerEventsPath);
                                setIsDropdownOpen(false);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 text-slate-700 w-full text-left hover:bg-slate-50 transition-colors"
                            >
                              <ClipboardCheck size={18} className="text-purple-500" />
                              <span className="font-medium">{t("nav.organizer")}</span>
                            </button>
                          )} */}

                          {showAdminBtn && (
                            <button
                              type="button"
                              onClick={() => {
                                navigate(adminRoot);
                                setIsDropdownOpen(false);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 text-slate-700 w-full text-left hover:bg-slate-50 transition-colors"
                            >
                              <LayoutDashboard size={18} className="text-amber-500" />
                              <span className="font-medium">{t("nav.admin", "Admin")}</span>
                            </button>
                          )}

                        <Link
                          to={organizerEventsPath}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <ScanHeart size={18} className="text-green-500" />
                          <span className="font-medium">{t("nav.scanStaff")}</span>
                        </Link>
                        
                        </div>
                      </div>
                    )}

                    {/* Logout Section */}
                    <div className="border-t border-slate-200 py-1">
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className="flex items-center gap-3 px-4 py-2.5 text-red-600 w-full text-left hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={18} />
                        <span className="font-medium">{t("nav.logout")}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors whitespace-nowrap"
              >
                {t("nav.login")}
              </Link>
            )}
          </div>

          {/* Mobile/Tablet button */}
          <button
            type="button"
            onClick={toggleMenu}
            className="ml-auto 2xl:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors bg-white"
          >
            <span className="sr-only">Toggle menu</span>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile/Tablet Menu */}
        {isMenuOpen && (
          <div className="2xl:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-4 py-2 hover:bg-gray-50 rounded transition-colors ${isActive(link.path)
                    ? "text-teal-500 font-semibold"
                    : "text-gray-700 hover:text-teal-300"
                    }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Language Switcher Mobile */}
              <div className="px-4 pt-2">
                <div className="w-full [&_button]:w-full [&_a]:w-full">
                  <LanguageSwitcher />
                </div>
              </div>

              {/* Actions Mobile */}
              <div className="flex flex-col space-y-2 px-4 pt-2">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 bg-slate-100 text-slate-600 px-4 py-3 rounded-lg">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : isAuthenticated && user ? (
                  <>
                    {/* User Info */}
                    <div className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg border border-teal-100">
                      {user.photo && user.photo !== "-" ? (
                        <img
                          src={user.photo}
                          alt={user.firstName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center ring-2 ring-white">
                          <User size={20} className="text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-slate-600 truncate">
                          {user.email || "No email"}
                        </p>
                      </div>
                    </div>

                    {/* User Actions */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 pt-2">
                        User
                      </p>
                      <Link
                        to="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <User size={18} className="text-slate-500" />
                        <span className="font-medium">{t("nav.profile")}</span>
                      </Link>
                      <Link
                        to="/profile/card_id"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <QrCode size={18} className="text-slate-500" />
                        <span className="font-medium">{t("nav.qrcode")}</span>
                      </Link>
                    </div>

                    {/* Staff Actions */}
                    <div className="space-y-1 pt-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                        Staff
                      </p>
                      <Link
                        to={staffEventsPath}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <ScanFace size={18} className="text-blue-500" />
                        <span className="font-medium">{t("nav.staff")}</span>
                      </Link>
                    </div>

                    {/* Admin Actions */}
                    {(showAdminBtn || showOrganizerBtn) && (
                      <div className="space-y-1 pt-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                          Admin
                        </p>
                        {/* {showOrganizerBtn && (
                          <Link
                            to={organizerEventsPath}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <ClipboardCheck size={18} className="text-purple-500" />
                            <span className="font-medium">{t("nav.organizer")}</span>
                          </Link>
                        )} */}

                        {showAdminBtn && (
                          <Link
                            to={adminRoot}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <LayoutDashboard size={18} className="text-amber-500" />
                            <span className="font-medium">{t("nav.admin", "Admin")}</span>
                          </Link>
                        )}

                        <Link
                          to={organizerEventsPath}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <ScanHeart size={18} className="text-green-500" />
                          <span className="font-medium">{t("nav.scanStaff")}</span>
                        </Link>

                      </div>
                    )}

                    {/* Logout */}
                    <div className="pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className="flex items-center justify-center gap-3 w-full bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <LogOut size={18} />
                        <span className="font-medium">{t("nav.logout")}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors text-center"
                  >
                    {t("nav.login")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;