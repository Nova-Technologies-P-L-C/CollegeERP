import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface BsCourseDef {
  code: string;
  name: string;
  creditHours: number;
  semester: number;
}

interface BsDepartmentCurriculum {
  department: string;
  prefix: string;
  courses: BsCourseDef[];
}

export const BS_CURRICULA: BsDepartmentCurriculum[] = [
  // 1. BS Computer Science (PU Curriculum)
  {
    department: "Computer Science",
    prefix: "CS",
    courses: [
      // Semester 1
      { code: "CS-101", name: "Programming Fundamentals", creditHours: 4, semester: 1 },
      { code: "CS-102", name: "Applications of Information & Communication Technologies", creditHours: 3, semester: 1 },
      { code: "MTH-101", name: "Calculus & Analytical Geometry", creditHours: 3, semester: 1 },
      { code: "ENG-101", name: "Functional English", creditHours: 3, semester: 1 },
      { code: "PHY-101", name: "Applied Physics", creditHours: 3, semester: 1 },

      // Semester 2
      { code: "CS-103", name: "Object Oriented Programming", creditHours: 4, semester: 2 },
      { code: "CS-104", name: "Discrete Structures", creditHours: 3, semester: 2 },
      { code: "MTH-102", name: "Linear Algebra", creditHours: 3, semester: 2 },
      { code: "ENG-102", name: "Communication & Presentation Skills", creditHours: 3, semester: 2 },
      { code: "ISL-101", name: "Islamic Studies / Ethics", creditHours: 2, semester: 2 },

      // Semester 3
      { code: "CS-201", name: "Data Structures & Algorithms", creditHours: 4, semester: 3 },
      { code: "CS-202", name: "Digital Logic Design", creditHours: 3, semester: 3 },
      { code: "CS-203", name: "Computer Organization & Assembly Language", creditHours: 3, semester: 3 },
      { code: "MTH-201", name: "Multivariate Calculus", creditHours: 3, semester: 3 },
      { code: "PAK-101", name: "Pakistan Studies", creditHours: 2, semester: 3 },

      // Semester 4
      { code: "CS-204", name: "Database Systems", creditHours: 4, semester: 4 },
      { code: "CS-205", name: "Operating Systems", creditHours: 4, semester: 4 },
      { code: "CS-206", name: "Theory of Automata", creditHours: 3, semester: 4 },
      { code: "MTH-202", name: "Differential Equations", creditHours: 3, semester: 4 },
      { code: "STA-201", name: "Probability & Statistics", creditHours: 3, semester: 4 },

      // Semester 5
      { code: "CS-301", name: "Computer Networks", creditHours: 4, semester: 5 },
      { code: "CS-302", name: "Software Engineering", creditHours: 3, semester: 5 },
      { code: "CS-303", name: "Design & Analysis of Algorithms", creditHours: 3, semester: 5 },
      { code: "CS-304", name: "Artificial Intelligence", creditHours: 3, semester: 5 },
      { code: "ENG-301", name: "Technical & Business Writing", creditHours: 3, semester: 5 },

      // Semester 6
      { code: "CS-305", name: "Compiler Construction", creditHours: 3, semester: 6 },
      { code: "CS-306", name: "Web Engineering", creditHours: 3, semester: 6 },
      { code: "CS-307", name: "Information Security", creditHours: 3, semester: 6 },
      { code: "CS-308", name: "Computer Architecture", creditHours: 3, semester: 6 },
      { code: "MGT-301", name: "Entrepreneurship & Innovation", creditHours: 3, semester: 6 },

      // Semester 7
      { code: "CS-401", name: "Final Year Project - I", creditHours: 3, semester: 7 },
      { code: "CS-402", name: "Machine Learning", creditHours: 3, semester: 7 },
      { code: "CS-403", name: "Cloud Computing", creditHours: 3, semester: 7 },
      { code: "CS-404", name: "Mobile Application Development", creditHours: 3, semester: 7 },
      { code: "CS-405", name: "Professional Ethics & Social Issues", creditHours: 2, semester: 7 },

      // Semester 8
      { code: "CS-406", name: "Final Year Project - II", creditHours: 3, semester: 8 },
      { code: "CS-407", name: "Deep Learning & Neural Networks", creditHours: 3, semester: 8 },
      { code: "CS-408", name: "Data Science & Big Analytics", creditHours: 3, semester: 8 },
      { code: "CS-409", name: "Parallel & Distributed Computing", creditHours: 3, semester: 8 },
    ],
  },

  // 2. BS Mathematics (PU Curriculum)
  {
    department: "Mathematics",
    prefix: "MTH",
    courses: [
      // Semester 1
      { code: "MATH-101", name: "Calculus I", creditHours: 3, semester: 1 },
      { code: "MATH-102", name: "Elements of Set Theory & Mathematical Logic", creditHours: 3, semester: 1 },
      { code: "ENG-101M", name: "Functional English", creditHours: 3, semester: 1 },
      { code: "PHY-101M", name: "Physics I (Mechanics)", creditHours: 3, semester: 1 },
      { code: "CS-101M", name: "Introduction to Computer Programming", creditHours: 3, semester: 1 },

      // Semester 2
      { code: "MATH-103", name: "Calculus II", creditHours: 3, semester: 2 },
      { code: "MATH-104", name: "Plane Geometry & Vector Analysis", creditHours: 3, semester: 2 },
      { code: "ENG-102M", name: "Communication Skills", creditHours: 3, semester: 2 },
      { code: "PHY-102M", name: "Physics II (Waves & Optics)", creditHours: 3, semester: 2 },
      { code: "ISL-101M", name: "Islamic Studies / Ethics", creditHours: 2, semester: 2 },

      // Semester 3
      { code: "MATH-201", name: "Calculus III (Multivariate)", creditHours: 3, semester: 3 },
      { code: "MATH-202", name: "Linear Algebra", creditHours: 3, semester: 3 },
      { code: "MATH-203", name: "Discrete Mathematics", creditHours: 3, semester: 3 },
      { code: "PAK-101M", name: "Pakistan Studies", creditHours: 2, semester: 3 },
      { code: "PHY-201M", name: "Physics III (Electricity & Magnetism)", creditHours: 3, semester: 3 },

      // Semester 4
      { code: "MATH-204", name: "Ordinary Differential Equations", creditHours: 3, semester: 4 },
      { code: "MATH-205", name: "Group Theory I", creditHours: 3, semester: 4 },
      { code: "MATH-206", name: "Metric Spaces", creditHours: 3, semester: 4 },
      { code: "STAT-201M", name: "Introduction to Statistics & Probability", creditHours: 3, semester: 4 },
      { code: "ENG-201M", name: "Technical Writing", creditHours: 3, semester: 4 },

      // Semester 5
      { code: "MATH-301", name: "Real Analysis I", creditHours: 3, semester: 5 },
      { code: "MATH-302", name: "Complex Analysis", creditHours: 3, semester: 5 },
      { code: "MATH-303", name: "Group Theory II & Ring Theory", creditHours: 3, semester: 5 },
      { code: "MATH-304", name: "Partial Differential Equations", creditHours: 3, semester: 5 },
      { code: "MATH-305", name: "Classical Mechanics", creditHours: 3, semester: 5 },

      // Semester 6
      { code: "MATH-306", name: "Real Analysis II", creditHours: 3, semester: 6 },
      { code: "MATH-307", name: "Topology", creditHours: 3, semester: 6 },
      { code: "MATH-308", name: "Numerical Analysis I", creditHours: 3, semester: 6 },
      { code: "MATH-309", name: "Differential Geometry", creditHours: 3, semester: 6 },
      { code: "MATH-310", name: "Mathematical Statistics", creditHours: 3, semester: 6 },

      // Semester 7
      { code: "MATH-401", name: "Functional Analysis", creditHours: 3, semester: 7 },
      { code: "MATH-402", name: "Numerical Analysis II", creditHours: 3, semester: 7 },
      { code: "MATH-403", name: "Fluid Mechanics", creditHours: 3, semester: 7 },
      { code: "MATH-404", name: "Integral Equations", creditHours: 3, semester: 7 },
      { code: "MATH-405", name: "Research Project / Thesis - I", creditHours: 3, semester: 7 },

      // Semester 8
      { code: "MATH-406", name: "Measure Theory & Integration", creditHours: 3, semester: 8 },
      { code: "MATH-407", name: "Optimization Theory", creditHours: 3, semester: 8 },
      { code: "MATH-408", name: "Tensor Analysis & Relativity", creditHours: 3, semester: 8 },
      { code: "MATH-409", name: "Research Project / Thesis - II", creditHours: 3, semester: 8 },
    ],
  },

  // 3. BS Physics (PU Curriculum)
  {
    department: "Physics",
    prefix: "PHY",
    courses: [
      // Semester 1
      { code: "PHYS-101", name: "Mechanics & Relativity", creditHours: 4, semester: 1 },
      { code: "MATH-101P", name: "Calculus I", creditHours: 3, semester: 1 },
      { code: "CHEM-101P", name: "General Chemistry", creditHours: 3, semester: 1 },
      { code: "ENG-101P", name: "English I (Functional English)", creditHours: 3, semester: 1 },
      { code: "ISL-101P", name: "Islamic Studies / Ethics", creditHours: 2, semester: 1 },

      // Semester 2
      { code: "PHYS-102", name: "Electricity & Magnetism", creditHours: 4, semester: 2 },
      { code: "MATH-102P", name: "Calculus II", creditHours: 3, semester: 2 },
      { code: "CS-101P", name: "Introduction to Computing for Physicists", creditHours: 3, semester: 2 },
      { code: "ENG-102P", name: "English II (Communication Skills)", creditHours: 3, semester: 2 },
      { code: "PAK-101P", name: "Pakistan Studies", creditHours: 2, semester: 2 },

      // Semester 3
      { code: "PHYS-201", name: "Waves & Oscillations", creditHours: 3, semester: 3 },
      { code: "PHYS-202", name: "Thermal & Statistical Physics", creditHours: 3, semester: 3 },
      { code: "MATH-201P", name: "Linear Algebra & Differential Equations", creditHours: 3, semester: 3 },
      { code: "ENG-201P", name: "Technical Writing & Presentation", creditHours: 3, semester: 3 },

      // Semester 4
      { code: "PHYS-203", name: "Modern Physics & Optics", creditHours: 4, semester: 4 },
      { code: "PHYS-204", name: "Basic Electronics", creditHours: 4, semester: 4 },
      { code: "MATH-202P", name: "Complex Variables & Vector Analysis", creditHours: 3, semester: 4 },
      { code: "CS-201P", name: "Computational Physics", creditHours: 3, semester: 4 },

      // Semester 5
      { code: "PHYS-301", name: "Mathematical Methods of Physics - I", creditHours: 3, semester: 5 },
      { code: "PHYS-302", name: "Quantum Mechanics - I", creditHours: 3, semester: 5 },
      { code: "PHYS-303", name: "Classical Mechanics", creditHours: 3, semester: 5 },
      { code: "PHYS-304", name: "Electrodynamics - I", creditHours: 3, semester: 5 },
      { code: "PHYS-305", name: "Advanced Physics Lab - I", creditHours: 3, semester: 5 },

      // Semester 6
      { code: "PHYS-306", name: "Mathematical Methods of Physics - II", creditHours: 3, semester: 6 },
      { code: "PHYS-307", name: "Quantum Mechanics - II", creditHours: 3, semester: 6 },
      { code: "PHYS-308", name: "Electrodynamics - II", creditHours: 3, semester: 6 },
      { code: "PHYS-309", name: "Solid State Physics - I", creditHours: 3, semester: 6 },
      { code: "PHYS-310", name: "Advanced Physics Lab - II", creditHours: 3, semester: 6 },

      // Semester 7
      { code: "PHYS-401", name: "Atomic & Molecular Physics", creditHours: 3, semester: 7 },
      { code: "PHYS-402", name: "Nuclear & Particle Physics", creditHours: 3, semester: 7 },
      { code: "PHYS-403", name: "Solid State Physics - II", creditHours: 3, semester: 7 },
      { code: "PHYS-404", name: "Digital Electronics", creditHours: 3, semester: 7 },
      { code: "PHYS-405", name: "Physics Thesis / Project - I", creditHours: 3, semester: 7 },

      // Semester 8
      { code: "PHYS-406", name: "Plasma Physics & Laser Optics", creditHours: 3, semester: 8 },
      { code: "PHYS-407", name: "Nanotechnology & Materials Science", creditHours: 3, semester: 8 },
      { code: "PHYS-408", name: "Astrophysics & Cosmology", creditHours: 3, semester: 8 },
      { code: "PHYS-409", name: "Physics Thesis / Project - II", creditHours: 3, semester: 8 },
    ],
  },

  // 4. BS English (PU Curriculum)
  {
    department: "English",
    prefix: "ENG",
    courses: [
      // Semester 1
      { code: "ENGL-101", name: "Reading & Writing Skills", creditHours: 3, semester: 1 },
      { code: "ENGL-102", name: "Introduction to Literary Studies", creditHours: 3, semester: 1 },
      { code: "ENGL-103", name: "Introduction to Linguistics", creditHours: 3, semester: 1 },
      { code: "ISL-101E", name: "Islamic Studies / Ethics", creditHours: 2, semester: 1 },
      { code: "SOC-101E", name: "Introduction to Sociology", creditHours: 3, semester: 1 },

      // Semester 2
      { code: "ENGL-104", name: "Academic Writing & Composition", creditHours: 3, semester: 2 },
      { code: "ENGL-105", name: "History of English Literature (14th - 18th Century)", creditHours: 3, semester: 2 },
      { code: "ENGL-106", name: "Phonetics & Phonology", creditHours: 3, semester: 2 },
      { code: "PAK-101E", name: "Pakistan Studies", creditHours: 2, semester: 2 },
      { code: "PSY-101E", name: "Introduction to Psychology", creditHours: 3, semester: 2 },

      // Semester 3
      { code: "ENGL-201", name: "Classical & Elizabethan Drama", creditHours: 3, semester: 3 },
      { code: "ENGL-202", name: "Romantic & Victorian Poetry", creditHours: 3, semester: 3 },
      { code: "ENGL-203", name: "Morphology & Syntax", creditHours: 3, semester: 3 },
      { code: "CS-101E", name: "Computer Literacy for Humanities", creditHours: 3, semester: 3 },

      // Semester 4
      { code: "ENGL-204", name: "18th & 19th Century Novel", creditHours: 3, semester: 4 },
      { code: "ENGL-205", name: "Semantics & Pragmatics", creditHours: 3, semester: 4 },
      { code: "ENGL-206", name: "Prose & Essayists", creditHours: 3, semester: 4 },
      { code: "PHIL-101E", name: "Introduction to Philosophy", creditHours: 3, semester: 4 },

      // Semester 5
      { code: "ENGL-301", name: "Modern & Contemporary Drama", creditHours: 3, semester: 5 },
      { code: "ENGL-302", name: "Modern Poetry", creditHours: 3, semester: 5 },
      { code: "ENGL-303", name: "Sociolinguistics & Psycholinguistics", creditHours: 3, semester: 5 },
      { code: "ENGL-304", name: "Literary Criticism & Theory - I", creditHours: 3, semester: 5 },
      { code: "ENGL-305", name: "American Literature", creditHours: 3, semester: 5 },

      // Semester 6
      { code: "ENGL-306", name: "20th Century Fiction", creditHours: 3, semester: 6 },
      { code: "ENGL-307", name: "Postcolonial Literature", creditHours: 3, semester: 6 },
      { code: "ENGL-308", name: "Literary Criticism & Theory - II", creditHours: 3, semester: 6 },
      { code: "ENGL-309", name: "Discourse Analysis", creditHours: 3, semester: 6 },
      { code: "ENGL-310", name: "Research Methodology in Literature & Language", creditHours: 3, semester: 6 },

      // Semester 7
      { code: "ENGL-401", name: "Pakistani Literature in English", creditHours: 3, semester: 7 },
      { code: "ENGL-402", name: "World Literature in Translation", creditHours: 3, semester: 7 },
      { code: "ENGL-403", name: "Stylistics & Applied Linguistics", creditHours: 3, semester: 7 },
      { code: "ENGL-404", name: "English Language Teaching (ELT)", creditHours: 3, semester: 7 },
      { code: "ENGL-405", name: "Research Project / Thesis - I", creditHours: 3, semester: 7 },

      // Semester 8
      { code: "ENGL-406", name: "Postmodern Fiction & Drama", creditHours: 3, semester: 8 },
      { code: "ENGL-407", name: "Media & Cultural Studies", creditHours: 3, semester: 8 },
      { code: "ENGL-408", name: "Translation Studies", creditHours: 3, semester: 8 },
      { code: "ENGL-409", name: "Research Project / Thesis - II", creditHours: 3, semester: 8 },
    ],
  },

  // 5. BS Chemistry (PU Curriculum)
  {
    department: "Chemistry",
    prefix: "CHM",
    courses: [
      // Semester 1
      { code: "CHEM-101", name: "Physical Chemistry I", creditHours: 3, semester: 1 },
      { code: "CHEM-102", name: "Inorganic Chemistry I", creditHours: 3, semester: 1 },
      { code: "MATH-101C", name: "Mathematics for Chemists", creditHours: 3, semester: 1 },
      { code: "ENG-101C", name: "English I (Functional English)", creditHours: 3, semester: 1 },
      { code: "ISL-101C", name: "Islamic Studies / Ethics", creditHours: 2, semester: 1 },

      // Semester 2
      { code: "CHEM-103", name: "Organic Chemistry I", creditHours: 3, semester: 2 },
      { code: "CHEM-104", name: "Analytical Chemistry I", creditHours: 3, semester: 2 },
      { code: "PHYS-101C", name: "Physics for Chemists", creditHours: 3, semester: 2 },
      { code: "ENG-102C", name: "English II (Communication Skills)", creditHours: 3, semester: 2 },
      { code: "PAK-101C", name: "Pakistan Studies", creditHours: 2, semester: 2 },

      // Semester 3
      { code: "CHEM-201", name: "Physical Chemistry II", creditHours: 3, semester: 3 },
      { code: "CHEM-202", name: "Inorganic Chemistry II", creditHours: 3, semester: 3 },
      { code: "CHEM-203", name: "Biochemistry I", creditHours: 3, semester: 3 },
      { code: "CS-101C", name: "Computer Applications in Chemistry", creditHours: 3, semester: 3 },

      // Semester 4
      { code: "CHEM-204", name: "Organic Chemistry II", creditHours: 3, semester: 4 },
      { code: "CHEM-205", name: "Analytical Chemistry II", creditHours: 3, semester: 4 },
      { code: "CHEM-206", name: "Environmental Chemistry", creditHours: 3, semester: 4 },
      { code: "ENG-201C", name: "Technical Report Writing", creditHours: 3, semester: 4 },

      // Semester 5
      { code: "CHEM-301", name: "Advanced Physical Chemistry", creditHours: 3, semester: 5 },
      { code: "CHEM-302", name: "Advanced Inorganic Chemistry", creditHours: 3, semester: 5 },
      { code: "CHEM-303", name: "Advanced Organic Chemistry", creditHours: 3, semester: 5 },
      { code: "CHEM-304", name: "Spectroscopic Methods of Analysis", creditHours: 3, semester: 5 },
      { code: "CHEM-305", name: "Chemistry Practical Lab - I", creditHours: 3, semester: 5 },

      // Semester 6
      { code: "CHEM-306", name: "Quantum Chemistry & Thermodynamics", creditHours: 3, semester: 6 },
      { code: "CHEM-307", name: "Coordination & Organometallic Chemistry", creditHours: 3, semester: 6 },
      { code: "CHEM-308", name: "Stereochemistry & Reaction Mechanisms", creditHours: 3, semester: 6 },
      { code: "CHEM-309", name: "Industrial & Applied Chemistry", creditHours: 3, semester: 6 },
      { code: "CHEM-310", name: "Chemistry Practical Lab - II", creditHours: 3, semester: 6 },

      // Semester 7
      { code: "CHEM-401", name: "Natural Products & Heterocyclic Chemistry", creditHours: 3, semester: 7 },
      { code: "CHEM-402", name: "Electrochemistry & Chemical Kinetics", creditHours: 3, semester: 7 },
      { code: "CHEM-403", name: "Polymer Chemistry & Biomolecules", creditHours: 3, semester: 7 },
      { code: "CHEM-404", name: "Nuclear & Radiochemistry", creditHours: 3, semester: 7 },
      { code: "CHEM-405", name: "Chemistry Research Thesis - I", creditHours: 3, semester: 7 },

      // Semester 8
      { code: "CHEM-406", name: "Medicinal & Pharmaceutical Chemistry", creditHours: 3, semester: 8 },
      { code: "CHEM-407", name: "Chromatography & Separation Techniques", creditHours: 3, semester: 8 },
      { code: "CHEM-408", name: "Surface Chemistry & Catalysis", creditHours: 3, semester: 8 },
      { code: "CHEM-409", name: "Chemistry Research Thesis - II", creditHours: 3, semester: 8 },
    ],
  },

  // 6. BS Economics (PU Curriculum)
  {
    department: "Economics",
    prefix: "ECO",
    courses: [
      // Semester 1
      { code: "ECON-101", name: "Principles of Microeconomics", creditHours: 3, semester: 1 },
      { code: "MATH-101EC", name: "Mathematics for Economists - I", creditHours: 3, semester: 1 },
      { code: "ENG-101EC", name: "Functional English", creditHours: 3, semester: 1 },
      { code: "ISL-101EC", name: "Islamic Studies / Ethics", creditHours: 2, semester: 1 },
      { code: "SOC-101EC", name: "Introduction to Sociology", creditHours: 3, semester: 1 },

      // Semester 2
      { code: "ECON-102", name: "Principles of Macroeconomics", creditHours: 3, semester: 2 },
      { code: "MATH-102EC", name: "Mathematics for Economists - II", creditHours: 3, semester: 2 },
      { code: "ENG-102EC", name: "Communication Skills", creditHours: 3, semester: 2 },
      { code: "PAK-101EC", name: "Pakistan Studies", creditHours: 2, semester: 2 },
      { code: "CS-101EC", name: "Computer Applications in Economics", creditHours: 3, semester: 2 },

      // Semester 3
      { code: "ECON-201", name: "Intermediate Microeconomics", creditHours: 3, semester: 3 },
      { code: "STAT-201EC", name: "Statistics for Economists - I", creditHours: 3, semester: 3 },
      { code: "ECON-202", name: "Development Economics", creditHours: 3, semester: 3 },
      { code: "POL-101EC", name: "Introduction to Political Science", creditHours: 3, semester: 3 },

      // Semester 4
      { code: "ECON-203", name: "Intermediate Macroeconomics", creditHours: 3, semester: 4 },
      { code: "STAT-202EC", name: "Statistics for Economists - II", creditHours: 3, semester: 4 },
      { code: "ECON-204", name: "Issues in Pakistan Economy", creditHours: 3, semester: 4 },
      { code: "ENG-201EC", name: "Business & Technical Communication", creditHours: 3, semester: 4 },

      // Semester 5
      { code: "ECON-301", name: "Advanced Microeconomics", creditHours: 3, semester: 5 },
      { code: "ECON-302", name: "Econometrics - I", creditHours: 3, semester: 5 },
      { code: "ECON-303", name: "Public Finance & Fiscal Policy", creditHours: 3, semester: 5 },
      { code: "ECON-304", name: "International Trade Theory", creditHours: 3, semester: 5 },
      { code: "ECON-305", name: "Monetary Economics", creditHours: 3, semester: 5 },

      // Semester 6
      { code: "ECON-306", name: "Advanced Macroeconomics", creditHours: 3, semester: 6 },
      { code: "ECON-307", name: "Econometrics - II", creditHours: 3, semester: 6 },
      { code: "ECON-308", name: "Islamic Economics & Banking", creditHours: 3, semester: 6 },
      { code: "ECON-309", name: "Research Methodology in Economics", creditHours: 3, semester: 6 },
      { code: "ECON-310", name: "Agricultural & Environmental Economics", creditHours: 3, semester: 6 },

      // Semester 7
      { code: "ECON-401", name: "International Finance", creditHours: 3, semester: 7 },
      { code: "ECON-402", name: "Mathematical Economics", creditHours: 3, semester: 7 },
      { code: "ECON-403", name: "Labor Economics", creditHours: 3, semester: 7 },
      { code: "ECON-404", name: "Game Theory & Economic Applications", creditHours: 3, semester: 7 },
      { code: "ECON-405", name: "Economics Research Thesis - I", creditHours: 3, semester: 7 },

      // Semester 8
      { code: "ECON-406", name: "Institutional & Behavioral Economics", creditHours: 3, semester: 8 },
      { code: "ECON-407", name: "Applied Econometrics & Data Analysis", creditHours: 3, semester: 8 },
      { code: "ECON-408", name: "Economic Growth & Planning", creditHours: 3, semester: 8 },
      { code: "ECON-409", name: "Economics Research Thesis - II", creditHours: 3, semester: 8 },
    ],
  },

  // 7. BS Political Science (PU Curriculum)
  {
    department: "Political Science",
    prefix: "POL",
    courses: [
      // Semester 1
      { code: "POLS-101", name: "Introduction to Political Science", creditHours: 3, semester: 1 },
      { code: "ENG-101PS", name: "Functional English", creditHours: 3, semester: 1 },
      { code: "ISL-101PS", name: "Islamic Studies / Ethics", creditHours: 2, semester: 1 },
      { code: "SOC-101PS", name: "Introduction to Sociology", creditHours: 3, semester: 1 },
      { code: "HIS-101PS", name: "History of the Subcontinent (1857-1947)", creditHours: 3, semester: 1 },

      // Semester 2
      { code: "POLS-102", name: "Political Systems of Developed Nations (UK & USA)", creditHours: 3, semester: 2 },
      { code: "ENG-102PS", name: "Communication Skills", creditHours: 3, semester: 2 },
      { code: "PAK-101PS", name: "Pakistan Studies", creditHours: 2, semester: 2 },
      { code: "ECO-101PS", name: "Fundamentals of Economics", creditHours: 3, semester: 2 },
      { code: "CS-101PS", name: "Computer Applications in Social Sciences", creditHours: 3, semester: 2 },

      // Semester 3
      { code: "POLS-201", name: "Western Political Philosophy - I (Plato to Machiavelli)", creditHours: 3, semester: 3 },
      { code: "POLS-202", name: "Muslim Political Philosophy (Al-Farabi to Iqbal)", creditHours: 3, semester: 3 },
      { code: "POLS-203", name: "Constitutional Development of Pakistan (1947-1973)", creditHours: 3, semester: 3 },
      { code: "ENG-201PS", name: "Technical Writing", creditHours: 3, semester: 3 },

      // Semester 4
      { code: "POLS-204", name: "Western Political Philosophy - II (Hobbes to Marx)", creditHours: 3, semester: 4 },
      { code: "POLS-205", name: "Comparative & Developmental Politics", creditHours: 3, semester: 4 },
      { code: "POLS-206", name: "Introduction to International Relations", creditHours: 3, semester: 4 },
      { code: "PSY-101PS", name: "Introduction to Psychology", creditHours: 3, semester: 4 },

      // Semester 5
      { code: "POLS-301", name: "Foreign Policy of Pakistan", creditHours: 3, semester: 5 },
      { code: "POLS-302", name: "International Law & Organizations", creditHours: 3, semester: 5 },
      { code: "POLS-303", name: "Public Administration & Governance", creditHours: 3, semester: 5 },
      { code: "POLS-304", name: "Political Dynamics & Parties in Pakistan", creditHours: 3, semester: 5 },
      { code: "POLS-305", name: "Research Methodology in Political Science", creditHours: 3, semester: 5 },

      // Semester 6
      { code: "POLS-306", name: "Political Ideologies (Liberalism, Socialism, Fascism)", creditHours: 3, semester: 6 },
      { code: "POLS-307", name: "Political Economy of International Relations", creditHours: 3, semester: 6 },
      { code: "POLS-308", name: "Human Rights & Global Politics", creditHours: 3, semester: 6 },
      { code: "POLS-309", name: "Local Government System in Pakistan", creditHours: 3, semester: 6 },
      { code: "POLS-310", name: "Diplomacy & Conflict Resolution", creditHours: 3, semester: 6 },

      // Semester 7
      { code: "POLS-401", name: "Strategic Studies & Defense Policy", creditHours: 3, semester: 7 },
      { code: "POLS-402", name: "Regional Politics of South Asia & Middle East", creditHours: 3, semester: 7 },
      { code: "POLS-403", name: "Contemporary Issues in Global Politics", creditHours: 3, semester: 7 },
      { code: "POLS-404", name: "Public Policy Analysis", creditHours: 3, semester: 7 },
      { code: "POLS-405", name: "Political Science Thesis - I", creditHours: 3, semester: 7 },

      // Semester 8
      { code: "POLS-406", name: "Geopolitics & World Order", creditHours: 3, semester: 8 },
      { code: "POLS-407", name: "Federalism & Decentralization in Pakistan", creditHours: 3, semester: 8 },
      { code: "POLS-408", name: "Political Sociology", creditHours: 3, semester: 8 },
      { code: "POLS-409", name: "Political Science Thesis - II", creditHours: 3, semester: 8 },
    ],
  },

  // 8. BS Zoology (PU Curriculum)
  {
    department: "Zoology",
    prefix: "ZOO",
    courses: [
      // Semester 1
      { code: "ZOOL-101", name: "Animal Diversity I (Invertebrates)", creditHours: 4, semester: 1 },
      { code: "BOT-101Z", name: "Plant Diversity & Systematics", creditHours: 3, semester: 1 },
      { code: "CHEM-101Z", name: "General Chemistry", creditHours: 3, semester: 1 },
      { code: "ENG-101Z", name: "Functional English", creditHours: 3, semester: 1 },
      { code: "ISL-101Z", name: "Islamic Studies / Ethics", creditHours: 2, semester: 1 },

      // Semester 2
      { code: "ZOOL-102", name: "Animal Diversity II (Chordates & Vertebrates)", creditHours: 4, semester: 2 },
      { code: "BOT-102Z", name: "Plant Physiology & Ecology", creditHours: 3, semester: 2 },
      { code: "CHEM-102Z", name: "Organic Chemistry for Biologists", creditHours: 3, semester: 2 },
      { code: "ENG-102Z", name: "Communication Skills", creditHours: 3, semester: 2 },
      { code: "PAK-101Z", name: "Pakistan Studies", creditHours: 2, semester: 2 },

      // Semester 3
      { code: "ZOOL-201", name: "Cell Biology & Histology", creditHours: 4, semester: 3 },
      { code: "ZOOL-202", name: "General Genetics", creditHours: 3, semester: 3 },
      { code: "STAT-201Z", name: "Biostatistics", creditHours: 3, semester: 3 },
      { code: "CS-101Z", name: "Computer Applications in Biological Sciences", creditHours: 3, semester: 3 },

      // Semester 4
      { code: "ZOOL-203", name: "Animal Physiology", creditHours: 4, semester: 4 },
      { code: "ZOOL-204", name: "Biochemistry", creditHours: 4, semester: 4 },
      { code: "ZOOL-205", name: "Environmental Biology & Ecology", creditHours: 3, semester: 4 },
      { code: "ENG-201Z", name: "Scientific & Technical Writing", creditHours: 3, semester: 4 },

      // Semester 5
      { code: "ZOOL-301", name: "Molecular Biology", creditHours: 3, semester: 5 },
      { code: "ZOOL-302", name: "Developmental Biology & Embryology", creditHours: 3, semester: 5 },
      { code: "ZOOL-303", name: "Zoogeography & Paleontology", creditHours: 3, semester: 5 },
      { code: "ZOOL-304", name: "Animal Behavior (Ethology)", creditHours: 3, semester: 5 },
      { code: "ZOOL-305", name: "Zoology Practical Lab - I", creditHours: 3, semester: 5 },

      // Semester 6
      { code: "ZOOL-306", name: "Evolution & Taxonomy", creditHours: 3, semester: 6 },
      { code: "ZOOL-307", name: "Wildlife Conservation & Management", creditHours: 3, semester: 6 },
      { code: "ZOOL-308", name: "Endocrinology & Immunology", creditHours: 3, semester: 6 },
      { code: "ZOOL-309", name: "Fisheries & Aquaculture", creditHours: 3, semester: 6 },
      { code: "ZOOL-310", name: "Zoology Practical Lab - II", creditHours: 3, semester: 6 },

      // Semester 7
      { code: "ZOOL-401", name: "Applied Entomology", creditHours: 3, semester: 7 },
      { code: "ZOOL-402", name: "Parasitology", creditHours: 3, semester: 7 },
      { code: "ZOOL-403", name: "Biotechnology & Recombinant DNA Tech", creditHours: 3, semester: 7 },
      { code: "ZOOL-404", name: "Toxicology & Environmental Pollution", creditHours: 3, semester: 7 },
      { code: "ZOOL-405", name: "Zoology Research Thesis - I", creditHours: 3, semester: 7 },

      // Semester 8
      { code: "ZOOL-406", name: "Genomics & Bioinformatics", creditHours: 3, semester: 8 },
      { code: "ZOOL-407", name: "Economic Zoology & Sericulture", creditHours: 3, semester: 8 },
      { code: "ZOOL-408", name: "Neurobiology", creditHours: 3, semester: 8 },
      { code: "ZOOL-409", name: "Zoology Research Thesis - II", creditHours: 3, semester: 8 },
    ],
  },

  // 9. BS Urdu (PU Curriculum)
  {
    department: "Urdu",
    prefix: "URD",
    courses: [
      // Semester 1
      { code: "URDU-101", name: "Urdu Zaban o Imla wa Qawaid", creditHours: 3, semester: 1 },
      { code: "URDU-102", name: "Mutalia-e-Tehzeeb o Saqafat", creditHours: 3, semester: 1 },
      { code: "ENG-101U", name: "Functional English", creditHours: 3, semester: 1 },
      { code: "ISL-101U", name: "Islamic Studies / Ethics", creditHours: 2, semester: 1 },
      { code: "HIS-101U", name: "History of Islamic Civilization", creditHours: 3, semester: 1 },

      // Semester 2
      { code: "URDU-103", name: "Tareekh-e-Zaban-o-Adab-e-Urdu (Aaghaz se 1857 tak)", creditHours: 3, semester: 2 },
      { code: "URDU-104", name: "Urdu Dastan o Novel", creditHours: 3, semester: 2 },
      { code: "ENG-102U", name: "Communication Skills", creditHours: 3, semester: 2 },
      { code: "PAK-101U", name: "Pakistan Studies", creditHours: 2, semester: 2 },
      { code: "CS-101U", name: "Computer & Urdu Inpage Applications", creditHours: 3, semester: 2 },

      // Semester 3
      { code: "URDU-201", name: "Classical Urdu Ghazal", creditHours: 3, semester: 3 },
      { code: "URDU-202", name: "Urdu Afsana (Short Story)", creditHours: 3, semester: 3 },
      { code: "URDU-203", name: "Farsi Zaban o Adab (Persian Basics)", creditHours: 3, semester: 3 },
      { code: "ENG-201U", name: "Technical Writing", creditHours: 3, semester: 3 },

      // Semester 4
      { code: "URDU-204", name: "Classical Urdu Nazm", creditHours: 3, semester: 4 },
      { code: "URDU-205", name: "Urdu Drama", creditHours: 3, semester: 4 },
      { code: "URDU-206", name: "Urdu Insha-iya o Khaka", creditHours: 3, semester: 4 },
      { code: "SOC-101U", name: "Sociology of Pakistani Society", creditHours: 3, semester: 4 },

      // Semester 5
      { code: "URDU-301", name: "Tareekh-e-Zaban-o-Adab-e-Urdu (1857 se Ta-haal)", creditHours: 3, semester: 5 },
      { code: "URDU-302", name: "Jadeed Urdu Ghazal", creditHours: 3, semester: 5 },
      { code: "URDU-303", name: "Jadeed Urdu Nazm", creditHours: 3, semester: 5 },
      { code: "URDU-304", name: "Urdu Sahafat o Iblagh-e-Aamma", creditHours: 3, semester: 5 },
      { code: "URDU-305", name: "Lisaniyat o Qawaid", creditHours: 3, semester: 5 },

      // Semester 6
      { code: "URDU-306", name: "Urdu Qasida, Marsiya o Masnavi", creditHours: 3, semester: 6 },
      { code: "URDU-307", name: "Khusoosi Mutalia: Allama Iqbal", creditHours: 3, semester: 6 },
      { code: "URDU-308", name: "Adabi Tanqeed (Literary Criticism - Western & Eastern)", creditHours: 3, semester: 6 },
      { code: "URDU-309", name: "Urdu Safeer-i-Adab o Tarjuma Nigari", creditHours: 3, semester: 6 },
      { code: "URDU-310", name: "Tehqeeq o Tadween (Research Methodology)", creditHours: 3, semester: 6 },

      // Semester 7
      { code: "URDU-401", name: "Khusoosi Mutalia: Mirza Ghalib", creditHours: 3, semester: 7 },
      { code: "URDU-402", name: "Urdu Adab mein Fikri o Tehreeki Rujhanat", creditHours: 3, semester: 7 },
      { code: "URDU-403", name: "Pakistani Zabanon ka Adab (Regional Literature)", creditHours: 3, semester: 7 },
      { code: "URDU-404", name: "Urdu Mizah o Tanz Nigari", creditHours: 3, semester: 7 },
      { code: "URDU-405", name: "Urdu Thesis / Research Project - I", creditHours: 3, semester: 7 },

      // Semester 8
      { code: "URDU-406", name: "Aalami Adab ke Tarajim", creditHours: 3, semester: 8 },
      { code: "URDU-407", name: "Urdu Adab aur Electronic Media", creditHours: 3, semester: 8 },
      { code: "URDU-408", name: "Janoobi Asia mein Urdu ki Lisani Haisiyat", creditHours: 3, semester: 8 },
      { code: "URDU-409", name: "Urdu Thesis / Research Project - II", creditHours: 3, semester: 8 },
    ],
  },

  // 10. BS Islamic Studies (PU Curriculum)
  {
    department: "Islamic Studies",
    prefix: "ISL",
    courses: [
      // Semester 1
      { code: "ISLS-101", name: "Mutalia-e-Quran (Translation & Commentary - Part I)", creditHours: 3, semester: 1 },
      { code: "ISLS-102", name: "Seerah of Prophet Muhammad (PBUH) - Analytical Study", creditHours: 3, semester: 1 },
      { code: "ENG-101I", name: "Functional English", creditHours: 3, semester: 1 },
      { code: "ARB-101I", name: "Arabic Language & Grammar - I", creditHours: 3, semester: 1 },
      { code: "PAK-101I", name: "Pakistan Studies", creditHours: 2, semester: 1 },

      // Semester 2
      { code: "ISLS-103", name: "Mutalia-e-Hadith (Text & Principles - Part I)", creditHours: 3, semester: 2 },
      { code: "ISLS-104", name: "History of Islamic Culture & Civilization", creditHours: 3, semester: 2 },
      { code: "ENG-102I", name: "Communication Skills", creditHours: 3, semester: 2 },
      { code: "ARB-102I", name: "Arabic Language & Grammar - II", creditHours: 3, semester: 2 },
      { code: "CS-101I", name: "Computer Applications in Islamic Research", creditHours: 3, semester: 2 },

      // Semester 3
      { code: "ISLS-201", name: "Usul-al-Tafseer (Principles of Exegesis)", creditHours: 3, semester: 3 },
      { code: "ISLS-202", name: "Usul-al-Hadith (Principles of Hadith)", creditHours: 3, semester: 3 },
      { code: "ISLS-203", name: "History of Fiqh & Jurisprudence", creditHours: 3, semester: 3 },
      { code: "ENG-201I", name: "Technical Writing", creditHours: 3, semester: 3 },

      // Semester 4
      { code: "ISLS-204", name: "Usul-al-Fiqh (Principles of Jurisprudence)", creditHours: 3, semester: 4 },
      { code: "ISLS-205", name: "Study of Al-Kalam & Islamic Dogmatics", creditHours: 3, semester: 4 },
      { code: "ISLS-206", name: "Islamic History (Rashidun Caliphate)", creditHours: 3, semester: 4 },
      { code: "SOC-101I", name: "Islamic Sociology & Social System", creditHours: 3, semester: 4 },

      // Semester 5
      { code: "ISLS-301", name: "Textual Study of Al-Quran (Surah Al-Baqarah & Al-Imran)", creditHours: 3, semester: 5 },
      { code: "ISLS-302", name: "Textual Study of Hadith (Sahih Bukhari & Muslim Selected)", creditHours: 3, semester: 5 },
      { code: "ISLS-303", name: "Islamic Economic System & Banking", creditHours: 3, semester: 5 },
      { code: "ISLS-304", name: "Islamic Political System & Governance", creditHours: 3, semester: 5 },
      { code: "ISLS-305", name: "Research Methodology in Islamic Studies", creditHours: 3, semester: 5 },

      // Semester 6
      { code: "ISLS-306", name: "Fiqh-al-Ibadat & Muamalat", creditHours: 3, semester: 6 },
      { code: "ISLS-307", name: "Comparative Study of World Religions (Judaism, Christianity, Hinduism, Buddhism)", creditHours: 3, semester: 6 },
      { code: "ISLS-308", name: "Islam & Modern Science / Philosophy", creditHours: 3, semester: 6 },
      { code: "ISLS-309", name: "Dawah & Communication in Modern Age", creditHours: 3, semester: 6 },
      { code: "ISLS-310", name: "Textual Study of Muslim Thinkers (Shah Waliullah, Al-Ghazali, Ibn Khaldun)", creditHours: 3, semester: 6 },

      // Semester 7
      { code: "ISLS-401", name: "Contemporary Jurisprudential Issues (Ijtihad & Fiqhi Councils)", creditHours: 3, semester: 7 },
      { code: "ISLS-402", name: "Islamic Family Law & Human Rights", creditHours: 3, semester: 7 },
      { code: "ISLS-403", name: "Islamic Philosophy & Tasawwuf", creditHours: 3, semester: 7 },
      { code: "ISLS-404", name: "Islam & Orientalism", creditHours: 3, semester: 7 },
      { code: "ISLS-405", name: "Islamic Studies Research Thesis - I", creditHours: 3, semester: 7 },

      // Semester 8
      { code: "ISLS-406", name: "Islam & Contemporary Global Challenges", creditHours: 3, semester: 8 },
      { code: "ISLS-407", name: "Studies of Islamic Movements & Revivalism", creditHours: 3, semester: 8 },
      { code: "ISLS-408", name: "Textual Study of Usul-e-Fiqh (Al-Wajiz / Usul Ash-Shatibi)", creditHours: 3, semester: 8 },
      { code: "ISLS-409", name: "Islamic Studies Research Thesis - II", creditHours: 3, semester: 8 },
    ],
  },
];

