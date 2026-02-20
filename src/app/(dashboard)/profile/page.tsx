'use client';

import { useState } from 'react';

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    fullName: 'John Doe Warehouse Mgr',
    email: 'john.doe@wms-logistics.com',
    employeeId: 'WMS-9921',
    department: 'Logistics Ops',
    warehouse: 'North Central Hub',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Profile saved:', formData);
    alert('Profile changes saved! (Mock)');
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-bold">Personal Profile (Wireframe)</h2>
        <div className="h-1 w-full bg-[#333]"></div>
      </div>

      {/* Profile Content */}
      <div className="max-w-2xl">
        {/* Profile Photo */}
        <div className="mb-10 flex items-end gap-6">
          <div className="relative w-[120px] h-[120px] border-2 border-[#333] rounded-full flex items-center justify-center bg-white overflow-hidden">
            {/* X placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-full h-[2px] bg-[#333] rotate-45"></div>
              <div className="absolute w-full h-[2px] bg-[#333] -rotate-45"></div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button className="sketch-button px-4 py-2 text-sm font-bold">Upload Photo</button>
            <p className="text-xs italic">(X represents placeholder)</p>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {/* Full Name */}
          <div className="flex flex-col gap-2">
            <label className="text-xl font-bold">Full Name:</label>
            <input
              className="sketch-input text-lg"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter your name..."
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-xl font-bold">Email Address:</label>
            <input
              className="sketch-input text-lg"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          {/* Employee ID & Department */}
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
              <label className="text-xl font-bold">Employee ID:</label>
              <input
                className="sketch-input text-lg bg-gray-100 text-gray-500"
                type="text"
                value={formData.employeeId}
                readOnly
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xl font-bold">Department:</label>
              <div className="sketch-box p-3 text-lg bg-gray-100 text-gray-500">
                {formData.department}
              </div>
            </div>
          </div>

          {/* Warehouse Assignment */}
          <div className="flex flex-col gap-2">
            <label className="text-xl font-bold">Warehouse Assignment:</label>
            <select
              className="sketch-input text-lg cursor-pointer"
              value={formData.warehouse}
              onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
            >
              <option>North Central Hub</option>
              <option>East Distribution Center</option>
              <option>Cold Storage Unit B</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="mt-8 pt-8 border-t-2 border-[#333]">
            <button
              className="sketch-button w-full py-4 text-2xl font-bold hover:bg-black hover:text-white transition-colors"
              type="submit"
            >
              Save Profile Changes
            </button>
          </div>
        </form>

        {/* Note */}
        <div className="mt-16 p-4 border-2 border-dashed border-gray-400 text-gray-500 max-w-sm">
          <p className="text-sm">
            Note: User must have 'Admin' rights to edit the 'Department' field. 
            Photo upload should support PNG/JPG up to 2MB.
          </p>
        </div>
      </div>
    </div>
  );
}