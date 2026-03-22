interface BadgeProps {
  status: string;
  label?: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; defaultLabel: string }> = {
  in_stock: {
    bg: "bg-[#EEF2FF]",
    text: "text-[#1B2D72]",
    dot: "bg-green-400",
    defaultLabel: "In Stock",
  },
  out_of_stock: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    dot: "bg-red-400",
    defaultLabel: "Out of Stock",
  },
  on_request: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
    defaultLabel: "On Request",
  },
  low_stock: {
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    dot: "bg-orange-400",
    defaultLabel: "Low Stock",
  },
};

const defaultConfig = {
  bg: "bg-gray-500/20",
  text: "text-gray-400",
  dot: "bg-gray-400",
  defaultLabel: "Unknown",
};

export default function Badge({ status, label }: BadgeProps) {
  const config = statusConfig[status] || defaultConfig;
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {displayLabel}
    </span>
  );
}
