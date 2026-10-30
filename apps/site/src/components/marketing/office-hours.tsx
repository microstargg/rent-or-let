"use client";

import { useEffect, useState } from "react";
import { todayName } from "@/lib/hours";
import { cn } from "@/lib/utils";

/** Opening hours table with today's row picked out (worked out in the browser, UK time). */
export function OfficeHours({ hours }: { hours: Array<{ day: string; hours: string }> }) {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayName()), []);
  const listsWeekend = hours.some(({ day }) => /^(sat|sun)/i.test(day));

  return (
    <table className="mt-4 w-full border-collapse text-[15px] tabular-nums">
      <tbody>
        {hours.map(({ day, hours: dayHours }) => {
          const isToday = today !== null && day.trim().toLowerCase() === today.toLowerCase();
          return (
            <tr key={day} className={cn("border-t", isToday && "font-semibold text-foreground")}>
              <th scope="row" className={cn("py-2 text-left", isToday ? "font-semibold" : "font-normal")}>
                {day}
                {isToday ? <span className="text-muted-foreground"> · today</span> : null}
              </th>
              <td className="py-2 text-right">{dayHours}</td>
            </tr>
          );
        })}
        {!listsWeekend ? (
          <tr className="border-t text-muted-foreground">
            <th scope="row" className="py-2 text-left font-normal">
              Saturday – Sunday
            </th>
            <td className="py-2 text-right">Closed</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
