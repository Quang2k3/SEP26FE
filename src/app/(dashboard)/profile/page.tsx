'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';
import type { MeUser, ProfileFormData } from '@/interfaces/profile';
import { updateProfile } from '@/services/authService';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const [userData, setUserData] = useState<MeUser | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    address: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ignore = false;

    const fetchProfile = async () => {
      try {
        const res = await api.get<ApiResponse<MeUser>>('/auth/me');
        if (ignore) return;

        const user = res.data.data;
        if (!user) return;

        setUserData(user);
        setFormData({
          fullName: user.fullName ?? '',
          email: user.email ?? '',
          phone: user.phone ?? '',
          gender: user.gender ?? '',
          dateOfBirth: user.dateOfBirth ?? '',
          address: user.address ?? '',
        });
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      ignore = true;
    };
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }
      setAvatarFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim() || !formData.phone.trim()) {
      toast.error('Full Name and Phone are required');
      return;
    }

    setSaving(true);

    try {
      await updateProfile({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender || null,
        dateOfBirth: formData.dateOfBirth || null,
        address: formData.address.trim() || null,
        avatar: avatarFile,
      });

      toast.success('Profile updated successfully');
      
      // Refresh profile data
      const res = await api.get<ApiResponse<MeUser>>('/auth/me');
      const user = res.data.data;
      if (user) {
        setUserData(user);
        setFormData({
          fullName: user.fullName ?? '',
          email: user.email ?? '',
          phone: user.phone ?? '',
          gender: user.gender ?? '',
          dateOfBirth: user.dateOfBirth ?? '',
          address: user.address ?? '',
        });
        // Reset avatar if not uploading new one
        if (!avatarFile) {
          setAvatarPreview(user.avatarUrl);
        }
      }
      
      // Reset avatar file after successful upload
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      // Error toast sẽ được hiển thị bởi axios interceptor
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 p-4 md:p-8 font-sans">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Personal Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account settings and preferences.</p>
      </div>

      {/* Info Callout (Thay cho Note nét đứt ở dưới cùng) */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-500 text-xl shrink-0 mt-0.5">info</span>
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Profile Edit Rules</p>
          <p className="opacity-90">
            You must have <strong>&apos;Admin&apos;</strong> rights to edit the &apos;Department&apos; and &apos;Employee ID&apos; fields. 
            Photo uploads should be in PNG or JPG format, up to 2MB in size.
          </p>
        </div>
      </div>

      {/* Profile Card Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Profile Photo Section */}
        <div className="p-6 md:p-8 border-b border-gray-200 flex flex-col sm:flex-row items-center sm:items-end gap-6 bg-gray-50/50">
          <div className="relative w-28 h-28 border border-gray-200 rounded-full flex items-center justify-center bg-white shadow-sm overflow-hidden shrink-0 group cursor-pointer">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt={userData?.fullName || 'Avatar'} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-5xl text-gray-300 group-hover:scale-110 transition-transform">person</span>
            )}
            <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
              <span className="material-symbols-outlined text-white">photo_camera</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center sm:items-start gap-2">
            <div className="flex gap-3">
              <label className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
                <span className="material-symbols-outlined text-sm">upload</span>
                Upload New Photo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={loading || saving}
                />
              </label>
              {(avatarPreview || userData?.avatarUrl) && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="px-4 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  disabled={loading || saving}
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">Allowed JPG, GIF or PNG. Max size of 2MB.</p>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 md:p-8 flex flex-col gap-6">
            
            {/* Section: Personal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Enter your name"
                    required
                    disabled={loading || saving}
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Email Address</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">mail</span>
                    <input
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                      type="email"
                      value={formData.email}
                      readOnly
                      disabled
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Phone Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">phone</span>
                    <input
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                      required
                      disabled={loading || saving}
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Gender</label>
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none cursor-pointer bg-white transition-all"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      disabled={loading}
                    >
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    disabled={loading}
                  />
                </div>

                {/* Address */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all resize-none"
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter your address"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button Area */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2"
              type="submit"
              disabled={loading || saving}
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}