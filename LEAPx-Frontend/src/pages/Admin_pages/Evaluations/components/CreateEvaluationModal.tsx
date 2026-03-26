import { X, Plus, Trash2, Download, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import Select from "../../../../components/ui/CustomSelect";
import { backend_url } from "../../../../../utils/constants";
import type { ApiEvent, EventsResponse } from "../../../../../types/api/event";

type Props = {
  open: boolean;
  onClose: () => void;
};

type QuestionType =
  | "TEXT"
  | "TEXTAREA"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "RATING";

type OptionItem = {
  id: string;
  labelTH: string;
  value: string; // A, B, C หรือ 1,2,3
  score: number;
};

type QuestionItem = {
  id: string;
  titleTH: string;
  titleEN: string;
  descriptionTH?: string;
  descriptionEN?: string;
  showDescription?: boolean;
  required: boolean;
  type: QuestionType;
  options: OptionItem[];
};

export default function CreateEvaluationModal({ open, onClose }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [evaluationType, setEvaluationType] = useState<string | null>(null);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    // รีเซ็ต state ทุกครั้งที่เปิด
    setSelectedEventId(null);
    setEvaluationType(null);
    setQuestions([]);
    setIsActive(false);

    async function fetchEvents() {
      try {
        const res = await fetch(`${backend_url}/api/events?page=1&limit=100`, {
          credentials: "include",
        });

        const json: EventsResponse = await res.json();
        if (!res.ok) throw new Error("โหลดกิจกรรมไม่สำเร็จ");

        setEvents(json.data ?? []);
      } catch (err) {
        console.error("โหลดกิจกรรมไม่สำเร็จ", err);
        setEvents([]);
      }
    }

    fetchEvents();
  }, [open]);

  async function handleDownloadTemplate() {
    if (!selectedEventId) {
      alert("กรุณาเลือกกิจกรรมก่อน");
      return;
    }

    try {
      const res = await fetch(
        `${backend_url}/api/events/${selectedEventId}/evaluation/template`,
        {
          credentials: "include",
        },
      );

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "evaluation_template.xlsx";
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("ดาวน์โหลดไม่สำเร็จ");
    }
  }

  async function handleUploadExcel(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedEventId) {
      alert("กรุณาเลือกกิจกรรมก่อน");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `${backend_url}/api/events/${selectedEventId}/evaluation/upload`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        },
      );

      if (!res.ok) throw new Error("Upload failed");

      alert("อัปโหลดสำเร็จ");

      // ถ้า backend ส่ง questions กลับมา
      // setQuestions(data.questions);
    } catch (err) {
      console.error(err);
      alert("อัปโหลดไม่สำเร็จ");
    }
  }

  function addQuestion() {
    if (!selectedEventId) return;
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        titleTH: "",
        titleEN: "",
        descriptionTH: "",
        descriptionEN: "",
        showDescription: false,
        required: false,
        type: "TEXT",
        options: [],
      },
    ]);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function moveQuestionUp(index: number) {
    if (index === 0) return;

    setQuestions((prev) => {
      const newArr = [...prev];
      [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
      return newArr;
    });
  }

  function moveQuestionDown(index: number) {
    setQuestions((prev) => {
      if (index === prev.length - 1) return prev;

      const newArr = [...prev];
      [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
      return newArr;
    });
  }

  function addOption(questionId: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [
                ...q.options,
                {
                  id: crypto.randomUUID(),
                  labelTH: "",
                  value: `OPT_${q.options.length + 1}`, // unique value
                  score: 0,
                },
              ],
            }
          : q,
      ),
    );
  }

  function removeOption(questionId: string, optionId: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.filter((opt) => opt.id !== optionId),
            }
          : q,
      ),
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-xl flex flex-col">
          {/* ===== Header ===== */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">
              สร้างแบบประเมิน
            </h2>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-slate-500 hover:text-slate-700" />
            </button>
          </div>

          {/* ===== Body ===== */}
          <div className="px-8 py-8 space-y-8 overflow-y-auto">
            {/* Section 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  เลือกกิจกรรม
                </label>
                <Select
                  value={selectedEventId}
                  onChange={(v) => {
                    if (v === "__empty__") return;
                    setSelectedEventId(v);
                  }}
                  placeholder="เลือกกิจกรรม"
                  options={
                    events.length === 0
                      ? [{ value: "__empty__", label: "ไม่มีกิจกรรมในระบบ" }]
                      : events.map((event) => ({
                          value: String(event.id),
                          label: event.title_TH,
                        }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  ประเภทแบบประเมิน
                </label>

                <Select
                  value={evaluationType}
                  onChange={setEvaluationType}
                  placeholder="เลือกประเภทแบบประเมิน"
                  options={[
                    { value: "PRE", label: "Pre-Test" },
                    { value: "POST", label: "Post-Test" },
                  ]}
                />
              </div>
            </div>

            {/* Section 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  ชื่อแบบประเมิน (ไทย)
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  ชื่อแบบประเมิน (อังกฤษ)
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Section 3 */}
            <div className="flex flex-wrap items-start gap-12">
              {/* ===== ระยะเวลา ===== */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  ระยะเวลาแบบประเมิน
                </label>

                <div className="flex items-center gap-3 h-10">
                  <input
                    type="date"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  <input
                    type="time"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />

                  <span className="text-slate-400">—</span>

                  <input
                    type="date"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  <input
                    type="time"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* ===== สถานะ ===== */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  สถานะ
                </label>

                {/* 👇 ทำให้สูงเท่ากับ input */}
                <div className="flex items-center gap-3 h-10">
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      isActive ? "bg-teal-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>

                  <span className="text-xs text-slate-500 ">
                    เปิด/ปิดการใช้งานแบบประเมิน
                  </span>
                </div>
              </div>
            </div>

            {/* ===== Tools Row ===== */}
            <div className="flex items-center">
              {/* ฝั่งซ้าย */}
              {questions.length === 0 && (
                <button
                  onClick={addQuestion}
                  disabled={!selectedEventId}
                  className="
    inline-flex items-center gap-2
    rounded-xl
    border border-teal-600
    bg-white text-teal-600
    px-4 py-2 text-sm 
    hover:bg-teal-50
    active:scale-[0.98]
    transition
    disabled:opacity-50
    disabled:cursor-not-allowed
    disabled:hover:bg-white
  "
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มคำถาม
                </button>
              )}

              {/* ฝั่งขวา */}
              <div className="flex items-center gap-4 ml-auto">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={!selectedEventId}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  ดาวน์โหลดเทมเพลต
                </button>

                <label
                  className={`inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 ${
                    !selectedEventId
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  อัปโหลด Excel
                  <input
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    disabled={!selectedEventId}
                    onChange={handleUploadExcel}
                  />
                </label>
              </div>
            </div>

            {/* ===== Question Builder ===== */}
            <div className="space-y-6">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* ===== Header ===== */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    {/* ฝั่งซ้าย */}
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col text-slate-400">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveQuestionUp(index)}
                          className="hover:text-slate-700 disabled:opacity-30"
                        >
                          ▲
                        </button>

                        <button
                          type="button"
                          disabled={index === questions.length - 1}
                          onClick={() => moveQuestionDown(index)}
                          className="hover:text-slate-700 disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>

                      <span className="font-medium text-slate-800">
                        คำถามที่ {index + 1}
                      </span>

                      {/* 👇 ย้าย required มาไว้ตรงนี้ */}
                      <label className="flex items-center gap-2 text-sm text-slate-600 ">
                        <input
                          type="checkbox"
                          className="accent-teal-500"
                          checked={q.required}
                          onChange={(e) =>
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id
                                  ? { ...item, required: e.target.checked }
                                  : item,
                              ),
                            )
                          }
                        />
                        จำเป็นต้องกรอก
                      </label>
                    </div>

                    {/* ปุ่มลบ */}
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* ===== Body ===== */}
                  <div className="p-6 space-y-6">
                    {/* คำถามไทย */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm text-slate-600">
                          คำถาม (ไทย)
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id
                                  ? {
                                      ...item,
                                      showDescription: !item.showDescription,
                                    }
                                  : item,
                              ),
                            )
                          }
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                        >
                          {q.showDescription ? "ซ่อนคำอธิบาย" : "เพิ่มคำอธิบาย"}
                        </button>
                      </div>

                      <input
                        value={q.titleTH}
                        onChange={(e) =>
                          setQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id
                                ? { ...item, titleTH: e.target.value }
                                : item,
                            ),
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />

                      {q.showDescription && (
                        <textarea
                          value={q.descriptionTH}
                          onChange={(e) =>
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id
                                  ? { ...item, descriptionTH: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          placeholder="คำอธิบายคำถาม (ไทย)"
                          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          rows={3}
                        />
                      )}
                    </div>

                    {/* คำถามอังกฤษ */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm text-slate-600">
                          คำถาม (อังกฤษ)
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id
                                  ? {
                                      ...item,
                                      showDescription: !item.showDescription,
                                    }
                                  : item,
                              ),
                            )
                          }
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                        >
                          {q.showDescription ? "ซ่อนคำอธิบาย" : "เพิ่มคำอธิบาย"}
                        </button>
                      </div>

                      <input
                        value={q.titleEN}
                        onChange={(e) =>
                          setQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id
                                ? { ...item, titleEN: e.target.value }
                                : item,
                            ),
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />

                      {q.showDescription && (
                        <textarea
                          value={q.descriptionEN}
                          onChange={(e) =>
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id
                                  ? { ...item, descriptionEN: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          placeholder="คำอธิบายคำถาม (อังกฤษ)"
                          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          rows={3}
                        />
                      )}
                    </div>
                    {/* ประเภทคำตอบ */}
                    <div className="flex flex-wrap items-end gap-10">
                      <div className="min-w-[160px] max-w-sm">
                        <label className="block text-sm text-slate-600 mb-2">
                          ประเภทคำตอบ
                        </label>

                        <Select
                          value={q.type}
                          onChange={(v) =>
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id
                                  ? { ...item, type: v as QuestionType }
                                  : item,
                              ),
                            )
                          }
                          options={[
                            { value: "TEXT", label: "ข้อความสั้น" },
                            { value: "TEXTAREA", label: "ข้อความยาว" },
                            { value: "SINGLE_CHOICE", label: "เลือกตอบเดียว" },
                            {
                              value: "MULTIPLE_CHOICE",
                              label: "เลือกได้หลายข้อ",
                            },
                            { value: "RATING", label: "ให้คะแนน 1-5" },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Options (เฉพาะ RADIO / CHECKBOX) */}
                    {(q.type === "SINGLE_CHOICE" ||
                      q.type === "MULTIPLE_CHOICE") && (
                      <div className="space-y-4">
                        {q.options.length > 0 && (
                          <div className="flex items-center mb-2">
                            <div className="flex-1 text-sm text-slate-600">
                              คำตอบ
                            </div>

                            <div className="w-24 text-sm text-slate-600 text-center">
                              กำหนดคะแนน
                            </div>

                            <div className="w-6"></div>
                          </div>
                        )}

                        {q.options.map((opt) => (
                          <div key={opt.id} className="flex items-center gap-3">
                            {q.type === "SINGLE_CHOICE" ? (
                              <input type="radio" disabled />
                            ) : (
                              <input type="checkbox" disabled />
                            )}

                            {/* Option Label */}
                            <input
                              value={opt.labelTH}
                              onChange={(e) =>
                                setQuestions((prev) =>
                                  prev.map((question) =>
                                    question.id === q.id
                                      ? {
                                          ...question,
                                          options: question.options.map((o) =>
                                            o.id === opt.id
                                              ? {
                                                  ...o,
                                                  labelTH: e.target.value,
                                                }
                                              : o,
                                          ),
                                        }
                                      : question,
                                  ),
                                )
                              }
                              className="flex-1 min-w-[250px] rounded-xl border border-slate-200 px-4 py-2 text-sm"
                              placeholder="ตัวเลือก..."
                            />

                            {/* Score */}
                            <input
                              type="number"
                              value={opt.score}
                              onChange={(e) =>
                                setQuestions((prev) =>
                                  prev.map((question) =>
                                    question.id === q.id
                                      ? {
                                          ...question,
                                          options: question.options.map((o) =>
                                            o.id === opt.id
                                              ? {
                                                  ...o,
                                                  score: Number(e.target.value),
                                                }
                                              : o,
                                          ),
                                        }
                                      : question,
                                  ),
                                )
                              }
                              className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              placeholder="คะแนน"
                            />

                            <button
                              type="button"
                              onClick={() => removeOption(q.id, opt.id)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        <button
                          onClick={() => addOption(q.id)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm hover:bg-slate-200"
                        >
                          เพิ่มตัวเลือก
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Question Button (แสดงเมื่อมีคำถามแล้ว) */}
              {questions.length > 0 && (
                <button
                  onClick={addQuestion}
                  disabled={!selectedEventId}
                  className="
    inline-flex items-center gap-2
    rounded-xl
    border border-teal-600
    bg-white text-teal-600
    px-4 py-2 text-sm 
    hover:bg-teal-50
    active:scale-[0.98]
    transition
    disabled:opacity-50
    disabled:cursor-not-allowed
    disabled:hover:bg-white
  "
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มคำถาม
                </button>
              )}
            </div>
          </div>

          {/* ===== Footer ===== */}
          <div className="flex justify-end gap-4 bg-slate-50 px-8 py-5 border-t border-slate-200 rounded-b-2xl shrink-0">
            <button
              onClick={onClose}
              className="rounded-full border border-slate-300 px-6 py-2 text-sm hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              disabled={!selectedEventId || !evaluationType}
              className="rounded-full bg-teal-600 px-6 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              สร้างแบบประเมิน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
