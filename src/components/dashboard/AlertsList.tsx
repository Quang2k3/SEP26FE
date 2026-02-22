'use client';

const mockAlerts = [
  {
    id: 1,
    title: 'Zone A-12 Full',
    description: 'Capacity reached at 10:45 AM',
  },
  {
    id: 2,
    title: 'Low Stock: SKU-992',
    description: 'Only 5 units remaining in Bin B-02',
  },
  {
    id: 3,
    title: 'Pick Delay',
    description: 'Order #8827 is 20m behind schedule',
  },
];

export default function AlertsList() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header khu vực Alerts */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Recent Alerts</h3>
        <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
          3 New
        </span>
      </div>

      {/* Danh sách Alerts */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        <div className="divide-y divide-gray-100">
          {mockAlerts.map((alert) => (
            <div 
              key={alert.id} 
              className="p-4 hover:bg-red-50/40 cursor-pointer transition-colors group flex gap-3 items-start"
            >
              <div className="mt-0.5">
                <span className="material-symbols-outlined text-amber-500 text-xl group-hover:text-red-500 group-hover:scale-110 transition-all">
                  warning
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
                  {alert.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {alert.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer Link */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-center transition-colors hover:bg-gray-100 cursor-pointer">
          <span className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
            View All Alerts
          </span>
        </div>
      </div>
    </div>
  );
}