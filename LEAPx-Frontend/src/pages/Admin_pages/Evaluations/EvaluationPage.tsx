import { useState } from "react";
import type {
  Evaluation,
  EvaluationAnswerValue,
} from "../../../../types/evaluation/evaluation";
import QuestionRow from "./components/QuestionRow";
import EvaluationHeader from "./components/EvaluationHeader";
import EvaluationFooter from "./components/EvaluationFooter";

export default function EvaluationPage({
  evaluation,
}: {
  evaluation: Evaluation;
}) {
  const [answers, setAnswers] = useState<Record<string, EvaluationAnswerValue>>(
    {},
  );
  const [errorQuestions, setErrorQuestions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState<"TH" | "EN">("TH");

  const totalQuestions = evaluation.questions.length;

  const answeredCount = evaluation.questions.filter(
    (q) => answers[q.id] !== undefined,
  ).length;

  const progress =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  function handleSubmit() {
    const missing = evaluation.questions
      .filter((q) => q.required && !answers[q.id])
      .map((q) => q.id);

    if (missing.length > 0) {
      setErrorQuestions(missing);
      requestAnimationFrame(() => {
        document
          .getElementById(`question-${missing[0]}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 1000);
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-teal-400 to-teal-600" />

          <EvaluationHeader
            evaluation={evaluation}
            language={language}
            setLanguage={setLanguage}
            progress={progress}
            answeredCount={answeredCount}
          />

          {evaluation.questions.map((q, index) => (
            <QuestionRow
              key={q.id}
              question={q}
              index={index}
              value={answers[q.id]}
              hasError={errorQuestions.includes(q.id)}
              isLast={index === totalQuestions - 1}
              onChange={(val) =>
                setAnswers((prev) => ({ ...prev, [q.id]: val }))
              }
              onClear={() =>
                setAnswers((prev) => {
                  const copy = { ...prev };
                  delete copy[q.id];
                  return copy;
                })
              }
            />
          ))}

          <EvaluationFooter submitting={submitting} onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
