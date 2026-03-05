 'use client';

 import React, { useEffect, useState } from 'react';
 import { AdminPage } from '@/components/layout/AdminPage';
 import { Card } from '@/components/ui/Card';
 import { Button } from '@/components/ui/Button';
 import {
   fetchLocations,
   type Location,
   type LocationPage,
   type LocationQueryParams,
 } from '@/services/locationService';

 const DEFAULT_PAGE_SIZE = 20;

 function LocationListContent() {
   const [locations, setLocations] = useState<Location[]>([]);
   const [pageInfo, setPageInfo] = useState<Omit<LocationPage, 'content'>>({
     page: 0,
     size: DEFAULT_PAGE_SIZE,
     totalElements: 0,
     totalPages: 0,
     last: true,
   });
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const [filters, setFilters] = useState<LocationQueryParams>({
     warehouseId: 1,
     page: 0,
     size: DEFAULT_PAGE_SIZE,
   });

   const loadLocations = async (override?: Partial<LocationQueryParams>) => {
     const params: LocationQueryParams = {
       ...filters,
       ...override,
     };

     setLoading(true);
     setError(null);
     try {
       const result = await fetchLocations(params);
       setLocations(result.content);
       setPageInfo({
         page: result.page,
         size: result.size,
         totalElements: result.totalElements,
         totalPages: result.totalPages,
         last: result.last,
       });
       setFilters((prev) => ({
         ...prev,
         page: result.page,
         size: result.size,
       }));
     } catch (err) {
       console.error('Failed to fetch locations', err);
       setError('Không thể tải danh sách locations. Vui lòng thử lại.');
     } finally {
       setLoading(false);
     }
   };

   useEffect(() => {
     // Tải lần đầu với filter mặc định
     loadLocations();
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   const handleSearch = () => {
     loadLocations({ page: 0 });
   };

   const handlePageChange = (nextPage: number) => {
     if (nextPage < 0 || nextPage >= pageInfo.totalPages) return;
     loadLocations({ page: nextPage });
   };

   const handleFilterChange = (
     field: keyof LocationQueryParams,
     value: string,
   ) => {
     setFilters((prev) => {
       if (field === 'warehouseId' || field === 'zoneId' || field === 'page' || field === 'size') {
         return {
           ...prev,
           [field]: value === '' ? undefined : Number(value),
         };
       }
       if (field === 'active') {
         return {
           ...prev,
           active: value === '' ? undefined : value === 'true',
         };
       }
       if (field === 'locationType') {
         return {
           ...prev,
           locationType: value === '' ? undefined : (value as any),
         };
       }
       return {
         ...prev,
         [field]: value,
       };
     });
   };

   const currentFrom = pageInfo.totalElements === 0
     ? 0
     : pageInfo.page * pageInfo.size + 1;
   const currentTo = Math.min(
     pageInfo.totalElements,
     (pageInfo.page + 1) * pageInfo.size,
   );

   return (
     <AdminPage
       title="Locations"
       description="Danh sách locations theo kho, zone, loại location."
       actions={
         <Button
           variant="outline"
           size="sm"
           onClick={handleSearch}
           leftIcon={
             <span className="material-symbols-outlined text-sm">refresh</span>
           }
         >
           Refresh
         </Button>
       }
     >
       {/* Filters */}
       <Card className="flex flex-col gap-3">
         <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
           <div className="flex flex-col gap-1">
             <label className="text-xs font-medium text-gray-600">
               Warehouse ID
             </label>
             <input
               type="number"
               value={filters.warehouseId}
               onChange={(e) =>
                 handleFilterChange('warehouseId', e.target.value)
               }
               className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
           </div>

           <div className="flex flex-col gap-1">
             <label className="text-xs font-medium text-gray-600">Zone ID</label>
             <input
               type="number"
               value={filters.zoneId ?? ''}
               onChange={(e) => handleFilterChange('zoneId', e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
               placeholder="Any"
             />
           </div>

           <div className="flex flex-col gap-1">
             <label className="text-xs font-medium text-gray-600">
               Location Type
             </label>
             <select
               value={filters.locationType ?? ''}
               onChange={(e) =>
                 handleFilterChange('locationType', e.target.value)
               }
               className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
             >
               <option value="">All</option>
               <option value="AISLE">AISLE</option>
               <option value="RACK">RACK</option>
               <option value="BIN">BIN</option>
               <option value="STAGING">STAGING</option>
             </select>
           </div>

           <div className="flex flex-col gap-1">
             <label className="text-xs font-medium text-gray-600">Active</label>
             <select
               value={
                 typeof filters.active === 'boolean'
                   ? String(filters.active)
                   : ''
               }
               onChange={(e) => handleFilterChange('active', e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
             >
               <option value="">All</option>
               <option value="true">Active</option>
               <option value="false">Inactive</option>
             </select>
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
           <div className="flex flex-col gap-1 md:col-span-2">
             <label className="text-xs font-medium text-gray-600">
               Keyword
             </label>
             <input
               type="text"
               value={filters.keyword ?? ''}
               onChange={(e) => handleFilterChange('keyword', e.target.value)}
               placeholder="Search by location code or parent code..."
               className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
           </div>

           <div className="flex items-end gap-2">
             <Button
               variant="outline"
               size="sm"
               onClick={() => {
                 setFilters({
                   warehouseId: filters.warehouseId,
                   page: 0,
                   size: DEFAULT_PAGE_SIZE,
                 });
                 loadLocations({
                   warehouseId: filters.warehouseId,
                   page: 0,
                   size: DEFAULT_PAGE_SIZE,
                   zoneId: undefined,
                   locationType: undefined,
                   active: undefined,
                   keyword: undefined,
                 });
               }}
             >
               Clear
             </Button>
             <Button size="sm" onClick={handleSearch}>
               Search
             </Button>
           </div>
         </div>

         {error && (
           <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
             {error}
           </div>
         )}
       </Card>

       {/* Table */}
       <Card className="overflow-hidden" padded={false}>
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse min-w-[960px]">
             <thead>
               <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                 <th className="px-6 py-3">Location Code</th>
                 <th className="px-6 py-3">Zone</th>
                 <th className="px-6 py-3">Type</th>
                 <th className="px-6 py-3">Max Weight (kg)</th>
                 <th className="px-6 py-3">Max Volume (m³)</th>
                 <th className="px-6 py-3 text-center">Picking Face</th>
                 <th className="px-6 py-3 text-center">Staging</th>
                 <th className="px-6 py-3 text-center">Active</th>
                 <th className="px-6 py-3">Updated At</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 text-sm">
               {loading ? (
                 <tr>
                   <td
                     colSpan={9}
                     className="px-6 py-6 text-center text-gray-500"
                   >
                     Loading locations...
                   </td>
                 </tr>
               ) : locations.length === 0 ? (
                 <tr>
                   <td
                     colSpan={9}
                     className="px-6 py-6 text-center text-gray-500"
                   >
                     No locations found for current filters.
                   </td>
                 </tr>
               ) : (
                 locations.map((loc) => (
                   <tr
                     key={loc.locationId}
                     className="hover:bg-gray-50 transition-colors"
                   >
                     <td className="px-6 py-3 font-medium text-gray-900">
                       {loc.locationCode}
                     </td>
                     <td className="px-6 py-3 text-gray-700">
                       {loc.zoneCode} (#{loc.zoneId})
                     </td>
                     <td className="px-6 py-3 text-gray-700">
                       {loc.locationType}
                     </td>
                     <td className="px-6 py-3 text-gray-700">
                       {loc.maxWeightKg}
                     </td>
                     <td className="px-6 py-3 text-gray-700">
                       {loc.maxVolumeM3}
                     </td>
                     <td className="px-6 py-3 text-center">
                       {loc.isPickingFace ? (
                         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                           Yes
                         </span>
                       ) : (
                         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                           No
                         </span>
                       )}
                     </td>
                     <td className="px-6 py-3 text-center">
                       {loc.isStaging ? (
                         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                           Yes
                         </span>
                       ) : (
                         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                           No
                         </span>
                       )}
                     </td>
                     <td className="px-6 py-3 text-center">
                       {loc.active ? (
                         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                           Active
                         </span>
                       ) : (
                         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                           Inactive
                         </span>
                       )}
                     </td>
                     <td className="px-6 py-3 text-gray-500 text-xs">
                       {new Date(loc.updatedAt).toLocaleString()}
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
         </div>

         {/* Pagination */}
         <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
           <div className="text-xs text-gray-500">
             {pageInfo.totalElements > 0 ? (
               <>
                 Showing{' '}
                 <span className="font-semibold text-gray-700">
                   {currentFrom}
                 </span>{' '}
                 to{' '}
                 <span className="font-semibold text-gray-700">
                   {currentTo}
                 </span>{' '}
                 of{' '}
                 <span className="font-semibold text-gray-700">
                   {pageInfo.totalElements}
                 </span>{' '}
                 locations
               </>
             ) : (
               'No locations'
             )}
           </div>
           <div className="flex items-center gap-1 justify-end">
             <Button
               variant="outline"
               size="sm"
               onClick={() => handlePageChange(pageInfo.page - 1)}
               disabled={pageInfo.page === 0 || loading}
             >
               Previous
             </Button>
             <span className="px-2 text-xs text-gray-600">
               Page {pageInfo.totalPages === 0 ? 0 : pageInfo.page + 1} of{' '}
               {pageInfo.totalPages}
             </span>
             <Button
               variant="outline"
               size="sm"
               onClick={() => handlePageChange(pageInfo.page + 1)}
               disabled={pageInfo.last || loading}
             >
               Next
             </Button>
           </div>
         </div>
       </Card>
     </AdminPage>
   );
 }

 export default function LocationPage() {
   return <LocationListContent />;
 }

