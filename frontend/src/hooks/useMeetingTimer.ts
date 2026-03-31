import { useState, useEffect } from 'react';
import { EARLY_JOIN_MIN } from '../utils/meetings';

export type MeetingState = 'LOADING' | 'PENDING' | 'EARLY' | 'ACTIVE' | 'EXPIRED' | 'INVALID';

export function useMeetingTimer(meeting: any | null) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!meeting) {
    return {
      state: 'INVALID' as MeetingState,
      pct: 0,
      msLeft: 0,
      startTime: null,
      endTime: null,
    };
  }

  const startTime = new Date(meeting.start);
  const endTime = new Date(meeting.end);
  const earlyMs = EARLY_JOIN_MIN * 60 * 1000;
  const joinOpenAt = new Date(startTime.getTime() - earlyMs);

  let state: MeetingState = 'LOADING';
  let pct = 0;
  let msLeft = 0;

  if (now > endTime) {
    state = 'EXPIRED';
  } else if (now >= joinOpenAt) {
    state = now < startTime ? 'EARLY' : 'ACTIVE';
    const total = endTime.getTime() - startTime.getTime();
    const elapsed = Math.max(0, now.getTime() - startTime.getTime());
    pct = Math.min(100, Math.round((elapsed / total) * 100));
  } else {
    state = 'PENDING';
    msLeft = joinOpenAt.getTime() - now.getTime();
  }

  return {
    state,
    pct,
    msLeft,
    startTime,
    endTime,
  };
}
