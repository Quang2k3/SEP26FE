'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestPasswordReset } from '@/services/authService';

export default function AuthForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      await requestPasswordReset(email);
      setMessage('Vui lòng kiểm tra email để đặt lại mật khẩu.');
    } catch (err: any) {
      // BUG-10 FIX: hiển thị lỗi lên UI thay vì chỉ console.error
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg || 'Gửi yêu cầu thất bại. Vui lòng kiểm tra lại email hoặc thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-inner mb-4">
            <span className="material-symbols-outlined text-4xl text-blue-600">mail_lock</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Forgot Password</h1>
          <p className="text-blue-100 text-sm mt-1">
            Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                mail
              </span>
              <input
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                id="email"
                name="email"
                type="email"
                placeholder="user@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-2">
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              <span className="material-symbols-outlined text-sm">
                {isLoading ? 'hourglass_top' : 'send'}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-900 mt-3"
          >
            Quay lại đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
}

