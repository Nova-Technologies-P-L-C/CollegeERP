import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface HsscSubjectDef {
  code: string;
  name: string;
  creditHours: number;
}

interface SetDefinition {
  set: string;
  setNum: number;
  part1Subjects: HsscSubjectDef[];
  part2Subjects: HsscSubjectDef[];
}

interface DisciplineDefinition {
  discipline: string;
  prefix: string;
  sets: SetDefinition[];
}

const HSSC_DISCIPLINES: DisciplineDefinition[] = [
  // 1. F.Sc Pre-Medical
  {
    discipline: "F.Sc Pre-Medical",
    prefix: "PMED",
    sets: [
      {
        set: "Set 1",
        setNum: 1,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "PHY-11", name: "Physics (Part 1)", creditHours: 4 },
          { code: "CHM-11", name: "Chemistry (Part 1)", creditHours: 4 },
          { code: "BIO-11", name: "Biology (Part 1)", creditHours: 4 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "PHY-12", name: "Physics (Part 2)", creditHours: 4 },
          { code: "CHM-12", name: "Chemistry (Part 2)", creditHours: 4 },
          { code: "BIO-12", name: "Biology (Part 2)", creditHours: 4 },
        ],
      },
    ],
  },

  // 2. F.Sc Pre-Engineering
  {
    discipline: "F.Sc Pre-Engineering",
    prefix: "PENG",
    sets: [
      {
        set: "Set 1",
        setNum: 1,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "PHY-11", name: "Physics (Part 1)", creditHours: 4 },
          { code: "CHM-11", name: "Chemistry (Part 1)", creditHours: 4 },
          { code: "MTH-11", name: "Mathematics (Part 1)", creditHours: 4 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "PHY-12", name: "Physics (Part 2)", creditHours: 4 },
          { code: "CHM-12", name: "Chemistry (Part 2)", creditHours: 4 },
          { code: "MTH-12", name: "Mathematics (Part 2)", creditHours: 4 },
        ],
      },
    ],
  },

  // 3. ICS / General Science
  {
    discipline: "ICS",
    prefix: "ICS",
    sets: [
      // Set 1: Math, Economics, Statistics
      {
        set: "Set 1",
        setNum: 1,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "MTH-11", name: "Mathematics (Part 1)", creditHours: 4 },
          { code: "ECO-11", name: "Economics (Part 1)", creditHours: 3 },
          { code: "STA-11", name: "Statistics (Part 1)", creditHours: 3 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "MTH-12", name: "Mathematics (Part 2)", creditHours: 4 },
          { code: "ECO-12", name: "Economics (Part 2)", creditHours: 3 },
          { code: "STA-12", name: "Statistics (Part 2)", creditHours: 3 },
        ],
      },
      // Set 2: Math, Computer Science, Statistics
      {
        set: "Set 2",
        setNum: 2,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "MTH-11", name: "Mathematics (Part 1)", creditHours: 4 },
          { code: "CSC-11", name: "Computer Science (Part 1)", creditHours: 4 },
          { code: "STA-11", name: "Statistics (Part 1)", creditHours: 3 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "MTH-12", name: "Mathematics (Part 2)", creditHours: 4 },
          { code: "CSC-12", name: "Computer Science (Part 2)", creditHours: 4 },
          { code: "STA-12", name: "Statistics (Part 2)", creditHours: 3 },
        ],
      },
      // Set 3: Math, Computer Science, Physics
      {
        set: "Set 3",
        setNum: 3,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "MTH-11", name: "Mathematics (Part 1)", creditHours: 4 },
          { code: "CSC-11", name: "Computer Science (Part 1)", creditHours: 4 },
          { code: "PHY-11", name: "Physics (Part 1)", creditHours: 4 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "MTH-12", name: "Mathematics (Part 2)", creditHours: 4 },
          { code: "CSC-12", name: "Computer Science (Part 2)", creditHours: 4 },
          { code: "PHY-12", name: "Physics (Part 2)", creditHours: 4 },
        ],
      },
      // Set 4: Math, Computer Science, Economics
      {
        set: "Set 4",
        setNum: 4,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "MTH-11", name: "Mathematics (Part 1)", creditHours: 4 },
          { code: "CSC-11", name: "Computer Science (Part 1)", creditHours: 4 },
          { code: "ECO-11", name: "Economics (Part 1)", creditHours: 3 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "MTH-12", name: "Mathematics (Part 2)", creditHours: 4 },
          { code: "CSC-12", name: "Computer Science (Part 2)", creditHours: 4 },
          { code: "ECO-12", name: "Economics (Part 2)", creditHours: 3 },
        ],
      },
    ],
  },

  // 4. FA / Arts
  {
    discipline: "FA",
    prefix: "FA",
    sets: [
      // Set 1: Islamic Studies (Elective), Sociology, Economics
      {
        set: "Set 1",
        setNum: 1,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "ISE-11", name: "Islamic Studies Elective (Part 1)", creditHours: 3 },
          { code: "SOC-11", name: "Sociology (Part 1)", creditHours: 3 },
          { code: "ECO-11", name: "Economics (Part 1)", creditHours: 3 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "ISE-12", name: "Islamic Studies Elective (Part 2)", creditHours: 3 },
          { code: "SOC-12", name: "Sociology (Part 2)", creditHours: 3 },
          { code: "ECO-12", name: "Economics (Part 2)", creditHours: 3 },
        ],
      },
      // Set 2: Geography, Sociology, History of Islam
      {
        set: "Set 2",
        setNum: 2,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "GEO-11", name: "Geography (Part 1)", creditHours: 3 },
          { code: "SOC-11", name: "Sociology (Part 1)", creditHours: 3 },
          { code: "HIS-11", name: "History of Islam (Part 1)", creditHours: 3 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "GEO-12", name: "Geography (Part 2)", creditHours: 3 },
          { code: "SOC-12", name: "Sociology (Part 2)", creditHours: 3 },
          { code: "HIS-12", name: "History of Islam (Part 2)", creditHours: 3 },
        ],
      },
      // Set 3: Islamic Studies (Elective), Persian, Economics
      {
        set: "Set 3",
        setNum: 3,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "ISE-11", name: "Islamic Studies Elective (Part 1)", creditHours: 3 },
          { code: "PER-11", name: "Persian (Part 1)", creditHours: 3 },
          { code: "ECO-11", name: "Economics (Part 1)", creditHours: 3 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "ISE-12", name: "Islamic Studies Elective (Part 2)", creditHours: 3 },
          { code: "PER-12", name: "Persian (Part 2)", creditHours: 3 },
          { code: "ECO-12", name: "Economics (Part 2)", creditHours: 3 },
        ],
      },
      // Set 4: Islamic Studies (Elective), Economics, Computer Science
      {
        set: "Set 4",
        setNum: 4,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "ISE-11", name: "Islamic Studies Elective (Part 1)", creditHours: 3 },
          { code: "ECO-11", name: "Economics (Part 1)", creditHours: 3 },
          { code: "CSC-11", name: "Computer Science (Part 1)", creditHours: 4 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "ISE-12", name: "Islamic Studies Elective (Part 2)", creditHours: 3 },
          { code: "ECO-12", name: "Economics (Part 2)", creditHours: 3 },
          { code: "CSC-12", name: "Computer Science (Part 2)", creditHours: 4 },
        ],
      },
    ],
  },

  // 5. FA IT
  {
    discipline: "FA IT",
    prefix: "FAIT",
    sets: [
      // Set 1: Computer Science, Economics, Islamic Studies Elective
      {
        set: "Set 1",
        setNum: 1,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "CSC-11", name: "Computer Science (Part 1)", creditHours: 4 },
          { code: "ECO-11", name: "Economics (Part 1)", creditHours: 3 },
          { code: "ISE-11", name: "Islamic Studies Elective (Part 1)", creditHours: 3 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "CSC-12", name: "Computer Science (Part 2)", creditHours: 4 },
          { code: "ECO-12", name: "Economics (Part 2)", creditHours: 3 },
          { code: "ISE-12", name: "Islamic Studies Elective (Part 2)", creditHours: 3 },
        ],
      },
      // Set 2: Computer Science, Mathematics, Statistics
      {
        set: "Set 2",
        setNum: 2,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "CSC-11", name: "Computer Science (Part 1)", creditHours: 4 },
          { code: "MTH-11", name: "Mathematics (Part 1)", creditHours: 4 },
          { code: "STA-11", name: "Statistics (Part 1)", creditHours: 3 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "CSC-12", name: "Computer Science (Part 2)", creditHours: 4 },
          { code: "MTH-12", name: "Mathematics (Part 2)", creditHours: 4 },
          { code: "STA-12", name: "Statistics (Part 2)", creditHours: 3 },
        ],
      },
      // Set 3: Computer Science, Economics, Sociology
      {
        set: "Set 3",
        setNum: 3,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "CSC-11", name: "Computer Science (Part 1)", creditHours: 4 },
          { code: "ECO-11", name: "Economics (Part 1)", creditHours: 3 },
          { code: "SOC-11", name: "Sociology (Part 1)", creditHours: 3 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "CSC-12", name: "Computer Science (Part 2)", creditHours: 4 },
          { code: "ECO-12", name: "Economics (Part 2)", creditHours: 3 },
          { code: "SOC-12", name: "Sociology (Part 2)", creditHours: 3 },
        ],
      },
    ],
  },

  // 6. I.Com / Commerce
  {
    discipline: "I.Com",
    prefix: "ICOM",
    sets: [
      {
        set: "Set 1",
        setNum: 1,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "ACC-11", name: "Principles of Accounting (Part 1)", creditHours: 4 },
          { code: "ECO-11", name: "Principles of Economics", creditHours: 3 },
          { code: "COM-11", name: "Principles of Commerce", creditHours: 3 },
          { code: "BMTH-11", name: "Business Mathematics", creditHours: 3 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "ACC-12", name: "Principles of Accounting (Part 2)", creditHours: 4 },
          { code: "GEO-12", name: "Commercial Geography", creditHours: 3 },
          { code: "BNK-12", name: "Banking", creditHours: 3 },
          { code: "BSTA-12", name: "Business Statistics", creditHours: 3 },
        ],
      },
    ],
  },

  // 7. Home Economics
  {
    discipline: "Home Economics",
    prefix: "HECO",
    sets: [
      {
        set: "Set 1",
        setNum: 1,
        part1Subjects: [
          { code: "ENG-11", name: "English (Part 1)", creditHours: 3 },
          { code: "URD-11", name: "Urdu (Part 1)", creditHours: 3 },
          { code: "ISL-11", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-11", name: "Pakistan Studies", creditHours: 2 },
          { code: "HMGT-11", name: "Home Management (Part 1)", creditHours: 3 },
          { code: "CLOT-11", name: "Clothing & Textile (Part 1)", creditHours: 3 },
          { code: "FOOD-11", name: "Food & Nutrition (Part 1)", creditHours: 3 },
          { code: "ART-11", name: "Art / Design (Part 1)", creditHours: 3 },
        ],
        part2Subjects: [
          { code: "ENG-12", name: "English (Part 2)", creditHours: 3 },
          { code: "URD-12", name: "Urdu (Part 2)", creditHours: 3 },
          { code: "ISL-12", name: "Islamiat (Compulsory)", creditHours: 2 },
          { code: "PAK-12", name: "Pakistan Studies", creditHours: 2 },
          { code: "HMGT-12", name: "Home Management (Part 2)", creditHours: 3 },
          { code: "CLOT-12", name: "Clothing & Textile (Part 2)", creditHours: 3 },
          { code: "FOOD-12", name: "Food & Nutrition (Part 2)", creditHours: 3 },
          { code: "ART-12", name: "Art / Design (Part 2)", creditHours: 3 },
        ],
      },
    ],
  },
];

