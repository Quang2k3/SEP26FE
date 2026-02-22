import StatsCard from '@/components/dashboard/StatsCard';
import AlertsList from '@/components/dashboard/AlertsList';
import InventoryTable from '@/components/dashboard/InventoryTable';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 w-full p-4 md:p-8">
      
      {/* Page Header with Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h2>
          <p className="mt-1 text-sm text-gray-500">Real-time metrics and warehouse throughput.</p>
        </div>
        
        {/* Dropdowns (Bộ lọc) - Chuyển sang phong cách nút bấm hiện đại */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Zone:</span>
            <div className="flex items-center justify-between min-w-[140px] px-3 py-2 border border-gray-200 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm transition-colors">
              <span>All Zones</span>
              <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Date Range:</span>
            <div className="flex items-center justify-between min-w-[160px] px-3 py-2 border border-gray-200 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm transition-colors">
              <span>Last 7 Days</span>
              <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid - Khung lưới giữ nguyên, đợi update component con */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Inbound" value="1,284" unit="units" />
        <StatsCard title="Outbound" value="942" unit="units" />
        <StatsCard title="Active Picks" value="56" hasAlert />
        <StatsCard title="Bin Occupancy" value="78%" showProgress progressValue={78} />
      </div>

      {/* Chart + Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Throughput Trends Chart */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Throughput Trends</h3>
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-gray-500">download</span>
              Export CSV
            </button>
          </div>
          
          {/* Vùng vẽ biểu đồ */}
          <div className="h-[350px] bg-white rounded-lg border border-gray-200 shadow-sm relative overflow-hidden flex items-center justify-center">
            {/* Grid lines (Làm mờ đi cho tinh tế) */}
            <div className="absolute inset-0 opacity-[0.03] flex flex-col justify-between p-6 pointer-events-none">
              <div className="border-b border-black w-full"></div>
              <div className="border-b border-black w-full"></div>
              <div className="border-b border-black w-full"></div>
              <div className="border-b border-black w-full"></div>
            </div>
            
            {/* Chart SVG (Chuyển đường line sang màu xanh mượt mà) */}
            <svg className="w-full h-full p-8 relative z-10" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path
                d="M0,80 L20,60 L40,70 L60,30 L80,45 L100,10"
                fill="none"
                stroke="#2563eb" // Màu blue-600 của Tailwind
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="absolute text-gray-400 text-sm font-medium uppercase tracking-wider z-0">
              [ Chart Placeholder ]
            </span>
          </div>
        </div>

        {/* Recent Alerts */}
        <AlertsList />
      </div>

      {/* Inventory Table */}
      <InventoryTable />
    </div>
  );
}