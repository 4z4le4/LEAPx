// src/layouts/AdminLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import AdminNavbar from "../components/Admin/AdminNavbar";
import type { ComponentProps } from "react";

type Props = {
  routes?: ComponentProps<typeof AdminNavbar>["routes"];
};

const STORAGE_KEY = "leap_admin_sidebar_collapsed";

const AdminLayout: React.FC<Props> = ({ routes }) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  const sidebarWidthClass = collapsed ? "w-20" : "w-[280px]";

  const gridStyle = useMemo<React.CSSProperties>(() => {
    return {
      gridTemplateColumns: collapsed ? "80px 1fr" : "280px 1fr",
    };
  }, [collapsed]);

  return (
    <div className="min-h-screen bg-slate-50 grid" style={gridStyle}>
      {/* Sidebar */}
      <aside
        className={["bg-white bg-none border-r h-screen sticky top-0", sidebarWidthClass].join(
          " "
        )}
        // ✅ ทับ watermark/โลโก้ซ้อนจาก background-image ที่อาจถูกตั้งจาก global/ที่อื่น
        style={{ backgroundImage: "none" }}
      >
        <AdminNavbar
          routes={routes}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
        />
      </aside>

      {/* Content: กว้างเต็มจอเสมอ */}
      <main className="min-h-screen w-full">
        {/* ถ้าอยากให้ “เต็มจอจริง ๆ” ลด padding ตรงนี้ได้ */}
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
