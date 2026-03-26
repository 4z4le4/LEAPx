import { Star, AlertCircle } from "lucide-react";
import type {
  EvaluationQuestion,
  EvaluationAnswerValue,
} from "../../../../../types/evaluation/evaluation";

type Props = {
  question: EvaluationQuestion;
  index: number;
  value?: EvaluationAnswerValue;
  onChange: (val: EvaluationAnswerValue) => void;
  onClear: () => void;
  hasError?: boolean;
  isLast?: boolean;
};

export default function QuestionRow({
  question,
  index,
  value,
  onChange,
  onClear,
  hasError,
  isLast,
}: Props) {
  const hasValue =
    value !== undefined &&
    !(
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0)
    );

  return (
    <div
      id={`question-${question.id}`}
      className={`group py-7 px-8 transition-all ${
        hasError
          ? "bg-rose-50/60 border-l-4 border-rose-400"
          : "hover:bg-slate-50/70"
      } ${!isLast ? "border-b border-slate-100" : ""}`}
    >
      {/* Question label */}
      <div className="flex items-start gap-3 mb-4">
        <span
          className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center ${
            hasError
              ? "bg-rose-100 text-rose-600"
              : "bg-teal-50 text-teal-600 group-hover:bg-teal-100"
          } transition-colors`}
        >
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-slate-800 leading-snug">
            {question.titleTH}
            {question.required && (
              <span className="text-rose-400 ml-1 font-normal">*</span>
            )}
          </p>
          {question.descriptionTH && (
            <p className="text-sm text-slate-400 mt-0.5">
              {question.descriptionTH}
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {hasError && (
        <div className="flex items-center gap-1.5 text-rose-500 text-xs mb-3 ml-9">
          <AlertCircle className="w-3.5 h-3.5" />
          กรุณาตอบคำถามนี้
        </div>
      )}

      {/* Answer input */}
      <div className="ml-9">
        {hasValue && (
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-slate-300 hover:text-rose-500 underline"
            >
              ล้างคำตอบ
            </button>
          </div>
        )}
        {/* TEXT */}
        {question.type === "TEXT" && (
          <input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="พิมพ์คำตอบของคุณ…"
            className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 transition-shadow ${
              hasError
                ? "border-rose-300 focus:ring-rose-200"
                : "border-slate-200 focus:ring-teal-100 focus:border-teal-400"
            }`}
          />
        )}

        {/* TEXTAREA */}
        {question.type === "TEXTAREA" && (
          <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder="พิมพ์คำตอบของคุณ…"
            className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 resize-none transition-shadow ${
              hasError
                ? "border-rose-300 focus:ring-rose-200"
                : "border-slate-200 focus:ring-teal-100 focus:border-teal-400"
            }`}
          />
        )}

        {/* SINGLE_CHOICE */}
        {question.type === "SINGLE_CHOICE" && (
          <div className="space-y-2">
            {question.options?.map((opt) => {
              const selected = value === opt.value;
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-sm ${
                    selected
                      ? "border-teal-400 bg-teal-50 text-teal-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      selected ? "border-teal-500" : "border-slate-300"
                    }`}
                  >
                    {selected && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 block" />
                    )}
                  </span>
                  <input
                    type="radio"
                    className="sr-only"
                    checked={selected}
                    onChange={() => onChange(opt.value)}
                  />
                  {opt.labelTH}
                </label>
              );
            })}
          </div>
        )}

        {question.type === "MULTIPLE_CHOICE" && (
          <div className="space-y-2">
            {question.options?.map((opt) => {
              const currentValues = Array.isArray(value) ? value : [];
              const checked = currentValues.includes(opt.value);

              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-sm ${
                    checked
                      ? "border-teal-400 bg-teal-50 text-teal-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-md border-2 flex items-center justify-center ${
                      checked
                        ? "border-teal-500 bg-teal-500"
                        : "border-slate-300"
                    }`}
                  >
                    {checked && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M1.5 5L4 7.5L8.5 2.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>

                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        onChange(currentValues.filter((v) => v !== opt.value));
                      } else {
                        onChange([...currentValues, opt.value]);
                      }
                    }}
                  />

                  {opt.labelTH}
                </label>
              );
            })}
          </div>
        )}

        {/* RATING */}
        {question.type === "RATING" && (
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                className="group/star p-0.5 focus:outline-none"
              >
                <Star
                  className={`w-7 h-7 transition-all ${
                    value && star <= (value as number)
                      ? "text-amber-400 fill-amber-400 scale-105"
                      : "text-slate-200 group-hover/star:text-amber-200"
                  }`}
                />
              </button>
            ))}
            {value && (
              <span className="ml-2 self-center text-sm text-slate-400">
                {value}/5
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
