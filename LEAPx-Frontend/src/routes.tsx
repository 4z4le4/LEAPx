import type { ReactNode } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import ScrollToTop from "./components/common/ScrollToTop";
import { Role as ROLE, ROLE_ID } from "../utils/constants";

/* Layouts */
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminLayout from "./layouts/AdminLayout";

/* Public pages */
import Login from "./pages/Auth/Login";
import AboutUs from "./pages/AboutUs/AboutUs";
import NotFoundPage from "./pages/Error/NotFoundPage";
import CmuEntraIDCallback from "./pages/Auth/cmuEntraIDCallback";
import Leap_CMU from "./pages/Auth/Leap_CMU";
import Contact from "./pages/Contact/Contact";
import FAQ from "./pages/FAQ/FAQ";
import DashboardHome from "./pages/Dashboard/DashboardHome";
import Activities from "./pages/Activities/Activities";
import ActivityDetail from "./pages/Activities/ActivityDetail";

// scanner imports
import QRScannerPage from "./pages/scan/QRScannerPage";

/* User Dashboard pages */
import Overview from "./pages/Dashboard/Overview";
import Settings from "./pages/Dashboard/Settings";

import { ProfilePage } from "./pages/user/Profile/Profile";
import { Card_id } from "./pages/user/Card_id/Card_id";

/* Admin pages */
import AdminDashboard from "./pages/Admin_pages/Dashboard_Admin";
import AdminRolesManagement from "./pages/Admin_pages/RolesManagement";
import AdminSkillManagement from "./pages/Admin_pages/SkillManagement";

import AdminUserExpSkills from "./pages/Admin_pages/Tracking/UserExpSkills";
import AdminUserParticipationHistory from "./pages/Admin_pages/Tracking/UserParticipationHistory";

import AdminEventsList from "./pages/Admin_pages/EventManagement/EventsList";
import AdminCreateEvent from "./pages/Admin_pages/EventManagement/CreateEventPage";
import AdminEditEvent from "./pages/Admin_pages/EventManagement/EditEventPage";
import AdminEventCategories from "./pages/Admin_pages/EventManagement/EventCategories";
import AdminSkillLevels from "./pages/Admin_pages/EventManagement/SkillLevels";

import LeaveRequests from "./pages/Admin_pages/Participation/LeaveRequests";
import ParticipationHistory from "./pages/Admin_pages/Participation/ParticipationHistory";

import StaffAccept from "./pages/Admin_pages/Staff/StaffAccept";
import StaffAssignments from "./pages/Admin_pages/Staff/StaffAssignments";
import StaffCancellations from "./pages/Admin_pages/Staff/StaffCancellations";
import StaffRequestsHistory from "./pages/Admin_pages/Staff/StaffRequestsHistory";

import RegistrationReportList from "./pages/Admin_pages/ReportsRegistrations/RegistrationReportList";
import EvaluationForms from "./pages/Admin_pages/Evaluations/EvaluationForms";
import EvaluationReports from "./pages/Admin_pages/Evaluations/EvaluationReports";
import EvaluationPage from "./pages/Admin_pages/Evaluations/EvaluationPage";
import { mockEvaluation } from "./pages/Admin_pages/Evaluations/mockEvaluation";

// staff (user) pages
import MyStaffEvents from "./pages/Staff/MyStaffEvents";
import StaffEventRegistrationScannerPage from "./pages/Staff/StaffEventRegistrationScannerPage";

// organizer pages
import OrganizerEvents from "./pages/Organizer_pages/OrganizerEvents";
import OrganizerStaffCheckinScannerPage from "./pages/Organizer_pages/OrganizerStaffCheckinScannerPage";
import RegistrationReportDetail from "./pages/Admin_pages/ReportsRegistrations/RegistrationReportDetail";

/* ====== ROUTES single source of truth ====== */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  CMU_CALLBACK: "/cmuEntraIDCallback",
  LEAP: "/leap_cmu",
  TEST: "/test",
  CONTACT: "/contact",
  FAQ: "/faq",
  DashboardHome: "/home",
  ACTIVITIES: { ROOT: "/activities", ACTIVITY_DETAIL: "/activities/:slug" },
  DASHBOARD: {
    ROOT: "/dashboard",
    OVERVIEW: "/dashboard/overview",
    SETTINGS: "/dashboard/settings",
  },

  FORM: "/evaluations/:evaluationId",

  ADMIN: {
    ROOT: "/admin",
    DASHBOARD: "/admin/dashboard",
    ROLES: "/admin/roles",
    SKILLS: "/admin/skills",

    EVENTS: {
      ROOT: "/admin/events",
      LIST: "/admin/events",
      CREATE: "/admin/events/create",
      EDIT: "/admin/events/edit/:slug",
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

    REPORTS: {
      ROOT: "/admin/reports",
      REGISTRATIONS: "/admin/reports/registrations",
    },

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
  },

  // organizer
  ORGANIZER: {
    ROOT: "/organizer",
    EVENTS: "/organizer/events",
    STAFF_CHECKIN: "/organizer/events/:eventId/staff-checkin",
  },

  // user profile
  PROFILE: {
    ROOT: "/profile",
    CARD_ID: "/profile/card_id",
  },

  // scanner
  SCAN: {
    ROOT: "/scan",
  },

  STAFF: {
    ROOT: "/staff",
    MY_EVENTS: "/staff/my-events-staff",
    EVENT_REGISTRATION_SCAN: "/staff/events/:eventId/registration",
  },
} as const;

