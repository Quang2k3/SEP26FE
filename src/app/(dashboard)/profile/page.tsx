'use client';

import React, { useState } from 'react';

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    fullName: 'John Doe Warehouse Mgr',
    email: 'john.doe@wms-logistics.com',
    employeeId: 'WMS-9921',
    department: 'Logistics Ops',
    warehouse: 'North Central Hub',
  });

  // State quản lý Modal Đổi mật khẩu
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Profile saved:', formData);
    alert('Profile changes saved! (Mock)');
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 p-4 md:p-8 font-sans">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Personal Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account settings and preferences.</p>
      </div>

      {/* Info Callout */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-500 text-xl shrink-0 mt-0.5">info</span>
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Profile Edit Rules</p>
          <p className="opacity-90">
            You must have <strong>'Admin'</strong> rights to edit the 'Department' and 'Employee ID' fields. 
            Photo uploads should be in PNG or JPG format, up to 2MB in size.
          </p>
        </div>
      </div>

      {/* Khối 1: Identity Data (Thông tin định danh của bạn) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Profile Photo Section */}
        <div className="p-6 md:p-8 border-b border-gray-200 flex flex-col sm:flex-row items-center sm:items-end gap-6 bg-gray-50/50">
          <div className="relative w-28 h-28 border border-gray-200 rounded-full flex items-center justify-center bg-white shadow-sm overflow-hidden shrink-0 group cursor-pointer">
            <span className="material-symbols-outlined text-5xl text-gray-300 group-hover:scale-110 transition-transform">person</span>
            <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
               <span className="material-symbols-outlined text-white">photo_camera</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center sm:items-start gap-2">
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center gap-2 outline-none">
                <span className="material-symbols-outlined text-sm">upload</span>
                Upload New Photo
              </button>
              <button className="px-4 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors outline-none">
                Remove
              </button>
            </div>
            <p className="text-xs text-gray-500">Allowed JPG, GIF or PNG. Max size of 2MB.</p>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 md:p-8 flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">mail</span>
                  <input
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Employee ID</label>
                <input
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                  type="text"
                  value={formData.employeeId}
                  readOnly
                  title="Contact IT to change Employee ID"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Department</label>
                <input
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                  type="text"
                  value={formData.department}
                  readOnly
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
              <label className="text-sm font-medium text-gray-700">Warehouse Assignment</label>
              <div className="relative md:w-1/2">
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none cursor-pointer bg-white transition-all"
                  value={formData.warehouse}
                  onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                >
                  <option value="North Central Hub">North Central Hub</option>
                  <option value="East Distribution Center">East Distribution Center</option>
                  <option value="Cold Storage Unit B">Cold Storage Unit B</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">
                  expand_more
                </span>
              </div>
            </div>

          </div>

          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              type="submit"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Khối 2: Security Settings (Chứa nút Change Password) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-amber-600">lock</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Account Security</h2>
              <p className="text-sm text-gray-500 mt-1">
                Ensure your account is using a long, random password to stay secure.
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="shrink-0 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 outline-none focus:ring-2 focus:ring-gray-200"
          >
            <span className="material-symbols-outlined text-sm">key</span>
            Change Password
          </button>
        </div>
      </div>

      {/* --- MODAL: CHANGE PASSWORD --- */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100">
            
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
              <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
              <button 
                onClick={() => setIsPasswordModalOpen(false)} 
                className="text-gray-400 hover:text-gray-700 p-1 rounded-full transition-colors outline-none"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              alert('Password changed successfully! (Mock)');
              setIsPasswordModalOpen(false);
            }} className="p-6 space-y-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Current Password</label>
                <input 
                  type="password" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-sm font-medium text-gray-700">New Password</label>
                <input 
                  type="password" required minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500">Must be at least 8 characters long.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                <input 
                  type="password" required minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-md text-sm font-medium shadow-sm"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}