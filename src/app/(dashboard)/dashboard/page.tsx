import StatsCard from '@/components/dashboard/StatsCard';
import AlertsList from '@/components/dashboard/AlertsList';
import InventoryTable from '@/components/dashboard/InventoryTable';

export default function DashboardPage() {
  return (
    // XÓA THẺ <DashboardLayout> BỌC Ở ĐÂY, CHỈ GIỮ LẠI NỘI DUNG CHÍNH
    <div className="flex flex-col gap-8">
      {/* Page Header with Filters */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl font-bold">Dashboard Overview</h2>
          <div className="h-1 w-24 bg-[#333]"></div>
        </div>
        
        {/* Dropdowns */}
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold px-1">Zone:</span>
            <div className="flex items-center justify-between w-40 h-10 px-3 sketch-box cursor-pointer bg-white">
              <span>All Zones</span>
              <span className="material-symbols-outlined">expand_more</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold px-1">Date Range:</span>
            <div className="flex items-center justify-between w-48 h-10 px-3 sketch-box cursor-pointer bg-white">
              <span>Last 7 Days</span>
              <span className="material-symbols-outlined">expand_more</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Inbound" value="1,284" unit="units" />
        <StatsCard title="Outbound" value="942" unit="units" />
        <StatsCard title="Active Picks" value="56" hasAlert />
        <StatsCard title="Bin Occupancy" value="78%" showProgress progressValue={78} />
      </div>

      {/* Chart + Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Throughput Trends Chart */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Throughput Trends</h3>
            <button className="sketch-button px-4 py-1 text-sm font-bold uppercase bg-[#eeeeee]">
              Export CSV
            </button>
          </div>
          <div className="sketch-box h-[350px] flex items-center justify-center relative bg-white">
            {/* Grid lines */}
            <div className="absolute inset-0 opacity-10 flex flex-col justify-between p-4 pointer-events-none">
              <div className="border-b border-[#333] w-full"></div>
              <div className="border-b border-[#333] w-full"></div>
              <div className="border-b border-[#333] w-full"></div>
              <div className="border-b border-[#333] w-full"></div>
            </div>
            {/* Chart SVG */}
            <svg className="w-full h-full p-10" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path
                d="M0,80 L20,60 L40,70 L60,30 L80,45 L100,10"
                fill="none"
                stroke="#333"
                strokeWidth="2"
              />
            </svg>
            <span className="absolute text-gray-400 uppercase tracking-widest font-bold">
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