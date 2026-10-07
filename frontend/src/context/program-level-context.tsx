"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ProgramLevel = "BS" | "INTERMEDIATE";

interface ProgramLevelContextType {
  programLevel: ProgramLevel;
  setProgramLevel: (level: ProgramLevel) => void;
  toggleProgramLevel: () => void;
}

const LOCAL_STORAGE_KEY = "college_portal_program_level";

const ProgramLevelContext = createContext<ProgramLevelContextType | undefined>(
  undefined
);

export function ProgramLevelProvider({ children }: { children: React.ReactNode }) {
  const [programLevel, setProgramLevelState] = useState<ProgramLevel>("BS");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY) as ProgramLevel | null;
      if (saved === "BS" || saved === "INTERMEDIATE") {
        setProgramLevelState(saved);
      }
    } catch {
      /* ignore localStorage read errors */
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const setProgramLevel = (level: ProgramLevel) => {
    setProgramLevelState(level);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, level);
    } catch {
      /* ignore localStorage write errors */
    }
  };

  const toggleProgramLevel = () => {
    const nextLevel: ProgramLevel = programLevel === "BS" ? "INTERMEDIATE" : "BS";
    setProgramLevel(nextLevel);
  };

  return (
    <ProgramLevelContext.Provider
      value={{
        programLevel: isInitialized ? programLevel : "BS",
        setProgramLevel,
        toggleProgramLevel,
      }}
    >
      {children}
    </ProgramLevelContext.Provider>
  );
}

export function useProgramLevel(): ProgramLevelContextType {
  const context = useContext(ProgramLevelContext);
  if (!context) {
    throw new Error("useProgramLevel must be used within a ProgramLevelProvider");
  }
  return context;
}
