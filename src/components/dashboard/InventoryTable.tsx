'use client';

const mockInventory = [
  {
    id: 1,
    sku: 'SKU-4002',
    name: 'Pallet Jack',
    location: 'Zone C / Rack 02',
    quantity: 12,
  },
  {
    id: 2,
    sku: 'SKU-1082',
    name: 'Safety Vest',
    location: 'Zone A / Rack 05',
    quantity: 150,
  },
  {
    id: 3,
    sku: 'SKU-2921',
    name: 'Tape Roll',
    location: 'Zone B / Bulk 01',
    quantity: 45,
  },
];

export default function InventoryTable() {
  return (
    <div className="flex flex-col gap-4">
      
      {/* Header khu vực bảng */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Inventory Highlights</h3>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
          View Full Inventory
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </div>

      {/* Bảng dữ liệu chuẩn Enterprise */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item / SKU</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-32">Qty</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                      <span className="text-xs font-medium text-blue-600 hover:underline cursor-pointer mt-0.5">
                        {item.sku}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-700">
                      <span className="material-symbols-outlined text-[14px] mr-1.5 text-gray-400">location_on</span>
                      {item.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-bold text-gray-900">{item.quantity}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button 
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                        title="Edit Item"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button 
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                        title="Delete Item"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}