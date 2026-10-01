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

export function getSubjectSetsForDiscipline(discipline: string): readonly string[] {
  return INTERMEDIATE_SUBJECT_SETS[discipline] || ["Set 1"];
}

export const PROGRAM_LEVELS = ["BS", "INTERMEDIATE"] as const;
export type ProgramLevelType = (typeof PROGRAM_LEVELS)[number];

export const INTERMEDIATE_PARTS = [1, 2] as const;

export function getDisciplinesForLevel(level: "BS" | "INTERMEDIATE" | string): readonly string[] {
  return level === "INTERMEDIATE" ? INTERMEDIATE_DISCIPLINES : DEPARTMENTS;
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

export function getSubjectSetFilterConfig(discipline: string): SubjectSetFilterConfig {
  const sets = getSubjectSetsForDiscipline(discipline);
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
