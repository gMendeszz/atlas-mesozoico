// Ancient continents: downloads the time slice for the middle of the selected range (without
// blocking the screen). Until the new slice arrives, the previous one stays (points don't "blink").
import { useEffect, useState } from "react";
import { loadTimeSlice, timeSliceForRange } from "../paleo";
import type { Continents, TimeSlice } from "../types";

export interface PaleoState {
  timeSlice: TimeSlice | null; // positions to use in the calculation; null = present-day continents (or the 1st hasn't arrived)
  t: number; // time slice that should be on screen
  loading: boolean;
  error: boolean;
}

export function useTimeSlice(continents: Continents, from: number, to: number, signature: string | null): PaleoState {
  const t = timeSliceForRange(from, to);
  const ancient = continents === "ancient";
  const [loaded, setLoaded] = useState<TimeSlice | null>(null);
  const [errorAt, setErrorAt] = useState<number | null>(null);

  useEffect(() => {
    if (!ancient || !signature) return;
    let current = true; // ignores late responses (the user may have changed the slice or the mode)
    loadTimeSlice(t, signature)
      .then((d) => current && setLoaded(d))
      .catch(() => current && setErrorAt(t));
    return () => {
      current = false;
    };
  }, [ancient, t, signature]);

  const timeSlice = ancient ? loaded : null;
  const error = ancient && errorAt === t && loaded?.t !== t;
  return { timeSlice, t, loading: ancient && loaded?.t !== t && !error, error };
}
