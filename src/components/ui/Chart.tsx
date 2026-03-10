"use client";

 import {
   LineChart,
   Line,
   BarChart,
   Bar,
   XAxis,
   YAxis,
   Tooltip,
   ResponsiveContainer,
   CartesianGrid,
 } from "recharts";
 import type { ChartProps } from "@/interfaces/ui";

 type ChartType = "line" | "bar";

 export function Chart<T extends object>({
   type = "line",
   data,
   dataKeyX,
   series,
   height = 260,
   showGrid = true,
 }: ChartProps<T>) {
   const ChartImpl = type === "bar" ? BarChart : LineChart;

   return (
     <div className="w-full">
       <div style={{ width: "100%", height }}>
         <ResponsiveContainer>
           <ChartImpl data={data}>
             {showGrid && <CartesianGrid strokeDasharray="3 3" />}
             <XAxis dataKey={dataKeyX as string} />
             <YAxis />
             <Tooltip />
             {type === "line"
               ? series.map((s) => (
                   <Line
                     key={String(s.dataKey)}
                     type="monotone"
                     dataKey={s.dataKey as string}
                     stroke={s.color ?? "#3b82f6"}
                     name={s.name}
                     strokeWidth={2}
                     dot={false}
                     activeDot={{ r: 5 }}
                   />
                 ))
               : series.map((s) => (
                   <Bar
                     key={String(s.dataKey)}
                     dataKey={s.dataKey as string}
                     fill={s.color ?? "#3b82f6"}
                     name={s.name}
                     radius={[4, 4, 0, 0]}
                   />
                 ))}
           </ChartImpl>
         </ResponsiveContainer>
       </div>
     </div>
   );
 }

