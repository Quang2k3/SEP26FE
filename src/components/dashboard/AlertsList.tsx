'use client';

import Link from 'next/link';

// Bổ sung thêm actionUrl cho từng cảnh báo để biết sẽ Drill-down đi đâu
const mockAlerts = [
  {
    id: 1,
    title: 'Zone A-12 Full',
    description: 'Capacity reached at 10:45 AM',
    actionUrl: '/tasks?search=Zone A-12', // Tìm các task liên quan đến Zone này
  },
  {
    id: 2,
    title: 'Low Stock: SKU-992',
    description: 'Only 5 units remaining in Bin B-02',
    actionUrl: '/tasks?search=SKU-992', // Tìm các task liên quan đến mã SKU này
  },
  {
    id: 3,
    title: 'Pick Delay',
    description: 'Order #8827 is 20m behind schedule',
    actionUrl: '/tasks?search=PT-8827', // Tìm đích danh Task bị trễ (VD: PT-8827)
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
            // Thay div bằng Link để có thể click redirect
            <Link 
              href={alert.actionUrl}
              key={alert.id} 
              className="p-4 hover:bg-red-50/40 transition-colors group flex gap-3 items-start outline-none focus:bg-red-50/40"
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
            </Link>
          ))}
        </div>
        
        {/* Footer Link - Bấm vào đây để lọc theo Priority */}
        <Link 
          href="/tasks?sort=priority"
          className="p-3 bg-gray-50 border-t border-gray-200 text-center transition-colors hover:bg-gray-100 block outline-none focus:bg-gray-100"
        >
          <span className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
            View All Urgent Alerts
          </span>
        </Link>
      </div>
    </div>
  );
}