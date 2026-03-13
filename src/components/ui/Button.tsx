"use client";

 import type { ButtonProps } from "@/interfaces/ui";

 type ButtonVariant = "primary" | "secondary" | "outline" | "danger";
 type ButtonSize = "sm" | "md" | "lg";

 const baseClasses =
   "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed gap-2";

 const variantClasses: Record<ButtonVariant, string> = {
   primary:
     "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600",
   secondary:
     "bg-gray-100 text-gray-800 hover:bg-gray-200 focus-visible:ring-gray-400",
   outline:
     "border border-gray-300 text-gray-800 bg-white hover:bg-gray-50 focus-visible:ring-gray-400",
   danger:
     "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
 };

 const sizeClasses: Record<ButtonSize, string> = {
   sm: "h-8 px-3 text-xs",
   md: "h-9 px-4 text-sm",
   lg: "h-11 px-5 text-sm",
 };

 export function Button({
   variant = "primary",
   size = "md",
   isLoading,
   leftIcon,
   rightIcon,
   children,
   className = "",
   disabled,
   ...props
 }: ButtonProps) {
   const isDisabled = disabled || isLoading;

   return (
     <button
       {...props}
       disabled={isDisabled}
       className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
     >
       {isLoading && (
         <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
       )}
       {!isLoading && leftIcon}
       <span>{children}</span>
       {!isLoading && rightIcon}
     </button>
   );
 }

