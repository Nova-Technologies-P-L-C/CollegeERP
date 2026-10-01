import { hasTimeOverlap } from "@/lib/timetable";
import { ProgramLevel } from "@prisma/client";

export interface CSPSlotRequest {
  courseId: string;
  courseCode: string;
  courseName: string;
  facultyId: string | null;
  facultyName: string;
  requiredSlotsCount: number;
}

export interface CSPTimeSlot {
  startTime: string;
  endTime: string;
  slotIndex: number;
}

export interface ExistingBooking {
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  facultyId?: string | null;
  programLevel?: ProgramLevel | string;
  department?: string | null;
  semester?: number | null;
  discipline?: string | null;
  part?: number | null;
  shift?: string;
  courseId?: string;
}

export interface CSPSolveOptions {
  programLevel?: ProgramLevel | string;
  department?: string;
  semester?: number;
  discipline?: string;
  part?: number;
  shift?: string;
  days: string[];
  rooms: string[];
  timeslots: CSPTimeSlot[];
  courses: CSPSlotRequest[];
  existingBookings: ExistingBooking[];
  overwriteExisting: boolean;
}

export interface CSPSlotAssignment {
  courseId: string;
  courseCode: string;
  courseName: string;
  facultyName: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

export interface CSPSolveResult {
  success: boolean;
  assignments: CSPSlotAssignment[];
  error?: string;
  diagnostics?: {
    totalSlotsNeeded: number;
    totalSlotsAvailable: number;
    bottleneckReason?: string;
  };
}

interface DomainOption {
  day: string;
  slot: CSPTimeSlot;
  room: string;
}

interface CSPVariable {
  id: string; // e.g. `${courseId}_${instanceIndex}`
  courseId: string;
  courseCode: string;
  courseName: string;
  facultyId: string | null;
  facultyName: string;
  instanceIndex: number;
  domains: DomainOption[];
}

function isVirtualRoom(roomName: string): boolean {
  const normalized = roomName.trim().toLowerCase();
  return (
    normalized.includes("online") ||
    normalized.includes("virtual") ||
    normalized.includes("zoom") ||
    normalized.includes("teams")
  );
}

export function solveTimetableCSP(options: CSPSolveOptions): CSPSolveResult {
  const {
    programLevel = "BS",
    department = "",
    semester = 1,
    discipline = "",
    part = 1,
    shift = "Morning",
    days,
    rooms,
    timeslots,
    courses,
    existingBookings,
    overwriteExisting,
  } = options;

  if (!days || days.length === 0) {
    return { success: false, assignments: [], error: "No active class days selected for auto-generation." };
  }
  if (!rooms || rooms.length === 0) {
    return { success: false, assignments: [], error: "No rooms provided for auto-generation." };
  }
  if (!timeslots || timeslots.length === 0) {
    return { success: false, assignments: [], error: "No timeslots defined." };
  }
  if (!courses || courses.length === 0) {
    return { success: false, assignments: [], error: "No courses provided." };
  }

  // Filter existing bookings: Exclude Target Academic Group entries when overwriteExisting is true
  const relevantExisting = existingBookings.filter((b) => {
    if (overwriteExisting) {
      const bLevel = b.programLevel ? String(b.programLevel).toUpperCase() : "BS";
      const targetLevel = String(programLevel).toUpperCase();

      if (bLevel === "INTERMEDIATE" && targetLevel === "INTERMEDIATE") {
        const isSameIntermediateGroup =
          b.discipline?.trim().toLowerCase() === discipline.trim().toLowerCase() &&
          b.part === part;
        if (isSameIntermediateGroup) return false;
      } else if (bLevel === "BS" && targetLevel === "BS") {
        const isSameBSGroup =
          b.department?.trim().toLowerCase() === department.trim().toLowerCase() &&
          b.semester === semester &&
          b.shift?.trim().toLowerCase() === shift.trim().toLowerCase();
        if (isSameBSGroup) return false;
      }
    }
    return true;
  });

  // Calculate total slots required
  let totalSlotsNeeded = 0;
  const variables: CSPVariable[] = [];

  for (const c of courses) {
    const slotsCount = Math.max(1, c.requiredSlotsCount);
    totalSlotsNeeded += slotsCount;

    for (let i = 0; i < slotsCount; i++) {
      const rawDomains: DomainOption[] = [];

      for (const day of days) {
        for (const slot of timeslots) {
          // Check if there is no faculty conflict
          let facultyConflicted = false;

          for (const room of rooms) {
            const hasConflict = relevantExisting.some((exist) => {
              if (exist.day !== day) return false;
              if (!hasTimeOverlap(slot.startTime, slot.endTime, exist.startTime, exist.endTime)) {
                return false;
              }

              // Faculty conflict check
              if (c.facultyId && exist.facultyId && c.facultyId === exist.facultyId) {
                facultyConflicted = true;
                return true;
              }

              // Room conflict check (unless virtual room)
              if (
                !isVirtualRoom(room) &&
                exist.room.trim().toLowerCase() === room.trim().toLowerCase()
              ) {
                return true;
              }

              // Student Section conflict check
              const targetLevel = String(programLevel).toUpperCase();
              const existLevel = exist.programLevel
                ? String(exist.programLevel).toUpperCase()
                : "BS";

              if (targetLevel === "INTERMEDIATE" && existLevel === "INTERMEDIATE") {
                if (
                  exist.discipline?.trim().toLowerCase() === discipline.trim().toLowerCase() &&
                  exist.part === part
                ) {
                  return true;
                }
              } else if (targetLevel === "BS" && existLevel === "BS") {
                if (
                  exist.department?.trim().toLowerCase() === department.trim().toLowerCase() &&
                  exist.semester === semester &&
                  exist.shift?.trim().toLowerCase() === shift.trim().toLowerCase()
                ) {
                  return true;
                }
              }

              return false;
            });

            if (!hasConflict) {
              // Add domain option with candidate room
              rawDomains.push({ day, slot, room });
            }
          }

          if (facultyConflicted) {
            // Prune timeslots where assigned faculty is busy
            continue;
          }
        }
      }

      variables.push({
        id: `${c.courseId}_${i}`,
        courseId: c.courseId,
        courseCode: c.courseCode,
        courseName: c.courseName,
        facultyId: c.facultyId,
        facultyName: c.facultyName,
        instanceIndex: i,
        domains: rawDomains,
      });
    }
  }

  const totalTimeSlotsAvailable = days.length * timeslots.length;

  if (totalSlotsNeeded > totalTimeSlotsAvailable) {
    return {
      success: false,
      assignments: [],
      error: `Insufficient time slots: Required ${totalSlotsNeeded} weekly class slots, but only ${totalTimeSlotsAvailable} time slots are available across selected days (${days.length} days × ${timeslots.length} slots).`,
      diagnostics: {
        totalSlotsNeeded,
        totalSlotsAvailable: totalTimeSlotsAvailable,
        bottleneckReason: "Not enough time slots in selected days.",
      },
    };
  }

  // Check if any course variable has 0 initial valid candidate domains
  const emptyVar = variables.find((v) => v.domains.length === 0);
  if (emptyVar) {
    return {
      success: false,
      assignments: [],
      error: `Conflict detected: Cannot find any available time slot for "${emptyVar.courseCode} - ${emptyVar.courseName}". The assigned faculty member (${emptyVar.facultyName}) or requested rooms are already fully booked in all available timeslots.`,
      diagnostics: {
        totalSlotsNeeded,
        totalSlotsAvailable: totalTimeSlotsAvailable,
        bottleneckReason: `Initial domain for course ${emptyVar.courseCode} is empty due to faculty/room collision with existing timetables.`,
      },
    };
  }

  // Backtracking solver with MRV Heuristic, Forward Checking, and Step Safety Guard
  const solutionMap = new Map<string, DomainOption>();
  const courseDayCountMap = new Map<string, Map<string, number>>();

  courses.forEach((c) => courseDayCountMap.set(c.courseId, new Map()));

  let stepCount = 0;
  const MAX_STEPS = 20000;
  const MAX_RUNTIME_MS = 3000;
  const startedAt = Date.now();
  let timedOut = false;

  function findAvailableRoomForSlot(
    day: string,
    slot: CSPTimeSlot,
    candidateRoom: string
  ): string | null {
    // 1. Check if candidate room is available in partial solution
    const roomTakenInSolution = Array.from(solutionMap.values()).some((assigned) => {
      if (assigned.day !== day) return false;
      if (!hasTimeOverlap(slot.startTime, slot.endTime, assigned.slot.startTime, assigned.slot.endTime)) {
        return false;
      }
      if (isVirtualRoom(candidateRoom)) return false;
      return assigned.room.trim().toLowerCase() === candidateRoom.trim().toLowerCase();
    });

    if (!roomTakenInSolution) return candidateRoom;

    // 2. Fallback: try any other room from options
    for (const r of rooms) {
      const taken = Array.from(solutionMap.values()).some((assigned) => {
        if (assigned.day !== day) return false;
        if (!hasTimeOverlap(slot.startTime, slot.endTime, assigned.slot.startTime, assigned.slot.endTime)) {
          return false;
        }
        if (isVirtualRoom(r)) return false;
        return assigned.room.trim().toLowerCase() === r.trim().toLowerCase();
      });

      if (!taken) {
        // Check external conflict for room r
        const extConflict = relevantExisting.some((exist) => {
          if (exist.day !== day) return false;
          if (!hasTimeOverlap(slot.startTime, slot.endTime, exist.startTime, exist.endTime)) return false;
          if (!isVirtualRoom(r) && exist.room.trim().toLowerCase() === r.trim().toLowerCase()) return true;
          return false;
        });

        if (!extConflict) return r;
      }
    }

    return null;
  }

  function isInternalConflict(varItem: CSPVariable, option: DomainOption): boolean {
    const { day, slot } = option;

    for (const [, assignedOption] of solutionMap.entries()) {
      if (assignedOption.day !== day) continue;

      if (!hasTimeOverlap(slot.startTime, slot.endTime, assignedOption.slot.startTime, assignedOption.slot.endTime)) {
        continue;
      }

      // 1. Student section overlap (section can only take 1 class at a time)
      return true;
    }

    for (const [assignedVarId, assignedOption] of solutionMap.entries()) {
      if (assignedOption.day !== day) continue;

      if (!hasTimeOverlap(slot.startTime, slot.endTime, assignedOption.slot.startTime, assignedOption.slot.endTime)) {
        continue;
      }

      // 2. Faculty overlap
      const assignedVar = variables.find((v) => v.id === assignedVarId);
      if (varItem.facultyId && assignedVar?.facultyId && varItem.facultyId === assignedVar.facultyId) {
        return true;
      }
    }

    // 3. Room availability check
    const validRoom = findAvailableRoomForSlot(day, slot, option.room);
    if (!validRoom) return true;

    return false;
  }

  function backtrack(unassignedVars: CSPVariable[]): boolean {
    stepCount++;
    if (stepCount > MAX_STEPS) {
      return false; // Safety guard to prevent infinite loops
    }
    if (stepCount % 100 === 0 && Date.now() - startedAt > MAX_RUNTIME_MS) {
      timedOut = true;
      return false;
    }

    if (unassignedVars.length === 0) {
      return true; // All variables assigned successfully!
    }

    // MRV Heuristic: Choose variable with minimum remaining valid domains
    unassignedVars.sort((a, b) => {
      const validA = a.domains.filter((opt) => !isInternalConflict(a, opt)).length;
      const validB = b.domains.filter((opt) => !isInternalConflict(b, opt)).length;
      return validA - validB;
    });

    const currentVar = unassignedVars[0];
    const remainingVars = unassignedVars.slice(1);

    // Filter valid domains for currentVar
    const validDomains = currentVar.domains.filter((opt) => !isInternalConflict(currentVar, opt));

    // Deduplicate domains by (day, slot) to avoid redundant attempts
    const uniqueTimeDomains: DomainOption[] = [];
    const seenKeys = new Set<string>();

    for (const opt of validDomains) {
      const key = `${opt.day}_${opt.slot.startTime}_${opt.slot.endTime}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        // Ensure option gets a valid room assigned
        const room = findAvailableRoomForSlot(opt.day, opt.slot, opt.room);
        if (room) {
          uniqueTimeDomains.push({ ...opt, room });
        }
      }
    }

    // Sort domain options to favor even day distribution across the week
    const courseDays = courseDayCountMap.get(currentVar.courseId)!;
    uniqueTimeDomains.sort((a, b) => {
      const countA = courseDays.get(a.day) || 0;
      const countB = courseDays.get(b.day) || 0;
      return countA - countB;
    });

    for (const option of uniqueTimeDomains) {
      solutionMap.set(currentVar.id, option);
      const dayCounts = courseDayCountMap.get(currentVar.courseId)!;
      dayCounts.set(option.day, (dayCounts.get(option.day) || 0) + 1);

      // Forward Checking: verify that all remaining variables still have at least one valid option
      let forwardCheckPassed = true;
      for (const futureVar of remainingVars) {
        const hasValidOption = futureVar.domains.some((futOpt) => !isInternalConflict(futureVar, futOpt));
        if (!hasValidOption) {
          forwardCheckPassed = false;
          break;
        }
      }

      if (forwardCheckPassed) {
        const result = backtrack(remainingVars);
        if (result) return true;
      }

      // Backtrack
      solutionMap.delete(currentVar.id);
      dayCounts.set(option.day, dayCounts.get(option.day)! - 1);
      if (dayCounts.get(option.day) === 0) {
        dayCounts.delete(option.day);
      }
    }

    return false;
  }

  const success = backtrack([...variables]);

  if (!success) {
    const reason =
      timedOut || stepCount > MAX_STEPS
        ? "Execution time limit reached. The timetable constraints are too tightly packed."
        : "Could not generate a conflict-free schedule with the current rooms, days, and timeslots. Try adding more rooms or active days.";

    return {
      success: false,
      assignments: [],
      error: reason,
      diagnostics: {
        totalSlotsNeeded,
        totalSlotsAvailable: totalTimeSlotsAvailable,
        bottleneckReason: reason,
      },
    };
  }

  // Format assignments
  const finalAssignments: CSPSlotAssignment[] = [];
  for (const v of variables) {
    const assigned = solutionMap.get(v.id);
    if (assigned) {
      finalAssignments.push({
        courseId: v.courseId,
        courseCode: v.courseCode,
        courseName: v.courseName,
        facultyName: v.facultyName,
        day: assigned.day,
        startTime: assigned.slot.startTime,
        endTime: assigned.slot.endTime,
        room: assigned.room,
      });
    }
  }

  return {
    success: true,
    assignments: finalAssignments,
  };
}

