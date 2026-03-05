 'use client';

 import React, { useMemo, useState } from 'react';
 import { useRouter } from 'next/navigation';
 import { Button } from '@/components/ui/Button';
 import { Card } from '@/components/ui/Card';
 import EditOutboundModal from '@/components/outbound/EditOutboundModal';
 import type { OutboundFormData } from '@/components/outbound/CreateOutboundModal';

 const MOCK_OUTBOUND_DETAILS: OutboundFormData[] = [
   {
     shipmentCode: 'SHIP-2023-001',
     customer: 'Global Logistics inc.',
     binCode: 'A-101-01',
     expectedDate: '2023-10-24',
     quantity: '120',
     notes: 'Standard outbound to main DC.',
   },
   {
     shipmentCode: 'SHIP-2023-002',
     customer: 'Pioneer Parts Co',
     binCode: 'B-202-05',
     expectedDate: '2023-10-25',
     quantity: '64',
     notes: 'Priority delivery, handle with care.',
   },
 ];

 const STATUS_BY_SHIPMENT: Record<string, string> = {
   'SHIP-2023-001': 'Shipped',
   'SHIP-2023-002': 'Pending',
   'SHIP-2023-003': 'In Transit',
   'SHIP-2023-004': 'Processing',
   'SHIP-2023-005': 'Cancelled',
   'SHIP-2023-006': 'Shipped',
 };

 const STATUS_COLORS: Record<string, string> = {
   Shipped: 'bg-green-100 text-green-800',
   Pending: 'bg-yellow-100 text-yellow-800',
   'In Transit': 'bg-blue-100 text-blue-800',
   Processing: 'bg-purple-100 text-purple-800',
   Cancelled: 'bg-red-100 text-red-800',
 };

 interface OutboundDetailPageProps {
   params: {
     id: string;
   };
 }

 export default function OutboundDetailPage({ params }: OutboundDetailPageProps) {
   const router = useRouter();
   const [showEditModal, setShowEditModal] = useState(false);

   const data = useMemo<OutboundFormData | null>(() => {
     const found = MOCK_OUTBOUND_DETAILS.find(
       (item) => item.shipmentCode === params.id,
     );
     if (found) return found;
     return {
       shipmentCode: params.id,
       customer: 'Unknown Customer',
       binCode: 'N/A',
       expectedDate: '',
       quantity: '0',
       notes: '',
     };
   }, [params.id]);

   const status = STATUS_BY_SHIPMENT[params.id] ?? 'Pending';

   const handleEdit = () => {
     setShowEditModal(true);
   };

   const handleDelete = () => {
     // Mock delete
     // eslint-disable-next-line no-alert
     if (window.confirm('Are you sure you want to delete this outbound shipment?')) {
       // Thay bằng gọi API thực tế
       // eslint-disable-next-line no-console
       console.log('API Call: Delete outbound', params.id);
       router.push('/outbound');
     }
   };

   const handleCloseEdit = () => {
     setShowEditModal(false);
   };

   const handleSubmitEdit = (updated: OutboundFormData) => {
     // Thay bằng gọi API thực tế
     // eslint-disable-next-line no-console
     console.log('API Call: Update outbound', updated);
     setShowEditModal(false);
   };

   return (
     <div className="w-full flex flex-col gap-6 font-sans">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
           <button
             type="button"
             onClick={() => router.push('/outbound')}
             className="flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
           >
             <span className="material-symbols-outlined text-[18px]">
               arrow_back
             </span>
           </button>
           <div>
             <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
               Outbound Detail
             </h1>
             <p className="mt-1 text-xs md:text-sm text-gray-500">
               Shipment&nbsp;
               <span className="font-semibold text-gray-800">
                 {data?.shipmentCode}
               </span>
               .
             </p>
           </div>
         </div>

         <div className="flex items-center gap-2 md:gap-3">
           <span
             className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800'}`}
           >
             {status}
           </span>
           <Button
             variant="outline"
             size="sm"
             onClick={handleEdit}
             leftIcon={
               <span className="material-symbols-outlined text-[16px]">edit</span>
             }
           >
             Edit
           </Button>
           <Button
             variant="danger"
             size="sm"
             onClick={handleDelete}
             leftIcon={
               <span className="material-symbols-outlined text-[16px]">delete</span>
             }
           >
             Delete
           </Button>
         </div>
       </div>

       {/* Summary */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card>
           <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
             Shipment Code
           </div>
           <div className="mt-1 text-sm font-bold text-gray-900">
             {data?.shipmentCode}
           </div>
         </Card>
         <Card>
           <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
             Customer
           </div>
           <div className="mt-1 text-sm font-medium text-gray-900">
             {data?.customer}
           </div>
         </Card>
         <Card>
           <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
             Expected Date
           </div>
           <div className="mt-1 text-sm font-medium text-gray-900">
             {data?.expectedDate || 'N/A'}
           </div>
         </Card>
       </div>

       {/* Details */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <Card className="lg:col-span-2">
           <h2 className="text-sm font-semibold text-gray-900 mb-3">
             Shipment Information
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
             <div>
               <div className="text-xs font-medium text-gray-500">Source Bin</div>
               <div className="mt-1 text-gray-900">{data?.binCode}</div>
             </div>
             <div>
               <div className="text-xs font-medium text-gray-500">
                 Quantity (Units)
               </div>
               <div className="mt-1 text-gray-900">{data?.quantity}</div>
             </div>
           </div>
           <div className="mt-4">
             <div className="text-xs font-medium text-gray-500">Notes</div>
             <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
               {data?.notes || 'No additional notes.'}
             </p>
           </div>
         </Card>

         <Card>
           <h2 className="text-sm font-semibold text-gray-900 mb-3">
             Timeline (Mock)
           </h2>
           <ol className="space-y-3 text-xs text-gray-700">
             <li className="flex gap-2">
               <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
               <div>
                 <div className="font-semibold text-gray-900">
                   Created
                 </div>
                 <div className="text-gray-500">2023-10-22 09:15</div>
               </div>
             </li>
             <li className="flex gap-2">
               <span className="mt-0.5 h-2 w-2 rounded-full bg-amber-500" />
               <div>
                 <div className="font-semibold text-gray-900">
                   Allocated from Bin
                 </div>
                 <div className="text-gray-500">2023-10-23 14:30</div>
               </div>
             </li>
             <li className="flex gap-2">
               <span className="mt-0.5 h-2 w-2 rounded-full bg-green-500" />
               <div>
                 <div className="font-semibold text-gray-900">
                   Shipped
                 </div>
                 <div className="text-gray-500">2023-10-24 08:10</div>
               </div>
             </li>
           </ol>
         </Card>
       </div>

       {data && (
         <EditOutboundModal
           isOpen={showEditModal}
           initialData={data}
           onClose={handleCloseEdit}
           onSubmit={handleSubmitEdit}
         />
       )}
     </div>
   );
 }