/* ===================== type guards ===================== */

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function normalizeRoleName(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * ดึง role name จาก user
 */
function extractRoleNames(user: unknown): string[] {
  if (!isRecord(user)) return [];

  const roles: string[] = [];

  // user.role: string
  if (typeof user.role === "string") {
    const r = normalizeRoleName(user.role);
    if (r) roles.push(r);
  }

  // user.role: object { name | code }
  if (isRecord(user.role)) {
    const code = normalizeRoleName(user.role.code);
    const name = normalizeRoleName(user.role.name);
    if (code) roles.push(code);
    if (name) roles.push(name);
  }

  // user.roles: array (string | object)
  if (Array.isArray(user.roles)) {
    for (const item of user.roles) {
      if (typeof item === "string") {
        const r = normalizeRoleName(item);
        if (r) roles.push(r);
      } else if (isRecord(item)) {
        const code = normalizeRoleName(item.code);
        const name = normalizeRoleName(item.name);
        if (code) roles.push(code);
        if (name) roles.push(name);
      }
    }
  }

  // optional: user.roleName
  if (typeof user.roleName === "string") {
    const r = normalizeRoleName(user.roleName);
    if (r) roles.push(r);
  }

  return Array.from(new Set(roles));
}

/**
 * ดึง role id จาก user
 * - user.roleId / user.role_id / user.roleID
 * - user.role?.id
 */
function extractRoleId(user: unknown): number | null {
  if (!isRecord(user)) return null;

  const direct =
    getNumber(user.roleId) ?? getNumber(user.role_id) ?? getNumber(user.roleID);
  if (direct !== null) return direct;

  if (isRecord(user.role)) {
    const nestedId = getNumber(user.role.id);
    if (nestedId !== null) return nestedId;
  }

  return null;
}

function isAdminAllowed(user: unknown): boolean {
  // 1) ถ้ามี roleId ให้เช็คด้วย ROLE_ID
  const roleId = extractRoleId(user);
  if (roleId !== null) {
    // role id >= ACTIVITY_ADMIN ถือว่าเข้า admin ได้
    return roleId >= ROLE_ID.ACTIVITY_ADMIN;
  }

  // 2) ถ้าไม่มี roleId ให้ fallback เช็คด้วย role name จาก constants
  const names = extractRoleNames(user);
  const allowedNames = new Set<string>([
    ROLE.SUPREME,
    ROLE.SKILL_ADMIN,
    ROLE.ACTIVITY_ADMIN,
  ]);

  return names.some((n) => allowedNames.has(n));
}

/* ===================== route wrappers ===================== */

type WrapperProps = { children: ReactNode };

// ProtectedRoute: เช็คแค่ login
const ProtectedRoute = ({ children }: WrapperProps) => {
  const auth = useAuth();

  const loading =
    isRecord(auth) && typeof auth.loading === "boolean" ? auth.loading : false;

  const isAuthenticated =
    isRecord(auth) && typeof auth.isAuthenticated === "boolean"
      ? auth.isAuthenticated
      : Boolean(isRecord(auth) && auth.user);

  if (loading) return <div aria-busy="true" />;

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;

  return <>{children}</>;
};

// AdminGateLayout: กันพิมพ์ /admin ตรง ๆ (login + role)
const AdminGateLayout = ({ children }: WrapperProps) => {
  const auth = useAuth();

  const loading =
    isRecord(auth) && typeof auth.loading === "boolean" ? auth.loading : false;

  const isAuthenticated =
    isRecord(auth) && typeof auth.isAuthenticated === "boolean"
      ? auth.isAuthenticated
      : Boolean(isRecord(auth) && auth.user);

  const user = isRecord(auth) ? auth.user : null;

  if (loading) return <div aria-busy="true" />;

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;

  if (!isAdminAllowed(user)) {
    return <Navigate to={ROUTES.DashboardHome} replace />;
  }

  return <>{children}</>;
};

const publicRoutes = [
  { path: ROUTES.HOME, element: <AboutUs /> },
  { path: ROUTES.LOGIN, element: <Login /> },
  { path: ROUTES.CMU_CALLBACK, element: <CmuEntraIDCallback /> },
  { path: ROUTES.LEAP, element: <Leap_CMU /> },
  { path: ROUTES.CONTACT, element: <Contact /> },
  { path: ROUTES.FAQ, element: <FAQ /> },
  { path: ROUTES.DashboardHome, element: <DashboardHome /> },
  { path: ROUTES.ACTIVITIES.ROOT, element: <Activities /> },
  { path: ROUTES.ACTIVITIES.ACTIVITY_DETAIL, element: <ActivityDetail /> },
  { path: ROUTES.PROFILE.ROOT, element: <ProfilePage /> },
  { path: ROUTES.PROFILE.CARD_ID, element: <Card_id /> },
  { path: ROUTES.SCAN.ROOT, element: <QRScannerPage /> },
  {
    path: ROUTES.FORM,
    element: <EvaluationPage evaluation={mockEvaluation} />,
  },
];

const dashboardRoutes = [
  { path: "overview", element: <Overview />, index: true },
  { path: "settings", element: <Settings /> },
];

const AppRoutes = () => (
  <Router>
    <ScrollToTop includeSearch behavior="auto" />
    <Routes>
      {/* public routes */}
      {publicRoutes.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={<PublicLayout>{element}</PublicLayout>}
        />
      ))}

      {/* Organizer */}
      <Route
        path={ROUTES.ORGANIZER.EVENTS}
        element={
          <ProtectedRoute>
            <PublicLayout>
              <OrganizerEvents />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.ORGANIZER.STAFF_CHECKIN}
        element={
          <ProtectedRoute>
            <PublicLayout>
              {/* ✅ เปลี่ยนจาก Placeholder เป็นหน้า UI ใหม่ */}
              <OrganizerStaffCheckinScannerPage />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      {/* Staff */}
      <Route
        path={ROUTES.STAFF.MY_EVENTS}
        element={
          <ProtectedRoute>
            <PublicLayout>
              <MyStaffEvents />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.STAFF.EVENT_REGISTRATION_SCAN}
        element={
          <ProtectedRoute>
            <PublicLayout>
              <StaffEventRegistrationScannerPage />
            </PublicLayout>
          </ProtectedRoute>
        }
      />

      {/* User Dashboard */}
      <Route
        path={ROUTES.DASHBOARD.ROOT}
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        {dashboardRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Route>

      {/* ===== Admin (กันพิมพ์ /admin ตรง ๆ) ===== */}
      <Route
        path={ROUTES.ADMIN.ROOT}
        element={
          <AdminGateLayout>
            <AdminLayout routes={ROUTES} />
          </AdminGateLayout>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard" element={<AdminDashboard />} />

        <Route path="roles" element={<AdminRolesManagement />} />
        <Route path="skills" element={<AdminSkillManagement />} />
        <Route path="user-exp-skills" element={<AdminUserExpSkills />} />
        <Route
          path="user-participation"
          element={<AdminUserParticipationHistory />}
        />

        <Route path="events">
          <Route index element={<AdminEventsList />} />
          <Route path="create" element={<AdminCreateEvent />} />
          <Route path="edit/:slug" element={<AdminEditEvent />} />
          <Route path="categories" element={<AdminEventCategories />} />
          <Route path="skill-levels" element={<AdminSkillLevels />} />
        </Route>

        <Route path="participation">
          <Route index element={<Navigate to="leave-requests" replace />} />
          <Route path="leave-requests" element={<LeaveRequests />} />
          <Route path="history" element={<ParticipationHistory />} />
        </Route>

        <Route path="staff">
          <Route index element={<Navigate to="assignments" replace />} />
          <Route path="accept" element={<StaffAccept />} />
          <Route path="assignments" element={<StaffAssignments />} />
          <Route path="cancellations" element={<StaffCancellations />} />
          <Route path="requests-history" element={<StaffRequestsHistory />} />
        </Route>

        <Route path="reports">
  <Route index element={<Navigate to="registrations" replace />} />
  <Route path="registrations" element={<RegistrationReportList />} />
  <Route path="registrations/:eventId" element={<RegistrationReportDetail />} />
</Route>

        <Route path="evaluations">
          <Route index element={<Navigate to="forms" replace />} />
          <Route path="forms" element={<EvaluationForms />} />
          <Route path="reports" element={<EvaluationReports />} />
        </Route>

        <Route path="tracking">
          <Route index element={<Navigate to="user-participation" replace />} />
          <Route path="user-exp-skills" element={<AdminUserExpSkills />} />
          <Route
            path="user-participation"
            element={<AdminUserParticipationHistory />}
          />
        </Route>

        <Route
          path="tracking/dashboard"
          element={<Navigate to="/admin/dashboard" replace />}
        />

        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* 404 */}
      <Route
        path="*"
        element={
          <PublicLayout>
            <NotFoundPage />
          </PublicLayout>
        }
      />
    </Routes>
  </Router>
);

export default AppRoutes;
