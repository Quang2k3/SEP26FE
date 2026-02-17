export default function VerifyEmailPage() {
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
          {/* OTP Inputs */}
          <div className="flex gap-3 justify-center">
            <input
              className="sketch-input w-12 h-12 text-center text-2xl font-bold"
              maxLength={1}
              type="text"
            />
            <input
              className="sketch-input w-12 h-12 text-center text-2xl font-bold"
              maxLength={1}
              type="text"
            />
            <input
              className="sketch-input w-12 h-12 text-center text-2xl font-bold"
              maxLength={1}
              type="text"
            />
            <input
              className="sketch-input w-12 h-12 text-center text-2xl font-bold"
              maxLength={1}
              type="text"
            />
            <input
              className="sketch-input w-12 h-12 text-center text-2xl font-bold"
              maxLength={1}
              type="text"
            />
            <input
              className="sketch-input w-12 h-12 text-center text-2xl font-bold"
              maxLength={1}
              type="text"
            />
          </div>

          {/* Verify Button */}
          <div className="pt-2">
            <button
              className="sketch-button w-full text-xl uppercase tracking-widest"
              type="button"
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