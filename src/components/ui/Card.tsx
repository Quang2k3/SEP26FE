"use client";

 import type { CardProps } from "@/interfaces/ui";

 export function Card({
   header,
   footer,
   title,
   description,
   padded = true,
   hoverable = true,
   className = "",
   children,
   ...props
 }: CardProps) {
   return (
     <div
       {...props}
       className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${
         hoverable ? "hover:shadow-md transition-shadow" : ""
       } ${className}`}
     >
       {header && (
         <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-gray-100">
           {header}
         </div>
       )}

       {(title || description) && !header && (
         <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-gray-100">
           {title && (
             <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
           )}
           {description && (
             <p className="mt-1 text-xs text-gray-500">{description}</p>
           )}
         </div>
       )}

       <div className={padded ? "px-4 sm:px-5 py-4 sm:py-5" : ""}>
         {children}
       </div>

       {footer && (
         <div className="px-4 sm:px-5 py-3 border-t border-gray-100">
           {footer}
         </div>
       )}
     </div>
   );
 }

