import { Calendar } from "lucide-react";
import type { Evaluation } from "../../../../../types/evaluation/evaluation";

type Props = {
  evaluation: Evaluation;
  language: "TH" | "EN";
  setLanguage: (lang: "TH" | "EN") => void;
  progress: number;
  answeredCount: number;
};

export default function EvaluationHeader({
  evaluation,
  language,
  setLanguage,
  progress,
  answeredCount,
}: Props) {
  return (
    <div className="px-8 py-6 border-b border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-teal-500 block mb-2">
            {evaluation.type === "PRE" ? "Pre-Test" : "Post-Test"}
          </span>

          <h1 className="text-xl font-semibold text-slate-800">
            {evaluation.titleTH}
          </h1>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <Calendar className="w-3.5 h-3.5" />
            เปิดถึง {new Date(evaluation.endAt).toLocaleString("th-TH")}
          </div>
        </div>

        <div className="flex bg-slate-100 rounded-full p-1">
          <button
            onClick={() => setLanguage("TH")}
            className={`px-3 py-1 text-xs rounded-full ${
              language === "TH"
                ? "bg-white shadow text-slate-800"
                : "text-slate-400"
            }`}
          >
            TH
          </button>
          <button
            onClick={() => setLanguage("EN")}
            className={`px-3 py-1 text-xs rounded-full ${
              language === "EN"
                ? "bg-white shadow text-slate-800"
                : "text-slate-400"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>ตอบแล้ว {answeredCount} ข้อ</span>
          <span className="font-medium text-teal-600">{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
