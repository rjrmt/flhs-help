'use client';

import { useEffect, useState } from 'react';
import { FLHS_SCHEDULES } from '@/lib/bell-schedule';

interface CalendarEntry {
  date: string;
  day_code: string;
  school_status: string;
  notes: string;
}

interface ScheduleStatus {
  headline: string;
  primary: string;
  timeRange: string;
  secondary?: Array<{ icon: string; text: string; isNow: boolean }>;
  nextUp?: string;
  nextUpTime?: string;
}

function makeLocalDate(isoDate: string): Date {
  if (!isoDate) return new Date(NaN);
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

function getTodayDate(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function getTodayDateString(): string {
  const today = getTodayDate();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isAfter245PM(): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return hours > 14 || (hours === 14 && minutes >= 45);
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function getCurrentTimeMinutes(): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
  return hour * 60 + minute;
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function getCurrentBellScheduleStatus(dayType: string, dayCode: string): ScheduleStatus | null {
  const nowMinutes = getCurrentTimeMinutes();
  
  let schedule;
  if (dayType === 'earlyRelease' || dayType === 'erd') {
    schedule = FLHS_SCHEDULES.earlyRelease;
  } else if (dayType === 'professionalStudy' || dayType === 'planning' || dayType === 'psd') {
    schedule = FLHS_SCHEDULES.professionalStudy;
  } else {
    schedule = FLHS_SCHEDULES.regular;
  }

  // Check passing periods first
  if (schedule.passing) {
    for (const passing of schedule.passing) {
      const start = timeToMinutes(passing.start);
      const end = timeToMinutes(passing.end);
      if (nowMinutes >= start && nowMinutes < end) {
        let nextBlock = null;
        for (let i = 0; i < schedule.blocks.length; i++) {
          const block = schedule.blocks[i];
          if (block.key === 'lunch_window') continue;
          if (timeToMinutes(block.start) > nowMinutes) {
            nextBlock = block;
            break;
          }
        }
        const headline = dayCode === 'A' ? 'White Day' : dayCode === 'B' ? 'Blue Day' : dayType;
        return {
          headline,
          primary: 'Passing Period',
          timeRange: `${formatTime(passing.start)} - ${formatTime(passing.end)}`,
          secondary: [],
          nextUp: nextBlock ? nextBlock.label : undefined,
          nextUpTime: nextBlock ? formatTime(nextBlock.start) : undefined
        };
      }
    }
  }

  // Handle regular schedule lunch times
  if (schedule === FLHS_SCHEDULES.regular) {
    const lunchWindow = schedule.blocks.find(b => b.key === 'lunch_window');
    if (lunchWindow && lunchWindow.lunchGroups) {
      const lunchA = lunchWindow.lunchGroups.lunchA;
      const lunchB = lunchWindow.lunchGroups.lunchB;
      
      const lunchAStart = timeToMinutes(lunchA.time.start);
      const lunchAEnd = timeToMinutes(lunchA.time.end);
      const lunchBStart = timeToMinutes(lunchB.time.start);
      const lunchBEnd = timeToMinutes(lunchB.time.end);
      const p3p7AStart = timeToMinutes(lunchA.afterLunchClass.start);
      const p3p7BStart = timeToMinutes(lunchB.beforeLunchClass.start);
      
      // During Lunch A time
      if (nowMinutes >= lunchAStart && nowMinutes < lunchAEnd) {
        const headline = dayCode === 'A' ? 'White Day' : dayCode === 'B' ? 'Blue Day' : 'Regular Day';
        return {
          headline,
          primary: 'Period 3/7',
          timeRange: `${formatTime(lunchA.time.start)} - ${formatTime(lunchA.time.end)}`,
          secondary: [
            { icon: '🍽️', text: 'Lunch A NOW (Buildings 21, 20, 5, 9)', isNow: true },
            { icon: '📚', text: 'Lunch B students in class', isNow: false }
          ],
          nextUp: 'Period 3/7 continues',
          nextUpTime: formatTime(lunchA.afterLunchClass.start)
        };
      }
      
      // During Lunch B time
      if (nowMinutes >= lunchBStart && nowMinutes < lunchBEnd) {
        const headline = dayCode === 'A' ? 'White Day' : dayCode === 'B' ? 'Blue Day' : 'Regular Day';
        return {
          headline,
          primary: 'Period 3/7',
          timeRange: `${formatTime(lunchB.time.start)} - ${formatTime(lunchB.time.end)}`,
          secondary: [
            { icon: '📚', text: 'Lunch A students in class', isNow: false },
            { icon: '🍽️', text: 'Lunch B NOW (Buildings 17, 8, PE)', isNow: true }
          ],
          nextUp: 'Period 4/8',
          nextUpTime: formatTime('13:08')
        };
      }
      
      // During Period 3/7 After Lunch A
      if (nowMinutes >= p3p7AStart && nowMinutes < lunchBStart) {
        const headline = dayCode === 'A' ? 'White Day' : dayCode === 'B' ? 'Blue Day' : 'Regular Day';
        return {
          headline,
          primary: 'Period 3/7',
          timeRange: `${formatTime(lunchA.afterLunchClass.start)} - ${formatTime(lunchB.time.start)}`,
          secondary: [
            { icon: '✅', text: 'Lunch A completed', isNow: false },
            { icon: '⏳', text: 'Lunch B starts at 12:30 PM', isNow: false }
          ],
          nextUp: 'Lunch B',
          nextUpTime: formatTime(lunchB.time.start)
        };
      }
      
      // During Period 3/7 Before Lunch B
      if (nowMinutes >= p3p7BStart && nowMinutes < lunchAEnd) {
        const headline = dayCode === 'A' ? 'White Day' : dayCode === 'B' ? 'Blue Day' : 'Regular Day';
        return {
          headline,
          primary: 'Period 3/7',
          timeRange: `${formatTime(lunchB.beforeLunchClass.start)} - ${formatTime(lunchA.time.end)}`,
          secondary: [
            { icon: '🍽️', text: 'Lunch A happening now', isNow: true },
            { icon: '📚', text: 'Lunch B students in class', isNow: false }
          ],
          nextUp: 'Period 3/7 continues',
          nextUpTime: formatTime(lunchA.afterLunchClass.start)
        };
      }
    }
  }

  // Check regular blocks
  for (let i = 0; i < schedule.blocks.length; i++) {
    const block = schedule.blocks[i];
    if (block.key === 'lunch_window') continue;
    
    const start = timeToMinutes(block.start);
    const end = timeToMinutes(block.end);
    
    if (nowMinutes >= start && nowMinutes < end) {
      const nextBlock = schedule.blocks[i + 1];
      const headline = dayCode === 'A' ? 'White Day' : dayCode === 'B' ? 'Blue Day' : dayType;
      return {
        headline,
        primary: block.label,
        timeRange: `${formatTime(block.start)} - ${formatTime(block.end)}`,
        secondary: [],
        nextUp: nextBlock && nextBlock.key !== 'lunch_window' ? nextBlock.label : 'Period 4/8',
        nextUpTime: nextBlock && nextBlock.key !== 'lunch_window' ? formatTime(nextBlock.start) : undefined
      };
    }
  }

  // Before school starts
  const firstBlock = schedule.blocks[0];
  if (nowMinutes < timeToMinutes(firstBlock.start)) {
    const headline = dayCode === 'A' ? 'White Day' : dayCode === 'B' ? 'Blue Day' : dayType;
    return {
      headline,
      primary: 'School starts',
      timeRange: formatTime(firstBlock.start),
      secondary: [],
      nextUp: firstBlock.label,
      nextUpTime: formatTime(firstBlock.start)
    };
  }

  // After school ends
  const lastBlock = schedule.blocks[schedule.blocks.length - 1];
  if (nowMinutes >= timeToMinutes(lastBlock.end)) {
    const headline = dayCode === 'A' ? 'White Day' : dayCode === 'B' ? 'Blue Day' : dayType;
    return {
      headline,
      primary: 'School ended',
      timeRange: formatTime(lastBlock.end),
      secondary: [],
      nextUp: undefined,
      nextUpTime: undefined
    };
  }

  return null;
}

export function BellSchedule() {
  const [loading, setLoading] = useState(true);
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus | null>(null);
  const [backgroundStyle, setBackgroundStyle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSchedule() {
      try {
        const response = await fetch('/api/calendar');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        
        if (!result.success || !result.data) {
          throw new Error('Failed to load calendar');
        }

        const calendarRows: CalendarEntry[] = result.data;
        const today = getTodayDate();
        const dayOfWeek = today.getDay();
        
        // Don't show bell schedule on weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          setScheduleStatus({
            headline: 'Weekend',
            primary: 'No bell schedule',
            timeRange: '',
            secondary: [],
          });
          setBackgroundStyle('linear-gradient(135deg, rgba(15,23,42,0.75), rgba(15,23,42,0.65))');
          setLoading(false);
          return;
        }

        const shouldShowTomorrow = isAfter245PM();
        const targetDateStr = shouldShowTomorrow ? getTomorrowDateString() : getTodayDateString();
        
        const parsedRows = calendarRows
          .map(row => ({
            ...row,
            dateObj: makeLocalDate(row.date || '')
          }))
          .filter(row => row.date && !isNaN((row as any).dateObj?.getTime()))
          .sort((a, b) => (a as any).dateObj.getTime() - (b as any).dateObj.getTime());

        const targetEntry = parsedRows.find(row => row.date.trim() === targetDateStr);
        
        if (!targetEntry) {
          setScheduleStatus({
            headline: 'Schedule Unavailable',
            primary: 'Bell schedule unavailable',
            timeRange: '',
            secondary: [],
          });
          setBackgroundStyle('linear-gradient(135deg, rgba(15,23,42,0.75), rgba(15,23,42,0.65))');
          setLoading(false);
          return;
        }

        const dayCode = (targetEntry.day_code || '').trim();
        const status = (targetEntry.school_status || '').trim().toLowerCase();
        
        let dayType = 'regular';
        if (status === 'erd' || status === 'early release') {
          dayType = 'earlyRelease';
        } else if (status === 'planning' || status === 'psd' || status === 'professional study') {
          dayType = 'professionalStudy';
        } else if (status === 'closes' || status === 'closed') {
          setScheduleStatus({
            headline: 'School Closed',
            primary: 'No bell schedule',
            timeRange: '',
            secondary: [],
          });
          setBackgroundStyle('linear-gradient(135deg, rgba(99,102,241,0.25), rgba(79,70,229,0.18))');
          setLoading(false);
          return;
        } else if (['exam', 'exams', 'midterm', 'final', 'finals'].includes(status)) {
          setScheduleStatus({
            headline: 'Exam Day',
            primary: 'Check your schedule',
            timeRange: '',
            secondary: [],
          });
          setBackgroundStyle('linear-gradient(135deg, rgba(234,179,8,0.25), rgba(202,138,4,0.18))');
          setLoading(false);
          return;
        }

        const statusResult = getCurrentBellScheduleStatus(dayType, dayCode);
        
        if (!statusResult) {
          setScheduleStatus({
            headline: 'Schedule Unavailable',
            primary: 'Bell schedule unavailable',
            timeRange: '',
            secondary: [],
          });
          setBackgroundStyle('linear-gradient(135deg, rgba(15,23,42,0.75), rgba(15,23,42,0.65))');
        } else {
          setScheduleStatus(statusResult);
          
          // Set background based on day type
          if (dayCode === 'A') {
            setBackgroundStyle('linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))');
          } else if (dayCode === 'B') {
            setBackgroundStyle('linear-gradient(135deg, rgba(59,130,246,0.25), rgba(37,99,235,0.18))');
          } else if (dayType === 'earlyRelease') {
            setBackgroundStyle('linear-gradient(135deg, rgba(251,146,60,0.25), rgba(234,88,12,0.18))');
          } else if (dayType === 'professionalStudy') {
            setBackgroundStyle('linear-gradient(135deg, rgba(251,146,60,0.25), rgba(234,88,12,0.18))');
          } else {
            setBackgroundStyle('linear-gradient(135deg, rgba(15,23,42,0.75), rgba(15,23,42,0.65))');
          }
        }

        setLoading(false);
        setError(null);
      } catch (error) {
        console.error('Error loading bell schedule:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setScheduleStatus({
          headline: 'Error',
          primary: 'Unable to load bell schedule',
          timeRange: '',
          secondary: [],
        });
        setBackgroundStyle('linear-gradient(135deg, rgba(15,23,42,0.75), rgba(15,23,42,0.65))');
        setLoading(false);
      }
    }

    loadSchedule();
    
    // Update every minute
    const interval = setInterval(loadSchedule, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div
        className="mx-auto mb-3 px-4 py-3.5 rounded-2xl text-center relative z-[2] w-full backdrop-blur-[35px] border border-white/25"
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
          WebkitBackdropFilter: 'blur(35px) saturate(200%)',
        }}
      >
        <div className="text-white text-sm font-semibold">Loading...</div>
      </div>
    );
  }

  if (!scheduleStatus) return null;

  return (
    <div
      className="mx-auto mb-3 px-4 py-3.5 rounded-2xl text-center relative z-[2] w-full backdrop-blur-[35px] border border-white/25"
      style={{
        background: backgroundStyle || 'rgba(15, 23, 42, 0.75)',
        boxShadow: `
          0 6px 20px rgba(0, 0, 0, 0.35),
          0 0 0 1px rgba(255, 255, 255, 0.18) inset,
          0 0 25px rgba(59, 130, 246, 0.35)
        `,
        WebkitBackdropFilter: 'blur(35px) saturate(200%)',
      }}
    >
      <div className="text-[13px] font-bold mb-1.5 text-white leading-tight flex items-center justify-center gap-2">
        <span>🔔</span>
        <span>{scheduleStatus.primary}</span>
      </div>
      {scheduleStatus.timeRange && (
        <div className="text-[11px] opacity-85 mb-2 font-mono text-white">
          {scheduleStatus.timeRange}
        </div>
      )}
      {scheduleStatus.secondary && scheduleStatus.secondary.length > 0 && (
        <div className="space-y-1 mb-2">
          {scheduleStatus.secondary.map((item, idx) => (
            <div
              key={idx}
              className="text-[11px] leading-relaxed text-white"
              style={{
                opacity: item.isNow ? 1 : 0.75,
                fontWeight: item.isNow ? 600 : 500,
              }}
            >
              {item.icon} {item.text}
            </div>
          ))}
        </div>
      )}
      {scheduleStatus.nextUp && scheduleStatus.nextUpTime && (
        <div className="text-[10px] opacity-70 mt-2 pt-2 border-t border-white/15 text-white">
          Next: {scheduleStatus.nextUp} at {scheduleStatus.nextUpTime}
        </div>
      )}
      {scheduleStatus.nextUp && !scheduleStatus.nextUpTime && (
        <div className="text-[10px] opacity-70 mt-2 pt-2 border-t border-white/15 text-white">
          Next: {scheduleStatus.nextUp}
        </div>
      )}
    </div>
  );
}
