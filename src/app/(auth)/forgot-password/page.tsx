'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'REQUEST_EMAIL' | 'VERIFY_OTP' | 'RESET_PASSWORD';

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState<Step>('REQUEST_EMAIL');
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const handleRequestOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setCurrentStep('VERIFY_OTP');
    }, 1000);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setCurrentStep('RESET_PASSWORD');
    }, 1000);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Password updated successfully! Redirecting to login...');
      router.push('/login');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        
        <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50/50 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-blue-600 text-2xl">
              {currentStep === 'REQUEST_EMAIL' ? 'mail_lock' : 
               currentStep === 'VERIFY_OTP' ? 'dialpad' : 'key'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentStep === 'REQUEST_EMAIL' && 'Forgot Password'}
            {currentStep === 'VERIFY_OTP' && 'Check Your Email'}
            {currentStep === 'RESET_PASSWORD' && 'Set New Password'}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {currentStep === 'REQUEST_EMAIL' && 'Enter your email address to receive a verification code.'}
            {currentStep === 'VERIFY_OTP' && (
              <span>We sent a 6-digit code to <strong className="text-gray-900">{email || 'your email'}</strong>.</span>
            )}
            {currentStep === 'RESET_PASSWORD' && 'Create a strong, secure password for your account.'}
          </p>
        </div>

        <div className="p-6 md:p-8">
          
          {currentStep === 'REQUEST_EMAIL' && (
            <form onSubmit={handleRequestOTP} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <input 
                  type="email" required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  data-lpignore="true" 
                  data-form-type="other"
                />
              </div>
              <button 
                type="submit" disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:bg-blue-400 flex justify-center items-center gap-2"
              >
                {isLoading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : 'Send Reset Code'}
              </button>
            </form>
          )}

          {currentStep === 'VERIFY_OTP' && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 text-center">Verification Code</label>
                <input 
                  type="text" required maxLength={6} pattern="\d{6}"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg tracking-[0.5em] text-center font-mono transition-all"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  autoComplete="off"
                  data-lpignore="true"
                />
                <div className="flex justify-center items-center mt-3 gap-1">
                  <span className="text-xs text-gray-500">Didn't receive the code?</span>
                  <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-800">Resend Code</button>
                </div>
              </div>
              <button 
                type="submit" disabled={isLoading || otp.length !== 6}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:bg-blue-400 flex justify-center items-center gap-2"
              >
                {isLoading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : 'Verify Code'}
              </button>
            </form>
          )}

          {currentStep === 'RESET_PASSWORD' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">New Password</label>
                <input 
                  type="password" required minLength={8}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  data-lpignore="true"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                <input 
                  type="password" required minLength={8}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  data-lpignore="true"
                />
              </div>
              <button 
                type="submit" disabled={isLoading}
                className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:bg-gray-500 flex justify-center items-center gap-2"
              >
                {isLoading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : 'Update Password'}
              </button>
            </form>
          )}

        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-center">
          <button 
            type="button"
            onClick={() => {
              if (currentStep !== 'REQUEST_EMAIL') setCurrentStep('REQUEST_EMAIL');
              else router.push('/login');
            }}
            className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            {currentStep === 'REQUEST_EMAIL' ? 'Back to Login' : 'Use a different email'}
          </button>
        </div>

      </div>
    </div>
  );
}