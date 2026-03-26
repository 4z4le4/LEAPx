interface Props {
  status: string;
}

export default function ParticipantStatusBadge({ status }: Props) {
  const map: Record<string, string> = {
    COMPLETED: "bg-green-500 text-white",
    ATTENDED: "bg-blue-500 text-white",
    REGISTERED: "bg-slate-400 text-white",
    ABSENT: "bg-red-500 text-white",
    LATE: "bg-yellow-500 text-white",
    LATE_PENALTY: "bg-orange-500 text-white",
    CANCELLED: "bg-gray-400 text-white",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        map[status] ?? "bg-slate-300 text-black"
      }`}
    >
      {status}
    </span>
  );
}