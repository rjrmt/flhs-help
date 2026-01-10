/**
 * FLHS Bell Schedule Data
 * 
 * This file contains all bell schedule definitions for:
 * - Regular days (White/Blue rotation)
 * - Early Release days
 * - Professional Study days
 * 
 * Times are in 24-hour format (HH:MM) in America/New_York timezone.
 */

export interface ScheduleBlock {
  key: string;
  label: string;
  start: string;
  end: string;
  lunchGroups?: {
    lunchA: {
      label: string;
      time: { start: string; end: string };
      buildings: string[];
      afterLunchClass: { label: string; start: string; end: string };
    };
    lunchB: {
      label: string;
      time: { start: string; end: string };
      buildings: string[];
      beforeLunchClass: { label: string; start: string; end: string };
    };
  };
}

export interface Schedule {
  blocks: ScheduleBlock[];
  passing?: Array<{ label: string; start: string; end: string }>;
}

export const FLHS_SCHEDULES: {
  regular: Schedule;
  earlyRelease: Schedule;
  professionalStudy: Schedule;
} = {
  regular: {
    blocks: [
      { key: "p1p5", label: "Period 1/5", start: "07:40", end: "09:12" },
      { key: "p2p6", label: "Period 2/6", start: "09:19", end: "10:51" },
      {
        key: "lunch_window",
        label: "Lunch Window",
        start: "10:51",
        end: "13:01",
        lunchGroups: {
          lunchA: {
            label: "Lunch A",
            time: { start: "10:51", end: "11:22" },
            buildings: ["21", "20", "5", "9"],
            afterLunchClass: { label: "Period 3/7 (After Lunch A)", start: "11:29", end: "13:01" }
          },
          lunchB: {
            label: "Lunch B",
            time: { start: "12:30", end: "13:01" },
            buildings: ["17", "8", "PE"],
            beforeLunchClass: { label: "Period 3/7 (Before Lunch B)", start: "10:58", end: "12:30" }
          }
        }
      },
      { key: "p4p8", label: "Period 4/8", start: "13:08", end: "14:40" }
    ],
    passing: [
      { label: "Passing", start: "09:12", end: "09:19" },
      { label: "Passing", start: "10:51", end: "10:58" },
      { label: "Passing", start: "13:01", end: "13:08" }
    ]
  },

  earlyRelease: {
    blocks: [
      { key: "p1p5", label: "Period 1/5", start: "07:40", end: "08:50" },
      { key: "p2p6", label: "Period 2/6", start: "08:56", end: "10:08" },
      { key: "p3p7", label: "Period 3/7", start: "10:14", end: "11:24" },
      { key: "p4p8", label: "Period 4/8", start: "11:30", end: "12:40" },
      { key: "lunch", label: "Grab & Go Lunch", start: "12:40", end: "12:50" },
      { key: "buses", label: "Buses Depart", start: "12:50", end: "12:50" }
    ]
  },

  professionalStudy: {
    blocks: [
      { key: "p1p5", label: "Period 1/5", start: "07:40", end: "08:35" },
      { key: "p2p6", label: "Period 2/6", start: "08:41", end: "09:38" },
      { key: "p3p7", label: "Period 3/7", start: "09:44", end: "10:39" },
      { key: "p4p8", label: "Period 4/8", start: "10:45", end: "11:40" },
      { key: "lunch", label: "Grab & Go Lunch", start: "11:40", end: "11:50" },
      { key: "buses", label: "Buses Depart", start: "11:50", end: "11:50" }
    ]
  }
};
