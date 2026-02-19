interface StatsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  hasAlert?: boolean;
  showProgress?: boolean;
  progressValue?: number;
}

export default function StatsCard({
  title,
  value,
  unit,
  hasAlert,
  showProgress,
  progressValue = 0,
}: StatsCardProps) {
  return (
    <div className="sketch-box p-6 flex flex-col gap-2 min-h-[140px] bg-white">
      <span className="text-lg font-bold border-b border-[#ccc] pb-1">
        {title}
      </span>
      <div className="flex items-baseline gap-2 mt-auto">
        <span className="text-5xl font-bold">{value}</span>
        {unit && <span className="text-sm">{unit}</span>}
        {hasAlert && <span className="text-sm text-red-600 font-bold">!</span>}
      </div>
      
      {/* Progress Bar */}
      {showProgress && (
        <div className="w-full h-4 sketch-box bg-gray-100 mt-2 overflow-hidden">
          <div
            className="h-full bg-gray-400"
            style={{ width: `${progressValue}%` }}
          />
        </div>
      )}
    </div>
  );
}