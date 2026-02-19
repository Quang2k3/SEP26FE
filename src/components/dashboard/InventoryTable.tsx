const mockInventory = [
  {
    id: 1,
    sku: 'SKU-4002 (Pallet Jack)',
    location: 'Zone C / Rack 02',
    quantity: 12,
  },
  {
    id: 2,
    sku: 'SKU-1082 (Safety Vest)',
    location: 'Zone A / Rack 05',
    quantity: 150,
  },
  {
    id: 3,
    sku: 'SKU-2921 (Tape Roll)',
    location: 'Zone B / Bulk 01',
    quantity: 45,
  },
];

export default function InventoryTable() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl font-bold">Inventory Highlights</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left sketch-box bg-white">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-[#333]">
              <th className="px-6 py-3 font-bold uppercase">SKU / Item</th>
              <th className="px-6 py-3 font-bold uppercase">Location</th>
              <th className="px-6 py-3 font-bold uppercase text-center">Qty</th>
              <th className="px-6 py-3 font-bold uppercase text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333]">
            {mockInventory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 underline cursor-pointer">{item.sku}</td>
                <td className="px-6 py-4">{item.location}</td>
                <td className="px-6 py-4 text-center font-bold">{item.quantity}</td>
                <td className="px-6 py-4 text-right">
                  <span className="material-symbols-outlined cursor-pointer inline-block">
                    edit
                  </span>
                  <span className="material-symbols-outlined cursor-pointer inline-block ml-2">
                    delete
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}