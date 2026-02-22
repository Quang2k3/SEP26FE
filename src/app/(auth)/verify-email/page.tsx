'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    // Chỉ cho phép nhập số
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(''); // Xóa lỗi khi user nhập

    // Auto focus sang ô tiếp theo
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace: xóa và focus về ô trước
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    // Check xem đã điền đủ 6 ô chưa
    if (otp.some(digit => digit === '')) {
      setError('Please enter all 6 digits to verify.');
      return;
    }

    // TODO: Gửi OTP lên server để verify
    console.log('OTP:', otp.join(''));
    // alert('OTP verified! (Mock)'); // Đã ẩn alert đi để chuyển trang mượt hơn

    // Mock: Redirect to dashboard after verify
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        
        {/* Header / Branding - Đồng bộ với trang Login */}
        <div className="bg-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-inner mb-4">
            <span className="material-symbols-outlined text-4xl text-blue-600">mark_email_read</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Verify Your Email</h1>
          <p className="text-blue-100 text-sm mt-1">Enter the 6-digit code sent to your email</p>
        </div>

        {/* Form Body */}
        <div className="p-8 flex flex-col gap-6">
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              {error}
            </div>
          )}

          {/* OTP Inputs */}
          <div className="flex gap-2 sm:gap-3 justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                className="w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-bold text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                maxLength={1}
                type="text"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
              />
            ))}
          </div>

          {/* Verify Button */}
          <div className="pt-2">
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              type="button"
              onClick={handleVerify}
            >
              Verify Code
              <span className="material-symbols-outlined text-sm">check_circle</span>
            </button>
          </div>

          {/* Resend Code */}
          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-1">
              Didn't receive a code?
            </p>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
              Resend Code
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}