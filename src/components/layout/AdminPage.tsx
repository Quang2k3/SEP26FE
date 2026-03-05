 'use client';

 import type { ReactNode } from 'react';

 interface AdminPageProps {
   title: string;
   description?: string;
   actions?: ReactNode;
   breadcrumb?: ReactNode;
   headerMeta?: ReactNode;
   children: ReactNode;
 }

 export function AdminPage({
   title,
   description,
   actions,
   breadcrumb,
   headerMeta,
   children,
 }: AdminPageProps) {
   return (
     <div className="w-full flex flex-col gap-6 font-sans">
       {breadcrumb && <div className="text-xs text-gray-500">{breadcrumb}</div>}

       <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
           <div className="flex items-center gap-2 flex-wrap">
             <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
               {title}
             </h1>
             {headerMeta}
           </div>
           {description && (
             <p className="mt-1 text-sm text-gray-500">{description}</p>
           )}
         </div>

         {actions && (
           <div className="flex items-center gap-3 flex-wrap justify-end">
             {actions}
           </div>
         )}
       </div>

       {children}
     </div>
   );
 }