export async function seedHsscCourses(externalPrisma?: PrismaClient) {
  const db = externalPrisma || prisma;
  console.log("🚀 Seeding HSSC / Intermediate Courses and Subject Sets...");

  let totalSeeded = 0;

  for (const discDef of HSSC_DISCIPLINES) {
    for (const setDef of discDef.sets) {

      // Part 1 Courses
      for (const subj of setDef.part1Subjects) {
        const courseId = `hssc_${discDef.prefix}_s${setDef.setNum}_p1_${subj.code}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const fullCode = `${discDef.prefix}-S${setDef.setNum}-${subj.code}`;
        const cleanName = subj.name.replace(/\s*\((Part|Compulsory)\s*[12]?\)/gi, "").trim();
        const totalMarks = (subj.code.startsWith("ISL") || subj.code.startsWith("PAK")) ? 50 : 100;

        await db.course.upsert({
          where: {
            courseCode_department: {
              courseCode: fullCode,
              department: discDef.discipline,
            },
          },
          update: {
            courseCode: fullCode,
            courseName: cleanName,
            creditHours: subj.creditHours,
            totalMarks: totalMarks,
            programLevel: "INTERMEDIATE",
            discipline: discDef.discipline,
            part: 1,
            subjectSet: setDef.set,
            department: discDef.discipline,
            semester: 1,
          },
          create: {
            id: courseId,
            courseCode: fullCode,
            courseName: cleanName,
            creditHours: subj.creditHours,
            totalMarks: totalMarks,
            programLevel: "INTERMEDIATE",
            discipline: discDef.discipline,
            part: 1,
            subjectSet: setDef.set,
            department: discDef.discipline,
            semester: 1,
          },
        });
        totalSeeded++;
      }

      // Part 2 Courses
      for (const subj of setDef.part2Subjects) {
        const courseId = `hssc_${discDef.prefix}_s${setDef.setNum}_p2_${subj.code}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const fullCode = `${discDef.prefix}-S${setDef.setNum}-${subj.code}`;
        const cleanName = subj.name.replace(/\s*\((Part|Compulsory)\s*[12]?\)/gi, "").trim();
        const totalMarks = (subj.code.startsWith("ISL") || subj.code.startsWith("PAK")) ? 50 : 100;

        await db.course.upsert({
          where: {
            courseCode_department: {
              courseCode: fullCode,
              department: discDef.discipline,
            },
          },
          update: {
            courseCode: fullCode,
            courseName: cleanName,
            creditHours: subj.creditHours,
            totalMarks: totalMarks,
            programLevel: "INTERMEDIATE",
            discipline: discDef.discipline,
            part: 2,
            subjectSet: setDef.set,
            department: discDef.discipline,
            semester: 2,
          },
          create: {
            id: courseId,
            courseCode: fullCode,
            courseName: cleanName,
            creditHours: subj.creditHours,
            totalMarks: totalMarks,
            programLevel: "INTERMEDIATE",
            discipline: discDef.discipline,
            part: 2,
            subjectSet: setDef.set,
            department: discDef.discipline,
            semester: 2,
          },
        });
        totalSeeded++;
      }

    }
  }

  console.log(`✨ Successfully seeded ${totalSeeded} HSSC / Intermediate courses!`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed-hssc.ts")) {
  seedHsscCourses()
    .catch((err) => {
      console.error("❌ Failed to seed HSSC courses:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