export async function seedBsCourses(externalPrisma?: PrismaClient) {
  const db = externalPrisma || prisma;
  console.log("🚀 Seeding Punjab University (PU) BS Course Curricula for 10 Departments across 8 Semesters...");

  let totalSeeded = 0;

  for (const deptDef of BS_CURRICULA) {
    console.log(`  📚 Seeding department: ${deptDef.department}...`);
    for (const c of deptDef.courses) {
      const courseId = `bs_${deptDef.prefix.toLowerCase()}_sem${c.semester}_${c.code.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      
      await db.course.upsert({
        where: {
          courseCode_department: {
            courseCode: c.code,
            department: deptDef.department,
          },
        },
        update: {
          courseCode: c.code,
          courseName: c.name,
          creditHours: c.creditHours,
          totalMarks: 100,
          department: deptDef.department,
          semester: c.semester,
          programLevel: "BS",
        },
        create: {
          id: courseId,
          courseCode: c.code,
          courseName: c.name,
          creditHours: c.creditHours,
          totalMarks: 100,
          department: deptDef.department,
          semester: c.semester,
          programLevel: "BS",
        },
      });
      totalSeeded++;
    }
  }

  console.log(`✨ Successfully seeded ${totalSeeded} BS courses across 10 departments!`);
}

// Standalone CLI execution
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed-bs.ts")) {
  seedBsCourses()
    .catch((err) => {
      console.error("❌ Failed to seed BS courses:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
