'use client';

import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Mock token
    const mockToken = 'mock-token-' + Date.now();

    // Lưu vào localStorage
    localStorage.setItem('auth_token', mockToken);

    // Lưu vào cookie (cho middleware)
    document.cookie = `auth_token=${mockToken}; path=/; max-age=86400`;

    // Redirect
    router.push('/verify-email');
  };  

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-block border-2 border-black p-2 mb-2">
            <span className="material-symbols-outlined text-4xl">inventory_2</span>
          </div>
          <h1 className="text-3xl font-bold italic tracking-tight">WMS Login</h1>
          <p className="text-sm">Warehouse Management System v4.2.0</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sketch-box p-10 flex flex-col gap-6">
            <div className="space-y-2">
              <label className="block text-xl font-bold" htmlFor="username">
                Username
              </label>
              <input
                className="sketch-input w-full text-lg"
                id="username"
                name="username"
                placeholder="Enter username..."
                type="text"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xl font-bold" htmlFor="password">
                Password
              </label>
              <input
                className="sketch-input w-full text-lg"
                id="password"
                name="password"
                placeholder="Enter password..."
                type="password"
                required
              />
            </div>

            <div className="pt-2">
              <button
                className="sketch-button w-full text-xl uppercase tracking-widest"
                type="submit"
              >
                Login
              </button>
            </div>

            <div className="text-center pt-4">
              <a className="underline hover:no-underline text-lg" href="#">
                Forgot Password?
              </a>
            </div>
          </div>
        </form>

        <div className="mt-12 flex justify-between text-xs text-gray-500 italic">
          <span>[ Wireframe v1.0 ]</span>
          <span>Confidential - Internal Use Only</span>
        </div>
      </div>
    </div>
  );
}