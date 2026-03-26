import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  Users,
  IdCard,
  Footprints,
} from "lucide-react";

import CompactPagination from "../../../components/Pagination/CompactPagination";

import { useRegistrationReports } from "./hooks/useRegistrationReports";
import { mapEventStatus } from "./utils/eventStatus";

/* ================= Debounce ================= */

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

/* ================= Helpers ================= */

function formatDate(date?: string) {
  if (!date) return "-";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCover(
  photos?: {
    isMain: boolean;
    sortOrder: number;
    cloudinaryImage: { url: string };
  }[]
) {
  if (!photos || photos.length === 0) return null;

  const main = photos.find((p) => p.isMain);
  return main?.cloudinaryImage?.url ?? photos[0]?.cloudinaryImage?.url;
}

function formatCapacity(current: number, max: number) {
  if (!max || max >= 1_000_000) {
    return `${current.toLocaleString()}/ไม่จำกัด`;
  }
  return `${current.toLocaleString()}/${max.toLocaleString()}`;
}

/* ================= Component ================= */

export default function RegistrationReportList() {
  const navigate = useNavigate();

  /* ===== filters ===== */

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);

  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");


  /* ===== pagination ===== */

  const [page, setPage] = useState(1);
  const limit = 10;

  /* ===== determine filtering mode ===== */

  const hasSearch = search.trim().length > 0;
  const hasCategory = Boolean(category);
  const hasDate = Boolean(date);

  const useClientFilter = !hasSearch && (hasCategory || hasDate);

  /* ===== fetch ===== */

  const {
    events: rawEvents,
    pagination,
    loading,
    error,
  } = useRegistrationReports({
    search,
    category: useClientFilter ? "" : category,
    date: useClientFilter ? "" : date,
    page: useClientFilter ? 1 : page,
    limit: useClientFilter ? 1000 : limit,
    sortBy: "date",
  });

  /* ===== categories ===== */

  const categories = useMemo(() => {
    const map = new Map();

    rawEvents?.forEach((ev) => {
      if (ev.majorCategory) {
        map.set(ev.majorCategory.id, ev.majorCategory);
      }
    });

    return Array.from(map.values());
  }, [rawEvents]);

  /* ===== reset page ===== */

  useEffect(() => {
    setPage(1);
  }, [search, category, date]);

  /* ===== client filter ===== */

  const filteredEvents = useMemo(() => {
    if (!useClientFilter) return rawEvents;

    return rawEvents.filter((ev) => {
      const okCategory = category
        ? ev.majorCategory?.id === Number(category)
        : true;

      const okDate = date
        ? ev.activityStart?.slice(0, 10) === date
        : true;

      return okCategory && okDate;
    });
  }, [rawEvents, category, date, useClientFilter]);

  /* ===== pagination ===== */

  const totalPagesClient = useMemo(() => {
    if (!useClientFilter) return pagination?.totalPages ?? 1;

    return Math.max(1, Math.ceil(filteredEvents.length / limit));
  }, [useClientFilter, filteredEvents.length, pagination, limit]);

  const currentPage = useMemo(() => {
    if (!useClientFilter) return pagination?.page ?? page;

    return Math.min(page, totalPagesClient);
  }, [useClientFilter, pagination, page, totalPagesClient]);

  const events = useMemo(() => {
    if (!useClientFilter) return filteredEvents;

    const start = (currentPage - 1) * limit;
    return filteredEvents.slice(start, start + limit);
  }, [filteredEvents, useClientFilter, currentPage, limit]);

  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-500">
        กำลังโหลดข้อมูลกิจกรรม...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-red-500">
        โหลดข้อมูลกิจกรรมไม่สำเร็จ
      </div>
    );
  }

  return (
    <div className="w-full px-8 py-6">

      <div className="text-xs text-slate-500 mb-1">
        รายงาน &gt;{" "}
        <span className="text-teal-700 font-medium">
          รายงานการลงทะเบียน
        </span>
      </div>

      <h1 className="text-2xl font-semibold text-slate-800 mb-6">
        รายงานการลงทะเบียน
      </h1>

      {/* Filters */}

      <div className="flex flex-col lg:flex-row gap-3 mb-6">

        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

          <input
            type="text"
            placeholder="ค้นหากิจกรรม..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-full border border-slate-200 py-2.5 pl-10 pr-4 text-sm"
          />
        </div>

        <div className="relative w-[220px]">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 w-full appearance-none rounded-full border border-slate-200 pl-3 pr-9 text-sm"
          >
            <option value="">หมวดหมู่ทั้งหมด</option>

            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name_TH}
              </option>
            ))}
          </select>

          <ChevronDown className="absolute right-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-500" />
        </div>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 rounded-full border border-slate-200 px-3 text-sm"
        />

      </div>

      {/* Table */}

      <div className="overflow-x-auto">

        <table className="w-full text-sm border-collapse">

          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-200">
              <th className="text-left py-3 pr-4">รูปกิจกรรม</th>
              <th className="text-left py-3 pr-4">ชื่อกิจกรรม</th>
              <th className="text-left py-3 pr-4">หมวดหมู่</th>
              <th className="text-left py-3 pr-4">วันเปิดลงทะเบียน</th>
              <th className="text-left py-3 pr-4">วันจัดกิจกรรม</th>
              <th className="text-left py-3 pr-4">จำนวนคนลงทะเบียน</th>
              <th className="text-left py-3 pr-4">สถานะ</th>
              <th className="text-center py-3 pr-2">การจัดการ</th>
            </tr>
          </thead>

          <tbody>

            {events.map((ev) => {
              const cover = getCover(ev.photos);

              const status = mapEventStatus({
                status: ev.status,
                activityStart: ev.activityStart ?? "",
                activityEnd: ev.activityEnd ?? "",
                registrationStart: ev.registrationStart,
                registrationEnd: ev.registrationEnd,
              });

              return (
                <tr key={ev.id} className="border-b border-slate-100">

                  {/* image */}
                  <td className="py-4 pr-4">
                    <div className="h-[80px] w-[80px] rounded-md overflow-hidden bg-slate-200">
                      {cover ? (
                        <img
                          src={cover}
                          alt={ev.title_TH}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-500">
                          ไม่มีรูป
                        </div>
                      )}
                    </div>
                  </td>

                  {/* title */}
                  <td className="py-4 pr-4">
                    <div className="font-medium text-slate-800">
                      {ev.title_TH}
                    </div>

                    {ev.title_EN && (
                      <div className="text-xs text-slate-500">
                        {ev.title_EN}
                      </div>
                    )}
                  </td>

                  {/* category */}
                  <td className="py-4 pr-4">
                    {ev.majorCategory
                      ? `${ev.majorCategory.name_TH} (${ev.majorCategory.code})`
                      : "-"}
                  </td>

                  {/* registration date */}
                  <td className="py-4 pr-4">
                    <div className="text-xs text-slate-500">เริ่ม</div>
                    <div className="whitespace-nowrap">{formatDate(ev.registrationStart)}</div>

                    <div className="text-xs text-slate-500 mt-1">จบ</div>
                    <div className="whitespace-nowrap">{formatDate(ev.registrationEnd)}</div>
                  </td>

                  {/* activity date */}
                  <td className="py-4 pr-4">
                    <div className="text-xs text-slate-500">เริ่ม</div>
                    <div className="whitespace-nowrap">{formatDate(ev.activityStart)}</div>

                    <div className="text-xs text-slate-500 mt-1">จบ</div>
                    <div className="whitespace-nowrap">{formatDate(ev.activityEnd)}</div>
                  </td>

                  {/* capacity */}
                  <td className="py-4 pr-4 align-top">

                    <div className="space-y-2 text-sm text-slate-800">

                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-slate-500" />
                        {formatCapacity(
                          ev.currentParticipants,
                          ev.maxParticipants
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <IdCard className="w-4 h-4 text-slate-500" />
                        {formatCapacity(
                          ev.currentStaffCount,
                          ev.maxStaffCount
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Footprints className="w-4 h-4 text-slate-500" />
                        {formatCapacity(
                          ev.currentWalkins,
                          ev.walkinCapacity
                        )}
                      </div>

                    </div>

                  </td>

                  {/* status */}
                  <td className="py-4 pr-4 ">
  <div className="flex items-center">
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[110px]
        px-3 py-1.5
        rounded-full
        text-xs font-medium
        whitespace-nowrap
        ${status.className}
      `}
    >
      {status.label}
    </span>
  </div>
</td>

                  {/* action */}
                  <td className="py-4 text-center">
                    <button
                      onClick={() =>
                        navigate(`/admin/reports/registrations/${ev.id}`)
                      }
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700"
                    >
                      ดูรายงาน
                    </button>
                  </td>

                </tr>
              );
            })}

          </tbody>

        </table>

      </div>

      {/* Pagination */}

      <div className="mt-6 flex justify-end">
        <CompactPagination
          currentPage={currentPage}
          totalPages={totalPagesClient}
          onChange={(p) => setPage(p)}
        />
      </div>

    </div>
  );
}