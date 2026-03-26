import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, ChevronDown, Download } from "lucide-react";

import { useEventParticipants } from "./hooks/useEventParticipants";

import EventBannerLayout from "./components/EventBannerLayout";
import ParticipantStatusBadge from "./components/ParticipantStatusBadge";

import { formatDate } from "./utils/eventHelpers";

import { backend_url } from "../../../../utils/constants";

export default function RegistrationReportDetail() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { event, participants, data, loading, error } =
    useEventParticipants(eventId, page, search, status);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  function exportExcel() {
    if (!eventId) return;

    const url = `${backend_url}/api/events/${eventId}/participants?format=xlsx`;

    window.open(url, "_blank");
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-red-500">
        โหลดข้อมูลไม่สำเร็จ
      </div>
    );
  }

  return (
    <div className="w-full px-8 py-6">

      <div className="text-xs text-slate-500 mb-2">
        รายงาน &gt; รายงานการลงทะเบียน
      </div>

      <div className="flex items-center justify-between mb-6">

        <div className="flex items-center gap-3">

          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>

          <h1 className="text-2xl font-semibold text-slate-800">
            รายงานการลงทะเบียน
          </h1>

        </div>

        <button
          onClick={exportExcel}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>

      </div>

      {/* banner (fallback ถ้า event ยังไม่มี field ใหม่) */}
      {event && <EventBannerLayout event={event} />}

      <div className="flex gap-3 mb-4">

        <div className="relative flex-1">

          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participants..."
            className="w-full rounded-full border border-slate-200 py-2.5 pl-10 pr-4 text-sm"
          />

        </div>

        <div className="relative w-[180px]">

          <select
  value={status}
  onChange={(e) => setStatus(e.target.value)}
  className="h-10 w-full appearance-none rounded-full border border-slate-200 pl-3 pr-9 text-sm"
>
  <option value="">สถานะทั้งหมด</option>

  <option value="PENDING">PENDING</option>

  <option value="REGISTERED">REGISTERED</option>
  <option value="ATTENDED">ATTENDED</option>

  <option value="COMPLETED">COMPLETED</option>

  <option value="ABSENT">ABSENT</option>
  <option value="LATE">LATE</option>
  <option value="LATE_PENALTY">LATE_PENALTY</option>

  <option value="CANCELLED">CANCELLED</option>
</select>

          <ChevronDown className="absolute right-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-500" />

        </div>

      </div>

      <div className="overflow-x-auto">

        <table className="w-full text-sm border-collapse">

          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-200">
              <th className="text-left py-3 pr-4">รหัสนักศึกษา</th>
              <th className="text-left py-3 pr-4">ชื่อ</th>
              <th className="text-left py-3 pr-4">ทักษะ</th>
              <th className="text-left py-3 pr-4">EXP</th>
              <th className="text-left py-3 pr-4">สถานะ</th>
              <th className="text-left py-3 pr-4">วันที่</th>
            </tr>
          </thead>

          <tbody>

  {loading ? (
    <tr>
      <td colSpan={6} className="py-10 text-center text-slate-400">
        กำลังโหลดข้อมูล...
      </td>
    </tr>
  ) : participants.length === 0 ? (
    <tr>
      <td colSpan={6} className="py-10 text-center text-slate-400">
        ไม่พบข้อมูลผู้เข้าร่วม
      </td>
    </tr>
  ) : (
    participants.map((row) => {

      const skills =
        row.skills?.map((s: { skillName_TH: string }) => s.skillName_TH).join(", ") || "-";

      return (
        <tr key={row.registrationId} className="border-b border-slate-100">

          <td className="py-4 pr-4">{row.studentId}</td>

          <td className="py-4 pr-4">{row.fullName}</td>

          <td className="py-4 pr-4">{skills}</td>

          <td className="py-4 pr-4 text-emerald-600 font-medium">
            {row.totalExpEarned ?? 0}
          </td>

          <td className="py-4 pr-4">
            <ParticipantStatusBadge status={row.status} />
          </td>

          <td className="py-4 pr-4">
            {formatDate(row.statusDate)}
          </td>

        </tr>
      );
    })
  )}

</tbody>

        </table>

      </div>

      {data?.pagination && (
        <div className="flex justify-end gap-3 mt-6">

          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            ก่อนหน้า
          </button>

          <span>
            หน้า {data.pagination.page} / {data.pagination.totalPages}
          </span>

          <button
            disabled={!data.pagination.hasMore}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            ถัดไป
          </button>

        </div>
      )}

    </div>
  );
}