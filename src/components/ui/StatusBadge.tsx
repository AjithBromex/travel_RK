interface StatusBadgeProps {
  status: string;
  variant?: 'trip' | 'payment' | 'reminder' | 'vehicle' | 'default';
}

const tripColors: Record<string, { badge: string; dot: string }> = {
  scheduled: { badge: "badge-info", dot: "bg-blue-600" },
  in_progress: { badge: "badge-warning", dot: "bg-amber-500 animate-pulse" },
  completed: { badge: "badge-success", dot: "bg-emerald-600" },
  cancelled: { badge: "badge-danger", dot: "bg-rose-600" },
};

const paymentColors: Record<string, { badge: string; dot: string }> = {
  customer_received: { badge: "badge-success", dot: "bg-emerald-600" },
  driver_payment: { badge: "badge-warning", dot: "bg-amber-600" },
};

const reminderColors: Record<string, { badge: string; dot: string }> = {
  pending: { badge: "badge-warning", dot: "bg-amber-500" },
  upcoming: { badge: "badge-info", dot: "bg-blue-500" },
  overdue: { badge: "badge-danger", dot: "bg-rose-600" },
  completed: { badge: "badge-success", dot: "bg-emerald-600" },
};

const vehicleColors: Record<string, { badge: string; dot: string }> = {
  active: { badge: "badge-success", dot: "bg-emerald-600" },
  inactive: { badge: "badge-neutral", dot: "bg-slate-400" },
  service_due: { badge: "badge-danger", dot: "bg-rose-600" },
};

const labelMap: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  customer_received: "Customer Receipt",
  driver_payment: "Driver Payment",
  pending: "Pending",
  upcoming: "Upcoming",
  overdue: "Overdue",
  active: "Active",
  inactive: "Inactive",
  service_due: "Service Due",
};

export default function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  let config = { badge: "badge-neutral", dot: "bg-slate-400" };

  switch (variant) {
    case 'trip':
      config = tripColors[status] || config;
      break;
    case 'payment':
      config = paymentColors[status] || config;
      break;
    case 'reminder':
      config = reminderColors[status] || config;
      break;
    case 'vehicle':
      config = vehicleColors[status] || config;
      break;
    default:
      config =
        tripColors[status] ||
        paymentColors[status] ||
        reminderColors[status] ||
        vehicleColors[status] ||
        config;
  }

  return (
    <span className={config.badge}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      <span>{labelMap[status] || status}</span>
    </span>
  );
}
