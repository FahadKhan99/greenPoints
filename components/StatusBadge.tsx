import { CheckCircle, Clock, Trash2 } from "lucide-react";

interface StatusBadgeProps {
  status: "pending" | "in_progress" | "completed" | "verified";
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const statusConfig = {
    pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
    in_progress: { color: "bg-blue-100 text-blue-800", icon: Trash2 },
    completed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
    verified: { color: "bg-purple-100 text-purple-800", icon: CheckCircle },
  };

  const { color, icon: Icon } = statusConfig[status];

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${color} flex items-center`}
    >
      <Icon className="mr-1 h-3 w-3" />
      {status.replace("_", " ")}
    </span>
  );
};

export default StatusBadge;
