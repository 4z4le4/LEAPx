import { Send } from "lucide-react";

type Props = {
  submitting: boolean;
  onSubmit: () => void;
};

export default function EvaluationFooter({ submitting, onSubmit }: Props) {
  return (
    <div className="border-t border-slate-100 px-8 py-4 flex justify-end bg-slate-50/50">
      <button
        onClick={onSubmit}
        disabled={submitting}
        className="px-6 py-2 rounded-full bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-40 flex items-center gap-2"
      >
        {submitting ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        ส่งคำตอบ
      </button>
    </div>
  );
}
