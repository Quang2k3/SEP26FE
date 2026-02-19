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
      <h3 className="text-xl font-bold">Recent Alerts</h3>
      <div className="sketch-box flex flex-col divide-y-2 divide-[#333] bg-white">
        {mockAlerts.map((alert) => (
          <div key={alert.id} className="p-4 hover:bg-yellow-50 cursor-pointer">
            <p className="font-bold underline">{alert.title}</p>
            <p className="text-sm">{alert.description}</p>
          </div>
        ))}
        <div className="p-4 flex items-center justify-center bg-gray-50">
          <span className="text-sm font-bold uppercase underline cursor-pointer">
            View All Alerts
          </span>
        </div>
      </div>
    </div>
  );
}