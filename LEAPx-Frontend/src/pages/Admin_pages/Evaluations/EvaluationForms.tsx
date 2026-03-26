import { useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import CreateEvaluationModal from "./components/CreateEvaluationModal";

/* ===================== types ===================== */

type FormType = "PRE" | "POST";
type FormStatus = "ACTIVE" | "INACTIVE";

type EvaluationItem = {
  id: number;
  eventTitle: string;
  activityStart: string;
  activityEnd: string;
  type: FormType;
  formStart: string | null;
  formEnd: string | null;
  respondentCount: number;
  status: FormStatus;
};

/* ===================== helpers ===================== */

function formatDateTH(date: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(status: FormStatus) {
  if (status === "ACTIVE") {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  return "bg-rose-100 text-rose-700 border-rose-200";
}

function statusText(status: FormStatus) {
  return status === "ACTIVE" ? "เปิดใช้งาน" : "ปิดใช้งาน";
}

/* ===================== mock data ===================== */

const MOCK: EvaluationItem[] = [
  {
    id: 1,
    eventTitle: "กิจกรรมรับน้องวิศวะคอมพิวเตอร์",
    activityStart: "2025-07-23",
    activityEnd: "2025-07-28",
    type: "PRE",
    formStart: "2025-07-23",
    formEnd: "2025-07-28",
    respondentCount: 100,
    status: "ACTIVE",
  },
  {
    id: 2,
    eventTitle: "กิจกรรมรับน้องวิศวะคอมพิวเตอร์",
    activityStart: "2025-07-23",
    activityEnd: "2025-07-28",
    type: "POST",
    formStart: "2025-07-23",
    formEnd: "2025-07-28",
    respondentCount: 100,
    status: "INACTIVE",
  },
];

/* ===================== component ===================== */

export default function EvaluationForms() {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [openModal, setOpenModal] = useState(false);

  const rows = useMemo(() => {
    return MOCK.filter((item) =>
      item.eventTitle.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  const groupedRows = useMemo(() => {
    const map = new Map<string, EvaluationItem[]>();

    rows.forEach((item) => {
      const key = `${item.eventTitle}-${item.activityStart}-${item.activityEnd}`;

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push(item);
    });

    // 👉 sort แต่ละ group ตรงนี้
    map.forEach((group) => {
      group.sort((a, b) => {
        if (a.type === "PRE" && b.type === "POST") return -1;
        if (a.type === "POST" && b.type === "PRE") return 1;
        return 0;
      });
    });

    return Array.from(map.values());
  }, [rows]);

  return (
    <div className="w-full px-8 py-6">
      {/* breadcrumb */}
      <div className="text-xs text-slate-500 mb-1">
        แบบประเมิน &gt;{" "}
        <span className="text-teal-700 font-medium">จัดการแบบประเมิน</span>
      </div>

      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          จัดการแบบประเมิน
        </h1>

        <button
          onClick={() => setOpenModal(true)}
          className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          <Plus className="w-4 h-4" />
          สร้างแบบประเมิน
        </button>
      </div>

      {/* filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อกิจกรรม..."
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full lg:w-[190px]">
          <div className="relative h-10">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 w-full rounded-full border border-slate-200 bg-white pl-4 pr-3 text-xs lg:text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
            />
          </div>
        </div>
      </div>

      {/* table (ใช้แบบเดิม) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-100 text-xs text-slate-600">
              <tr>
                <th className="text-left py-3 px-4 font-medium">ชื่อกิจกรรม</th>
                <th className="text-left py-3 px-4 font-medium">
                  วันที่กิจกรรม
                </th>
                <th className="text-left py-3 px-4 font-medium">
                  ประเภทแบบฟอร์ม
                </th>
                <th className="text-left py-3 px-4 font-medium">
                  ระยะเวลาแบบฟอร์ม
                </th>
                <th className="text-left py-3 px-4 font-medium">จำนวนคนกรอก</th>
                <th className="text-left py-3 px-4 font-medium">สถานะ</th>
                <th className="text-center py-3 px-4 font-medium">การจัดการ</th>
              </tr>
            </thead>

            <tbody>
              {groupedRows.map((group) =>
                group.map((r, index) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    {/* ===== ชื่อกิจกรรม ===== */}
                    {index === 0 && (
                      <td
                        rowSpan={group.length}
                        className="py-4 px-4 font-medium text-slate-800 align-top"
                      >
                        {r.eventTitle}
                      </td>
                    )}

                    {/* ===== วันที่กิจกรรม ===== */}
                    {index === 0 && (
                      <td
                        rowSpan={group.length}
                        className="py-4 px-4 align-top border-r border-slate-200"
                      >
                        เริ่ม : {formatDateTH(r.activityStart)}
                        <br />
                        จบ : {formatDateTH(r.activityEnd)}
                      </td>
                    )}

                    {/* ===== ประเภท ===== */}
                    <td className="py-4 px-4">
                      {r.type === "PRE" ? "Pre-Test" : "Post-Test"}
                    </td>

                    {/* ===== ระยะเวลาแบบฟอร์ม ===== */}
                    <td className="py-4 px-4">
                      เริ่ม : {formatDateTH(r.formStart)}
                      <br />
                      จบ : {formatDateTH(r.formEnd)}
                    </td>

                    {/* ===== จำนวน ===== */}
                    <td className="py-4 px-4">{r.respondentCount} คน</td>

                    {/* ===== สถานะ ===== */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusBadge(
                          r.status,
                        )}`}
                      >
                        {statusText(r.status)}
                      </span>
                    </td>

                    {/* ===== การจัดการ ===== */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button className="text-slate-600 hover:text-slate-900">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="text-rose-600 hover:text-rose-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )),
              )}

              {groupedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    ไม่พบข้อมูลแบบประเมิน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateEvaluationModal
        open={openModal}
        onClose={() => setOpenModal(false)}
      />
    </div>
  );
}
