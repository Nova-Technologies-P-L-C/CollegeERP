export const TIMETABLE_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type TimetableDay = (typeof TIMETABLE_DAYS)[number];

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DAY_LOOKUP: Record<string, TimetableDay> = TIMETABLE_DAYS.reduce(
  (acc, day) => {
    acc[day.toLowerCase()] = day;
    return acc;
  },
  {} as Record<string, TimetableDay>
);

export interface TimetablePayload {
  courseId: string;
  room: string;
  day: TimetableDay;
  startTime: string;
  endTime: string;
  shift: string;
}

export function normalizeTimetableDay(input: string): TimetableDay | null {
  return DAY_LOOKUP[input.trim().toLowerCase()] ?? null;
}

export function isValidTimeHHMM(value: string): boolean {
  return HH_MM_PATTERN.test(value);
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function hasTimeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

export function parseTimetablePayload(payload: unknown):
  | { ok: true; data: TimetablePayload }
  | { ok: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid timetable payload" };
  }

  const input = payload as Record<string, unknown>;

  const courseId = String(input.courseId ?? "").trim();
  const room = String(input.room ?? "").trim();
  const dayRaw = String(input.day ?? "").trim();
  const startTime = String(input.startTime ?? "").trim();
  const endTime = String(input.endTime ?? "").trim();
  const shift = String(input.shift ?? "Morning").trim();

  if (!courseId || !room || !dayRaw || !startTime || !endTime) {
    return {
      ok: false,
      error: "courseId, room, day, startTime, and endTime are required",
    };
  }

  const day = normalizeTimetableDay(dayRaw);
  if (!day) {
    return {
      ok: false,
      error: `day must be one of: ${TIMETABLE_DAYS.join(", ")}`,
    };
  }

  if (shift !== "Morning" && shift !== "Evening") {
    return {
      ok: false,
      error: "shift must be either 'Morning' or 'Evening'",
    };
  }

  if (!isValidTimeHHMM(startTime) || !isValidTimeHHMM(endTime)) {
    return {
      ok: false,
      error: "startTime and endTime must be in HH:mm format",
    };
  }

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return {
      ok: false,
      error: "startTime must be earlier than endTime",
    };
  }

  return {
    ok: true,
    data: {
      courseId,
      room,
      day,
      startTime,
      endTime,
      shift,
    },
  };
}