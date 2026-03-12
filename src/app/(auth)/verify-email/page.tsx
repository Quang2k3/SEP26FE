'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resendOtp, verifyOtp } from '@/services/authService';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('pending_token');
    const storedEmail = localStorage.getItem('pending_email');
    if (!token || !storedEmail) {
      router.replace('/login');
      return;
    }
    setPendingToken(token);
    setEmail(storedEmail);
  }, [router]);

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (otp.some((digit) => digit === '')) {
      setError('Please enter all 6 digits to verify.');
      return;
    }
    if (!pendingToken) {
      setError('Phiên xác thực không hợp lệ. Vui lòng đăng nhập lại.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await verifyOtp({ pendingToken, otp: otp.join('') });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pending_token');
        localStorage.removeItem('pending_email');
      }
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      const apiMessage =
        err?.response?.data?.message || err?.message || 'Không thể xác thực OTP. Vui lòng thử lại.';
      setError(apiMessage);
    } finally {
      setIsLoading(false);
    }
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
          
          {/* Error / Success Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              {error}
            </div>
          )}
          {message && !error && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-3 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
              {message}
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
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              type="button"
              onClick={handleVerify}
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
              <span className="material-symbols-outlined text-sm">
                {isLoading ? 'hourglass_top' : 'check_circle'}
              </span>
            </button>
          </div>

          {/* Resend Code */}
          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-1">
              {email
                ? `Didn't receive a code? We can resend it to ${email}.`
                : "Didn't receive a code?"}
            </p>
            <button
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors disabled:text-blue-300"
              type="button"
              disabled={isLoading || !pendingToken}
              onClick={async () => {
                if (!pendingToken) return;
                setIsLoading(true);
                setError('');
                setMessage('');
                try {
                  await resendOtp(pendingToken);
                  setMessage('Mã OTP mới đã được gửi tới email của bạn.');
                } catch (err: any) {
                  console.error('Resend OTP error:', err);
                  const apiMessage =
                    err?.response?.data?.message ||
                    err?.message ||
                    'Không thể gửi lại mã. Vui lòng thử lại.';
                  setError(apiMessage);
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              Resend Code
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}