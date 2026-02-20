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
      setError('Please enter all 6 digits');
      return;
    }

    // TODO: Gửi OTP lên server để verify
    console.log('OTP:', otp.join(''));
    alert('OTP verified! (Mock)');

    // Mock: Redirect to dashboard after verify
    router.push('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold italic tracking-tight mb-2">
            Verify Your Email
          </h1>
          <p className="text-lg">Enter the 6-digit code sent to your email</p>
        </div>

        {/* OTP Box */}
        <div className="sketch-box p-10 flex flex-col gap-6">
          {/* Error Message */}
          {error && (
            <div className="border-2 border-red-600 bg-red-50 p-3 text-red-700 text-center font-bold">
              {error}
            </div>
          )}

          {/* OTP Inputs */}
          <div className="flex gap-3 justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                className="sketch-input w-12 h-12 text-center text-2xl font-bold"
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
              className="sketch-button w-full text-xl uppercase tracking-widest"
              type="button"
              onClick={handleVerify}
            >
              Verify
            </button>
          </div>

          {/* Resend Code */}
          <div className="text-center pt-4">
            <p className="text-sm italic opacity-60 mb-2">
              Didn't receive a code?
            </p>
            <a className="underline hover:no-underline text-lg" href="#">
              Resend Code
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}