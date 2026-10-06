/**
 * Academic constants, departments, disciplines, and helper functions.
 */

export const DEPARTMENTS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "English",
  "Chemistry",
  "Economics",
  "Political Science",
  "Zoology",
  "Urdu",
  "Islamic Studies",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const INTERMEDIATE_DISCIPLINES = [
  "F.Sc Pre-Medical",
  "F.Sc Pre-Engineering",
  "ICS",
  "FA",
  "FA IT",
  "I.Com",
  "Home Economics",
] as const;

export type IntermediateDiscipline = (typeof INTERMEDIATE_DISCIPLINES)[number];

export const INTERMEDIATE_SUBJECT_SETS: Record<string, readonly string[]> = {
  "F.Sc Pre-Medical": ["Set 1"],
  "F.Sc Pre-Engineering": ["Set 1"],
  "ICS": ["Set 1", "Set 2", "Set 3", "Set 4"],
  "FA": ["Set 1", "Set 2", "Set 3", "Set 4"],
  "FA IT": ["Set 1", "Set 2", "Set 3"],
  "I.Com": ["Set 1"],
  "Home Economics": ["Set 1"],
};

export interface DisciplineItem {
  name: string;
  subjectSets: string[];
  description?: string;
  isDefault?: boolean;
}

let _cachedCustomDisciplines: string[] = [];
let _cachedSubjectSetsMap: Record<string, readonly string[]> = {};

export function setCachedCustomDisciplines(disciplines: string[]): void {
  _cachedCustomDisciplines = disciplines;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("custom_intermediate_disciplines", JSON.stringify(disciplines));
    } catch {
      // ignore
    }
  }
}

export function getCachedCustomDisciplines(): string[] {
  if (_cachedCustomDisciplines.length > 0) {
    return _cachedCustomDisciplines;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("custom_intermediate_disciplines");
      if (stored) {
        _cachedCustomDisciplines = JSON.parse(stored);
        return _cachedCustomDisciplines;
      }
    } catch {
      // ignore
    }
  }
  return [];
}

export function setCachedSubjectSetsMap(setsMap: Record<string, readonly string[]>): void {
  _cachedSubjectSetsMap = setsMap;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("custom_intermediate_subject_sets", JSON.stringify(setsMap));
    } catch {
      // ignore
    }
  }
}

export function getCachedSubjectSetsMap(): Record<string, readonly string[]> {
  if (Object.keys(_cachedSubjectSetsMap).length > 0) {
    return _cachedSubjectSetsMap;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("custom_intermediate_subject_sets");
      if (stored) {
        _cachedSubjectSetsMap = JSON.parse(stored);
        return _cachedSubjectSetsMap;
      }
    } catch {
      // ignore
    }
  }
  return {};
}

export function getDisciplinesForLevel(
  level: "BS" | "INTERMEDIATE" | string,
  customDisciplines?: string[] | readonly string[]
): readonly string[] {
  if (level === "INTERMEDIATE") {
    const customs =
      customDisciplines && customDisciplines.length > 0
        ? customDisciplines
        : getCachedCustomDisciplines();
    if (customs && customs.length > 0) {
      return Array.from(new Set([...INTERMEDIATE_DISCIPLINES, ...customs]));
    }
    return INTERMEDIATE_DISCIPLINES;
  }
  return DEPARTMENTS;
}

export function getTermOptionsForLevel(level: "BS" | "INTERMEDIATE" | string): readonly number[] {
  return level === "INTERMEDIATE" ? [1, 2] : [1, 2, 3, 4, 5, 6, 7, 8];
}

export function formatTermLabel(level: "BS" | "INTERMEDIATE" | string, term: number): string {
  if (level === "INTERMEDIATE") {
    return term === 1 ? "Part 1" : term === 2 ? "Part 2" : `Part ${term}`;
  }
  return `Sem ${term}`;
}

export interface SubjectSetFilterConfig {
  defaultSet: string;
  hasMultipleSets: boolean;
  availableSets: readonly string[];
}

export function getSubjectSetsForDiscipline(
  discipline: string,
  customSetsMap?: Record<string, readonly string[]>
): readonly string[] {
  const map = customSetsMap || getCachedSubjectSetsMap();
  if (map && map[discipline]) {
    return map[discipline];
  }
  return INTERMEDIATE_SUBJECT_SETS[discipline] || ["Set 1"];
}

export function getSubjectSetFilterConfig(
  discipline: string,
  customSetsMap?: Record<string, readonly string[]>
): SubjectSetFilterConfig {
  const sets = getSubjectSetsForDiscipline(discipline, customSetsMap);
  return {
    defaultSet: "Set 1",
    hasMultipleSets: sets.length > 1,
    availableSets: sets,
  };
}

export function formatCourseCode(code: string, programLevel: string): string {
  if (programLevel === "INTERMEDIATE" && code) {
    const parts = code.split("-");
    return parts.length >= 3 ? parts.slice(2).join("-") : code;
  }
  return code;
}
