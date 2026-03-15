'use client';

import React, { useState, useEffect } from 'react';
import type { OutboundFormData, CreateOutboundModalProps } from '@/interfaces/modals';
import Portal from '@/components/ui/Portal';

 export default function CreateOutboundModal({
   isOpen,
   binCode,
   onClose,
   onSubmit,
 }: CreateOutboundModalProps) {
   const [formData, setFormData] = useState<OutboundFormData>({
     binCode: binCode || '',
     shipmentCode: '',
     customer: '',
     expectedDate: '',
     quantity: '',
     notes: '',
   });

   useEffect(() => {
     if (isOpen) {
       setFormData({
         binCode: binCode || '',
         shipmentCode: '',
         customer: '',
         expectedDate: '',
         quantity: '',
         notes: '',
       });
     }
   }, [isOpen, binCode]);

   if (!isOpen) return null;

   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     onSubmit(formData);
   };

   return (
     <Portal>
     <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans">
       <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col border border-gray-100">
         {/* Header */}
         <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 text-blue-600">
               <span className="material-symbols-outlined">outbound</span>
             </div>
             <div>
               <h2 className="text-xl font-bold text-gray-900">
                 Create Outbound from Bin
               </h2>
               {binCode && (
                 <p className="text-xs font-medium text-gray-500 mt-0.5">
                   Source Bin:&nbsp;
                   <span className="font-semibold text-gray-800">
                     {binCode}
                   </span>
                 </p>
               )}
             </div>
           </div>
           <button
             type="button"
             onClick={onClose}
             className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors outline-none focus:ring-2 focus:ring-gray-200"
           >
             <span className="material-symbols-outlined text-lg">close</span>
           </button>
         </div>

         {/* Body */}
         <form
           id="create-outbound-form"
           onSubmit={handleSubmit}
           className="p-6 space-y-6 max-h-[70vh] overflow-y-auto"
         >
           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div className="space-y-1.5">
               <label className="block text-sm font-semibold text-gray-700">
                 Shipment Code <span className="text-red-500">*</span>
               </label>
               <input
                 type="text"
                 required
                 placeholder="e.g. SHIP-2024-001"
                 value={formData.shipmentCode}
                 onChange={(e) =>
                   setFormData({ ...formData, shipmentCode: e.target.value })
                 }
                 className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-900"
               />
             </div>

             <div className="space-y-1.5">
               <label className="block text-sm font-semibold text-gray-700">
                 Customer / Consignee <span className="text-red-500">*</span>
               </label>
               <input
                 type="text"
                 required
                 placeholder="Customer name"
                 value={formData.customer}
                 onChange={(e) =>
                   setFormData({ ...formData, customer: e.target.value })
                 }
                 className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-900"
               />
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div className="space-y-1.5">
               <label className="block text-sm font-semibold text-gray-700">
                 Source Bin
               </label>
               <input
                 type="text"
                 readOnly
                 value={formData.binCode}
                 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900"
               />
             </div>

             <div className="space-y-1.5">
               <label className="block text-sm font-semibold text-gray-700">
                 Expected Ship Date
               </label>
               <input
                 type="date"
                 value={formData.expectedDate}
                 onChange={(e) =>
                   setFormData({ ...formData, expectedDate: e.target.value })
                 }
                 className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
               />
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div className="space-y-1.5">
               <label className="block text-sm font-semibold text-gray-700">
                 Quantity (Units)
               </label>
               <input
                 type="number"
                 min={0}
                 placeholder="0"
                 value={formData.quantity}
                 onChange={(e) =>
                   setFormData({ ...formData, quantity: e.target.value })
                 }
                 className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
               />
             </div>
           </div>

           <div className="space-y-1.5">
             <label className="block text-sm font-semibold text-gray-700">
               Notes
             </label>
             <textarea
               rows={3}
               placeholder="Additional instructions or references (SO number, carrier, etc.)"
               value={formData.notes}
               onChange={(e) =>
                 setFormData({ ...formData, notes: e.target.value })
               }
               className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
             />
           </div>
         </form>

         {/* Footer */}
         <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
           <button
             type="button"
             onClick={onClose}
             className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
           >
             Cancel
           </button>
           <button
             type="submit"
             form="create-outbound-form"
             className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
           >
             <span className="material-symbols-outlined text-sm">
               local_shipping
             </span>
             Create Outbound
           </button>
         </div>
       </div>
     </div>
    </Portal>
   );
 }

