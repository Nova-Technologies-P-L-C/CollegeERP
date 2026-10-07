import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { seedHsscCourses } from "./seed-hssc";
import { seedBsCourses } from "./seed-bs";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function mockClerkId(prefix: string, id: string) {
  const hash = id.padStart(6, "0");
  return `user_mock_${prefix}${hash}`;
}

// ─── 1. Admins (3) ──────────────────────────────────────
const ADMINS = [
  { clerkId: "user_3C9cf7vvuywZKrZicAweaHGtiNr", email: "admin@college.edu.pk",  name: "Admin Tester" },
  { clerkId: "user_3C9g1Lp0h1opFyWAbBn0pccGQhs", email: "admin2@college.edu.pk", name: "Dr. Zafar Iqbal" },
  { clerkId: "user_3C9fiFD4wdqiUTFGwYyQAbvc7N6", email: "admin3@college.edu.pk", name: "Prof. Nadia Sheikh" },
];

// ─── 2. Faculty (30) ─────────────────────────────────────
const FACULTY_DATA = [
  // Computer Science (6)
  { id: "f1",  clerkId: "user_3C9cVNeByLUAptMRkUMgw8gyzdW", name: "Dr. Khalid Mahmood",   email: "khalid.mahmood@gc.edu.pk",  phone: "0321-1111111", department: "Computer Science",  specialization: "Machine Learning",        joinDate: "2015-03-01" },
  { id: "f2",  clerkId: "user_3C9fgZSJgjXCzhyP47JUOwQf0jj", name: "Dr. Amina Rashid",     email: "amina.rashid@gc.edu.pk",    phone: "0321-2222222", department: "Computer Science",  specialization: "Database Systems",        joinDate: "2017-08-15" },
  { id: "f11", clerkId: mockClerkId("f", "11"),               name: "Dr. Shahid Baig",      email: "shahid.baig@gc.edu.pk",     phone: "0321-1100111", department: "Computer Science",  specialization: "Software Engineering",    joinDate: "2014-02-10" },
  { id: "f12", clerkId: mockClerkId("f", "12"),               name: "Ms. Rabia Farooq",     email: "rabia.farooq@gc.edu.pk",    phone: "0321-1200112", department: "Computer Science",  specialization: "Computer Networks",       joinDate: "2019-09-01" },
  { id: "f13", clerkId: mockClerkId("f", "13"),               name: "Mr. Tariq Bashir",     email: "tariq.bashir@gc.edu.pk",    phone: "0321-1300113", department: "Computer Science",  specialization: "Cybersecurity",           joinDate: "2020-01-15" },
  { id: "f14", clerkId: mockClerkId("f", "14"),               name: "Dr. Hina Saleem",      email: "hina.saleem@gc.edu.pk",     phone: "0321-1400114", department: "Computer Science",  specialization: "Artificial Intelligence", joinDate: "2016-07-20" },
  // Mathematics (4)
  { id: "f3",  clerkId: "user_3C9g1tP7H7v03w2CJIrq6g47ymX", name: "Prof. Zahid Iqbal",    email: "zahid.iqbal@gc.edu.pk",     phone: "0321-3333333", department: "Mathematics",        specialization: "Linear Algebra",          joinDate: "2010-01-10" },
  { id: "f10", clerkId: mockClerkId("f", "10"),               name: "Dr. Tahira Parveen",   email: "tahira.p@gc.edu.pk",        phone: "0322-1111111", department: "Mathematics",        specialization: "Calculus",                joinDate: "2019-01-15" },
  { id: "f15", clerkId: mockClerkId("f", "15"),               name: "Prof. Azhar Hussain",  email: "azhar.hussain@gc.edu.pk",   phone: "0321-1500115", department: "Mathematics",        specialization: "Statistics",              joinDate: "2013-04-01" },
  { id: "f16", clerkId: mockClerkId("f", "16"),               name: "Ms. Fareeha Malik",    email: "fareeha.malik@gc.edu.pk",   phone: "0321-1600116", department: "Mathematics",        specialization: "Differential Equations",  joinDate: "2021-03-10" },
  // Physics (3)
  { id: "f4",  clerkId: mockClerkId("f", "4"),                name: "Dr. Saima Nasreen",    email: "saima.n@gc.edu.pk",         phone: "0321-4444444", department: "Physics",            specialization: "Quantum Mechanics",       joinDate: "2016-06-20" },
  { id: "f17", clerkId: mockClerkId("f", "17"),               name: "Prof. Aamir Shafiq",   email: "aamir.shafiq@gc.edu.pk",    phone: "0321-1700117", department: "Physics",            specialization: "Electromagnetism",        joinDate: "2012-11-15" },
  { id: "f18", clerkId: mockClerkId("f", "18"),               name: "Mr. Bilal Anwar",      email: "bilal.anwar@gc.edu.pk",     phone: "0321-1800118", department: "Physics",            specialization: "Nuclear Physics",         joinDate: "2018-06-01" },
  // English (3)
  { id: "f5",  clerkId: mockClerkId("f", "5"),                name: "Prof. Asad Ali",       email: "asad.ali@gc.edu.pk",        phone: "0321-5555555", department: "English",            specialization: "English Literature",      joinDate: "2012-09-01" },
  { id: "f19", clerkId: mockClerkId("f", "19"),               name: "Ms. Sobia Ishaq",      email: "sobia.ishaq@gc.edu.pk",     phone: "0321-1900119", department: "English",            specialization: "Linguistics",             joinDate: "2017-03-20" },
  { id: "f20", clerkId: mockClerkId("f", "20"),               name: "Dr. Noman Akhtar",     email: "noman.akhtar@gc.edu.pk",    phone: "0321-2000120", department: "English",            specialization: "Creative Writing",        joinDate: "2015-08-10" },
  // Chemistry (3)
  { id: "f6",  clerkId: mockClerkId("f", "6"),                name: "Dr. Farhat Jabeen",    email: "farhat.j@gc.edu.pk",        phone: "0321-6666666", department: "Chemistry",          specialization: "Organic Chemistry",       joinDate: "2018-02-15" },
  { id: "f21", clerkId: mockClerkId("f", "21"),               name: "Prof. Uzma Rauf",      email: "uzma.rauf@gc.edu.pk",       phone: "0321-2100121", department: "Chemistry",          specialization: "Inorganic Chemistry",     joinDate: "2014-09-01" },
  { id: "f22", clerkId: mockClerkId("f", "22"),               name: "Mr. Imtiaz Haider",    email: "imtiaz.haider@gc.edu.pk",   phone: "0321-2200122", department: "Chemistry",          specialization: "Physical Chemistry",      joinDate: "2020-06-15" },
  // Economics (3)
  { id: "f7",  clerkId: mockClerkId("f", "7"),                name: "Prof. Waqar Ahmed",    email: "waqar.a@gc.edu.pk",         phone: "0321-7777777", department: "Economics",          specialization: "Microeconomics",          joinDate: "2014-07-01" },
  { id: "f23", clerkId: mockClerkId("f", "23"),               name: "Dr. Shehla Qayyum",    email: "shehla.qayyum@gc.edu.pk",   phone: "0321-2300123", department: "Economics",          specialization: "Macroeconomics",          joinDate: "2016-01-20" },
  { id: "f24", clerkId: mockClerkId("f", "24"),               name: "Mr. Fahad Noor",       email: "fahad.noor@gc.edu.pk",      phone: "0321-2400124", department: "Economics",          specialization: "Development Economics",   joinDate: "2019-07-01" },
  // Urdu (3)
  { id: "f8",  clerkId: mockClerkId("f", "8"),                name: "Dr. Rashida Bibi",     email: "rashida.b@gc.edu.pk",       phone: "0321-8888888", department: "Urdu",               specialization: "Urdu Poetry",             joinDate: "2013-05-10" },
  { id: "f25", clerkId: mockClerkId("f", "25"),               name: "Prof. Ghulam Mustafa", email: "ghulam.mustafa@gc.edu.pk",  phone: "0321-2500125", department: "Urdu",               specialization: "Urdu Prose",              joinDate: "2011-08-01" },
  { id: "f26", clerkId: mockClerkId("f", "26"),               name: "Ms. Naila Qureshi",    email: "naila.qureshi@gc.edu.pk",   phone: "0321-2600126", department: "Urdu",               specialization: "Classical Literature",    joinDate: "2018-02-01" },
  // Islamic Studies (3)
  { id: "f9",  clerkId: mockClerkId("f", "9"),                name: "Prof. Naveed Hassan",  email: "naveed.h@gc.edu.pk",        phone: "0321-9999999", department: "Islamic Studies",    specialization: "Islamic History",         joinDate: "2011-11-20" },
  { id: "f27", clerkId: mockClerkId("f", "27"),               name: "Dr. Abdul Rehman",     email: "abdul.rehman@gc.edu.pk",    phone: "0321-2700127", department: "Islamic Studies",    specialization: "Fiqh & Jurisprudence",   joinDate: "2013-09-15" },
  { id: "f28", clerkId: mockClerkId("f", "28"),               name: "Prof. Sadia Niazi",    email: "sadia.niazi@gc.edu.pk",     phone: "0321-2800128", department: "Islamic Studies",    specialization: "Quran & Tafseer",        joinDate: "2016-03-10" },
  // Extra (2)
  { id: "f29", clerkId: mockClerkId("f", "29"),               name: "Dr. Misbah Arif",      email: "misbah.arif@gc.edu.pk",     phone: "0321-2900129", department: "Computer Science",  specialization: "Data Science",            joinDate: "2022-01-10" },
  { id: "f30", clerkId: mockClerkId("f", "30"),               name: "Prof. Kamran Yousaf",  email: "kamran.yousaf@gc.edu.pk",   phone: "0321-3000130", department: "Mathematics",        specialization: "Number Theory",           joinDate: "2021-08-01" },
];

// ─── 3. Students (100 total) ──────────────────────────────
const FIRST_NAMES = ["Ali", "Fatima", "Muhammad", "Ayesha", "Hassan", "Sana", "Ahmed", "Zainab", "Bilal", "Maria", "Umer", "Hira", "Talha", "Nadia", "Kamran", "Rabia", "Imran", "Sadaf", "Asad", "Maryam", "Hamza", "Kinza", "Fawad", "Amna", "Saira", "Rizwan", "Tooba", "Bilal", "Mehreen", "Arooj", "Shahzaib", "Huma", "Wasim", "Nafeesa", "Danyal", "Iqra", "Shahbaz", "Rukhsar", "Asim", "Samra", "Saleha", "Junaid", "Laiba", "Qasim", "Zoha", "Anas", "Zara", "Muneeb", "Usman", "Khadija", "Tariq", "Saima", "Zubair", "Ayesha", "Rashid", "Fariha", "Haris", "Noreen", "Waqas", "Sundas", "Yousaf", "Bushra", "Ahsan", "Mahnoor", "Arslan", "Hina", "Zeeshan", "Mona", "Faisal", "Sidra", "Kashif", "Saba", "Shoaib", "Iqra", "Adnan", "Mehwish", "Zahid", "Nida", "Raza", "Tayyaba", "Babar", "Soban", "Uzma", "Farhan", "Kiran", "Rehan", "Shazia", "Saad", "Ayla", "Omer", "Alia", "Waleed", "Haleema", "Zain", "Amber", "Taimoor", "Irum", "Shehryar", "Anum"];
const LAST_NAMES  = ["Abbas", "Zahra", "Usman", "Siddiqui", "Raza", "Malik", "Khan", "Noor", "Hussain", "Tariq", "Farooq", "Shah", "Ahmed", "Perveen", "Ali", "Aslam", "Ashraf", "Mehmood", "Nawaz", "Iftikhar", "Balouch", "Chaudhry", "Javaid", "Batool", "Asghar", "Shafiq", "Zaman", "Tanveer", "Fatima", "Mirza", "Akhtar", "Akram", "Rauf", "Rafique", "Gill", "Bibi", "Butt", "Gul", "Munir", "Haider", "Shaheen", "Bhatti", "Iqbal", "Riaz", "Qazi", "Hassan", "Sheikh", "Baig", "Qureshi", "Niazi"];

const DEPT_DISTRIBUTION = [
  { dept: "Computer Science", code: "CS",  count: 30 },
  { dept: "Mathematics",      code: "MTH", count: 14 },
  { dept: "Physics",          code: "PHY", count: 12 },
  { dept: "English",          code: "ENG", count: 12 },
  { dept: "Chemistry",        code: "CHM", count: 10 },
  { dept: "Economics",        code: "ECO", count: 8 },
  { dept: "Urdu",             code: "URD", count: 7 },
  { dept: "Islamic Studies",  code: "ISL", count: 7 },
];

interface StudentItem {
  id: string;
  clerkId: string;
  name: string;
  rollNo: string;
  email: string;
  phone: string;
  department: string;
  semester: number;
  programLevel?: "BS" | "INTERMEDIATE";
  discipline?: string;
  part?: number;
  subjectSet?: string;
  enrollmentDate: string;
}

const STUDENT_DATA: StudentItem[] = [];

const SPECIFIC_STUDENTS: Record<string, { clerkId: string; name: string; email: string }> = {
  s1: { clerkId: "user_3C9cPnJBgQQum6oC9Bd6iaYdIYM", name: "Ali Abbas",      email: "ali.abbas@gc.edu.pk" },
  s2: { clerkId: "user_3C9TUj65lyHr9jwkUStkuyRgIut", name: "Fatima Zahra",   email: "fatima.zahra@gc.edu.pk" },
  s3: { clerkId: "user_3C9gAqqP8REEpeVX86W0ELzinur", name: "Muhammad Usman", email: "m.usman@gc.edu.pk" },
};

let studentCounter = 1;

// 1. BS Students (100)
for (const dist of DEPT_DISTRIBUTION) {
  for (let i = 1; i <= dist.count; i++) {
    const sId = `s${studentCounter}`;
    const fn = FIRST_NAMES[(studentCounter - 1) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(studentCounter - 1) % LAST_NAMES.length];
    const fullName = SPECIFIC_STUDENTS[sId]?.name ?? `${fn} ${ln}`;
    const email = SPECIFIC_STUDENTS[sId]?.email ?? `${fn.toLowerCase()}.${ln.toLowerCase()}${studentCounter}@gc.edu.pk`;
    const clerkId = SPECIFIC_STUDENTS[sId]?.clerkId ?? mockClerkId("s", `${studentCounter}`);
    
    const semester = [1, 3, 5, 7][(i - 1) % 4];
    const year = 2026 - Math.floor((semester + 1) / 2);
    const seq = String(i).padStart(3, "0");
    const rollNo = `${dist.code}-${year}-${seq}`;
    const phone = `03${String((studentCounter % 4) + 1).padStart(2, "0")}-${String(1000000 + studentCounter * 12345).slice(-7)}`;

    STUDENT_DATA.push({
      id: sId,
      clerkId,
      name: fullName,
      rollNo,
      email,
      phone,
      department: dist.dept,
      semester,
      programLevel: "BS",
      enrollmentDate: `${year}-09-01`,
    });
    studentCounter++;
  }
}

// 2. Intermediate / HSSC Students (50 total across 7 disciplines)
const INTERMEDIATE_DISCIPLINES_DIST = [
  { discipline: "F.Sc Pre-Medical",     prefix: "PMED", count: 10 },
  { discipline: "F.Sc Pre-Engineering", prefix: "PENG", count: 10 },
  { discipline: "ICS",                  prefix: "ICS",  count: 10 },
  { discipline: "FA",                   prefix: "FA",   count: 8 },
  { discipline: "FA IT",                prefix: "FAIT", count: 4 },
  { discipline: "I.Com",                prefix: "ICOM", count: 5 },
  { discipline: "Home Economics",       prefix: "HECO", count: 3 },
];

let interCounter = 1;
for (const dist of INTERMEDIATE_DISCIPLINES_DIST) {
  for (let i = 1; i <= dist.count; i++) {
    const sId = `s_inter_${interCounter}`;
    const fn = FIRST_NAMES[(interCounter + 15) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(interCounter + 10) % LAST_NAMES.length];
    const fullName = `${fn} ${ln}`;
    const email = `hssc.${fn.toLowerCase()}.${ln.toLowerCase()}${interCounter}@gc.edu.pk`;
    const clerkId = mockClerkId("si", `${interCounter}`);

    const part = (i % 2 === 1) ? 1 : 2;
    const semester = part;
    const year = 2026 - (part - 1);
    const seq = String(i).padStart(3, "0");
    const rollNo = `HSSC-${dist.prefix}-${year}-${seq}`;
    const phone = `03${String((interCounter % 4) + 1).padStart(2, "0")}-${String(2000000 + interCounter * 23456).slice(-7)}`;

    STUDENT_DATA.push({
      id: sId,
      clerkId,
      name: fullName,
      rollNo,
      email,
      phone,
      department: dist.discipline,
      semester,
      programLevel: "INTERMEDIATE",
      discipline: dist.discipline,
      part,
      subjectSet: "Set 1",
      enrollmentDate: `${year}-09-01`,
    });
    interCounter++;
  }
}

// ─── 4. Courses (28) ─────────────────────────────────────
const COURSE_DATA = [
  { id: "c1",  courseCode: "CS-301",  courseName: "Database Systems",            creditHours: 3, department: "Computer Science",  semester: 5, assignedFaculty: "f2" },
  { id: "c2",  courseCode: "CS-401",  courseName: "Machine Learning",            creditHours: 3, department: "Computer Science",  semester: 7, assignedFaculty: "f1" },
  { id: "c3",  courseCode: "CS-201",  courseName: "Data Structures",             creditHours: 4, department: "Computer Science",  semester: 3, assignedFaculty: "f2" },
  { id: "c4",  courseCode: "MTH-301", courseName: "Linear Algebra",              creditHours: 3, department: "Mathematics",        semester: 5, assignedFaculty: "f3" },
  { id: "c5",  courseCode: "MTH-101", courseName: "Calculus I",                  creditHours: 3, department: "Mathematics",        semester: 1, assignedFaculty: "f10" },
  { id: "c6",  courseCode: "PHY-201", courseName: "Quantum Mechanics",           creditHours: 3, department: "Physics",            semester: 3, assignedFaculty: "f4" },
  { id: "c7",  courseCode: "ENG-301", courseName: "English Literature",          creditHours: 3, department: "English",            semester: 5, assignedFaculty: "f5" },
  { id: "c8",  courseCode: "CHM-101", courseName: "Organic Chemistry",           creditHours: 4, department: "Chemistry",          semester: 1, assignedFaculty: "f6" },
  { id: "c9",  courseCode: "ECO-201", courseName: "Microeconomics",              creditHours: 3, department: "Economics",          semester: 3, assignedFaculty: "f7" },
  { id: "c10", courseCode: "CS-101",  courseName: "Programming Fundamentals",    creditHours: 4, department: "Computer Science",  semester: 1, assignedFaculty: "f1" },
  { id: "c11", courseCode: "CS-302",  courseName: "Software Engineering",        creditHours: 3, department: "Computer Science",  semester: 5, assignedFaculty: "f11" },
  { id: "c12", courseCode: "CS-403",  courseName: "Computer Networks",           creditHours: 3, department: "Computer Science",  semester: 7, assignedFaculty: "f12" },
  { id: "c13", courseCode: "MTH-201", courseName: "Statistics",                  creditHours: 3, department: "Mathematics",        semester: 3, assignedFaculty: "f15" },
  { id: "c14", courseCode: "PHY-101", courseName: "Mechanics",                   creditHours: 3, department: "Physics",            semester: 1, assignedFaculty: "f17" },
  { id: "c15", courseCode: "PHY-301", courseName: "Electromagnetism",            creditHours: 3, department: "Physics",            semester: 5, assignedFaculty: "f17" },
  { id: "c16", courseCode: "ENG-101", courseName: "Functional English",          creditHours: 3, department: "English",            semester: 1, assignedFaculty: "f19" },
  { id: "c17", courseCode: "ENG-201", courseName: "Linguistics",                 creditHours: 3, department: "English",            semester: 3, assignedFaculty: "f19" },
  { id: "c18", courseCode: "CHM-201", courseName: "Inorganic Chemistry",         creditHours: 3, department: "Chemistry",          semester: 3, assignedFaculty: "f21" },
  { id: "c19", courseCode: "CHM-301", courseName: "Physical Chemistry",          creditHours: 3, department: "Chemistry",          semester: 5, assignedFaculty: "f22" },
  { id: "c20", courseCode: "ECO-101", courseName: "Introduction to Economics",   creditHours: 3, department: "Economics",          semester: 1, assignedFaculty: "f23" },
  { id: "c21", courseCode: "ECO-301", courseName: "Macroeconomics",              creditHours: 3, department: "Economics",          semester: 5, assignedFaculty: "f23" },
  { id: "c22", courseCode: "URD-101", courseName: "Urdu Adab",                   creditHours: 3, department: "Urdu",               semester: 1, assignedFaculty: "f8" },
  { id: "c23", courseCode: "URD-301", courseName: "Urdu Shairi",                 creditHours: 3, department: "Urdu",               semester: 5, assignedFaculty: "f25" },
  { id: "c24", courseCode: "ISL-101", courseName: "Islamic Studies",             creditHours: 2, department: "Islamic Studies",    semester: 1, assignedFaculty: "f9" },
  { id: "c25", courseCode: "ISL-301", courseName: "Fiqh & Jurisprudence",        creditHours: 3, department: "Islamic Studies",    semester: 5, assignedFaculty: "f27" },
  { id: "c26", courseCode: "MTH-401", courseName: "Differential Equations",      creditHours: 3, department: "Mathematics",        semester: 7, assignedFaculty: "f16" },
  { id: "c27", courseCode: "CS-202",  courseName: "Object Oriented Programming", creditHours: 3, department: "Computer Science",  semester: 3, assignedFaculty: "f14" },
  { id: "c28", courseCode: "CS-402",  courseName: "Cybersecurity",               creditHours: 3, department: "Computer Science",   semester: 7, assignedFaculty: "f13" },
];

// ─── 5. Automatic Enrollments ────────────────────────────
const ENROLLMENT_DATA: { studentId: string; courseId: string; semester: number }[] = [];

for (const student of STUDENT_DATA) {
  const matchingCourses = COURSE_DATA.filter(
    (c) => c.department === student.department && c.semester === student.semester
  );
  if (matchingCourses.length > 0) {
    for (const mc of matchingCourses) {
      ENROLLMENT_DATA.push({ studentId: student.id, courseId: mc.id, semester: student.semester });
    }
  } else {
    const deptCourses = COURSE_DATA.filter((c) => c.department === student.department);
    if (deptCourses.length > 0) {
      ENROLLMENT_DATA.push({ studentId: student.id, courseId: deptCourses[0].id, semester: student.semester });
    }
  }
}

// ─── 6. Student Attendance ──────────────────────────────
function generateClassDates(numDates: number): string[] {
  const dates: string[] = [];
  const cur = new Date("2026-02-02");
  while (dates.length < numDates) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(cur.toISOString().split("T")[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const CLASS_DATES = generateClassDates(30);

function getAttendanceStatus(index: number): "Present" | "Absent" | "Late" {
  const mod = index % 100;
  if (mod < 90) return "Present";
  if (mod < 97) return "Late";
  return "Absent";
}

// ─── 7. Faculty Attendance (60 working days) ───────────
function generateWorkingDays(numDays: number): string[] {
  const dates: string[] = [];
  const cur = new Date("2026-01-05");
  while (dates.length < numDays) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(cur.toISOString().split("T")[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const FACULTY_WORKING_DAYS = generateWorkingDays(60);

// ─── 8. Fees Helper ──────────────────────────────────────
const FEE_MAP: Record<string, number> = {
  "Computer Science": 35000, "Mathematics": 30000, "Physics": 28000,
  "English": 25000, "Chemistry": 30000, "Economics": 27000,
  "Urdu": 22000, "Islamic Studies": 20000,
  "F.Sc Pre-Medical": 26000, "F.Sc Pre-Engineering": 26000,
  "ICS": 24000, "FA": 20000, "FA IT": 22000,
  "I.Com": 21000, "Home Economics": 20000,
};

function makeFeesForStudent(studentId: string, baseFee: number, semester: number) {
  const cleanNum = studentId.replace(/[^0-9]/g, "") || "1";
  const sNum = parseInt(cleanNum, 10);
  const semStatus  = (sNum % 7 === 0) ? "Overdue" : (sNum % 5 === 0) ? "Unpaid" : "Paid";
  const labStatus  = (sNum % 4 === 0) ? "Unpaid"  : "Paid";
  const libStatus  = (sNum % 9 === 0) ? "Overdue" : "Paid";

  return [
    { id: `fee_${studentId}_sem`, studentId, type: "Semester Fee", amount: baseFee,                 status: semStatus as "Paid" | "Unpaid" | "Overdue", dueDate: new Date("2026-02-15"), semester, paidDate: semStatus === "Paid" ? new Date("2026-02-10") : null },
    { id: `fee_${studentId}_lab`, studentId, type: "Lab Fee",      amount: Math.round(baseFee * 0.12), status: labStatus as "Paid" | "Unpaid" | "Overdue", dueDate: new Date("2026-03-15"), semester, paidDate: labStatus === "Paid" ? new Date("2026-03-08") : null },
    { id: `fee_${studentId}_lib`, studentId, type: "Library Fee",  amount: 2000,                         status: libStatus as "Paid" | "Unpaid" | "Overdue", dueDate: new Date("2026-02-15"), semester, paidDate: libStatus === "Paid" ? new Date("2026-02-12") : null },
  ];
}

// ─── 9. Expanded Timetable (56 slots) ────────────────────
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// ─── 10. Announcements & Admissions ──────────────────────
const ANNOUNCEMENTS = [
  { id: "ann1", title: "Mid-Term Examination Schedule",    content: "Mid-term examinations will begin from April 15, 2026. Detailed schedule will be shared on the notice board. All students are required to bring their admit cards.", author: "Admin Office",        date: new Date("2026-04-01"), audience: "All" as const,      priority: "High" as const,   programLevel: "BS" as const },
  { id: "ann2", title: "Fee Submission Deadline Extended", content: "The last date for fee submission for the Spring 2026 semester has been extended to April 20, 2026. Late fee charges will apply after this date.",                     author: "Accounts Department", date: new Date("2026-03-28"), audience: "Students" as const, priority: "High" as const,   programLevel: "BS" as const },
  { id: "ann3", title: "Faculty Development Workshop",     content: "A workshop on Modern Teaching Methodologies will be held on April 10, 2026 in the seminar hall. All faculty members are encouraged to attend.",                         author: "HoD Committee",       date: new Date("2026-03-25"), audience: "Faculty" as const,  priority: "Medium" as const, programLevel: "BS" as const },
  { id: "ann4", title: "Sports Week Announcement",         content: "Annual Sports Week will be held from April 25-30, 2026. Interested students can register at the sports office before April 18.",                                         author: "Sports Department",   date: new Date("2026-03-20"), audience: "Students" as const, priority: "Low" as const,    programLevel: "BS" as const },
  { id: "ann5", title: "Library Hours Extended",           content: "The college library will now remain open till 8:00 PM on weekdays during the examination period.",                                                                        author: "Library Committee",   date: new Date("2026-03-15"), audience: "All" as const,      priority: "Medium" as const, programLevel: "BS" as const },
  { id: "ann6", title: "HSSC Part 1 & 2 Board Examination Form Submission", content: "All Intermediate (HSSC) students are instructed to submit their board examination admission forms before March 30, 2026.", author: "Intermediate Section", date: new Date("2026-03-18"), audience: "Students" as const, priority: "High" as const,   programLevel: "INTERMEDIATE" as const },
];

const ADMISSIONS = [
  { id: "a1",  studentName: "Hamza Tariq",    email: "hamza.t@gmail.com",   phone: "0331-1234567", appliedDepartment: "Computer Science", applicationDate: new Date("2026-03-15"), status: "Pending",  fatherName: "Tariq Mehmood",  cnic: "34201-1234567-1", previousInstitution: "Govt. High School Hafizabad", marksObtained: 920, totalMarks: 1100, programLevel: "BS" as const },
  { id: "a2",  studentName: "Rimsha Akram",   email: "rimsha.a@gmail.com",  phone: "0332-2345678", appliedDepartment: "English",           applicationDate: new Date("2026-03-14"), status: "Approved", fatherName: "Akram Hussain",  cnic: "34201-2345678-2", previousInstitution: "Divisional Public School",     marksObtained: 850, totalMarks: 1100, programLevel: "BS" as const },
  { id: "a3",  studentName: "Faisal Nawaz",   email: "faisal.n@gmail.com",  phone: "0333-3456789", appliedDepartment: "Mathematics",       applicationDate: new Date("2026-03-16"), status: "Pending",  fatherName: "Nawaz Sharif",   cnic: "34201-3456789-3", previousInstitution: "Govt. College Pindi Bhattian", marksObtained: 780, totalMarks: 1100, programLevel: "BS" as const },
  { id: "a4",  studentName: "Iqra Batool",    email: "iqra.b@gmail.com",    phone: "0334-4567890", appliedDepartment: "Computer Science", applicationDate: new Date("2026-03-12"), status: "Rejected", fatherName: "Muhammad Aslam", cnic: "34201-4567890-4", previousInstitution: "Punjab College",               marksObtained: 600, totalMarks: 1100, programLevel: "BS" as const },
  { id: "a5",  studentName: "Usama Ghani",    email: "usama.g@gmail.com",   phone: "0335-5678901", appliedDepartment: "Physics",           applicationDate: new Date("2026-03-17"), status: "Pending",  fatherName: "Abdul Ghani",    cnic: "34201-5678901-5", previousInstitution: "Superior College",             marksObtained: 870, totalMarks: 1100, programLevel: "BS" as const },
  { id: "a6",  studentName: "Mehwish Khalid", email: "mehwish.k@gmail.com", phone: "0336-6789012", appliedDepartment: "Chemistry",         applicationDate: new Date("2026-03-10"), status: "Approved", fatherName: "Khalid Mehmood", cnic: "34201-6789012-6", previousInstitution: "Govt. Girls College",          marksObtained: 910, totalMarks: 1100, programLevel: "BS" as const },
  { id: "a7",  studentName: "Shahbaz Akhtar", email: "shahbaz.a@gmail.com", phone: "0337-7890123", appliedDepartment: "Economics",         applicationDate: new Date("2026-03-18"), status: "Pending",  fatherName: "Akhtar Ali",     cnic: "34201-7890123-7", previousInstitution: "Army Public School",           marksObtained: 750, totalMarks: 1100, programLevel: "BS" as const },
  { id: "a8",  studentName: "Muneeba Tahir",  email: "muneeba.t@gmail.com", phone: "0338-8901234", appliedDepartment: "Urdu",              applicationDate: new Date("2026-03-11"), status: "Approved", fatherName: "Tahir Abbas",    cnic: "34201-8901234-8", previousInstitution: "Beacon House School",          marksObtained: 820, totalMarks: 1100, programLevel: "BS" as const },
  { id: "a9",  studentName: "Zahid Mehmood",  email: "zahid.m@gmail.com",  phone: "0339-9012345", appliedDepartment: "ICS",              applicationDate: new Date("2026-03-19"), status: "Pending",  fatherName: "Mehmood Khan",   cnic: "34201-9012345-9", previousInstitution: "Govt. High School Hafizabad", marksObtained: 950, totalMarks: 1100, programLevel: "INTERMEDIATE" as const, discipline: "ICS", part: 1 },
  { id: "a10", studentName: "Sobia Perveen",   email: "sobia.p@gmail.com",   phone: "0340-0123456", appliedDepartment: "F.Sc Pre-Medical", applicationDate: new Date("2026-03-21"), status: "Approved", fatherName: "Muhammad Pervez", cnic: "34201-0123456-0", previousInstitution: "Divisional Public School",     marksObtained: 980, totalMarks: 1100, programLevel: "INTERMEDIATE" as const, discipline: "F.Sc Pre-Medical", part: 1 },
  { id: "a11", studentName: "Adeel Ashraf",    email: "adeel.a@gmail.com",   phone: "0341-1234567", appliedDepartment: "FA",               applicationDate: new Date("2026-03-22"), status: "Pending",  fatherName: "Ashraf Ali",     cnic: "34201-1234567-0", previousInstitution: "Govt. High School Gujranwala",marksObtained: 720, totalMarks: 1100, programLevel: "INTERMEDIATE" as const, discipline: "FA", part: 1 },
];

// ─── FAST OPTIMIZED IDEMPOTENT MAIN EXECUTION ────────────────
async function main() {
  console.log("🚀 Starting ultra-fast idempotent database seeding...\n");

  // Fetch all existing user emails in a single batch query
  const existingUsers = await prisma.user.findMany({ select: { email: true } });
  const existingEmails = new Set(existingUsers.map((u) => u.email));

  // 1. Admins
  console.log("Seeding admins...");
  for (const admin of ADMINS) {
    if (!existingEmails.has(admin.email)) {
      await prisma.user.create({
        data: { clerkId: admin.clerkId, email: admin.email, name: admin.name, role: "ADMIN", admin: { create: {} } },
      });
      existingEmails.add(admin.email);
    }
  }
  console.log(`  ✓ Admins processed`);

  // 2. Faculty
  console.log("Seeding faculty...");
  for (const f of FACULTY_DATA) {
    if (!existingEmails.has(f.email)) {
      await prisma.user.create({
        data: {
          clerkId: f.clerkId, email: f.email, name: f.name, role: "FACULTY",
          faculty: {
            create: { id: f.id, phone: f.phone, department: f.department, specialization: f.specialization, joinDate: new Date(f.joinDate) },
          },
        },
      });
      existingEmails.add(f.email);
    }
  }
  console.log(`  ✓ Faculty processed`);

  // 3. Students
  console.log("Seeding students...");
  for (const s of STUDENT_DATA) {
    if (!existingEmails.has(s.email)) {
      await prisma.user.create({
        data: {
          clerkId: s.clerkId, email: s.email, name: s.name, role: "STUDENT",
          student: {
            create: {
              id: s.id,
              rollNo: s.rollNo,
              phone: s.phone,
              department: s.department,
              semester: s.semester,
              programLevel: s.programLevel ?? "BS",
              discipline: s.discipline ?? null,
              part: s.part ?? null,
              subjectSet: s.subjectSet ?? null,
              enrollmentDate: new Date(s.enrollmentDate),
            },
          },
        },
      });
      existingEmails.add(s.email);
    }
  }
  console.log(`  ✓ ${STUDENT_DATA.length} students processed`);

  // 4. Courses (Comprehensive BS & HSSC Curricula)
  console.log("Seeding comprehensive BS & HSSC courses...");
  await seedBsCourses(prisma);
  await seedHsscCourses(prisma);

  const dbCourseIdMap = new Map<string, string>();

  for (const c of COURSE_DATA) {
    const fallbackId = `bs_${c.department.toLowerCase().replace(/[^a-z0-9]/g, "")}_sem${c.semester}_${c.courseCode.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const upserted = await prisma.course.upsert({
      where: {
        courseCode_department: {
          courseCode: c.courseCode,
          department: c.department,
        },
      },
      update: {
        assignedFaculty: c.assignedFaculty,
        programLevel: "BS",
      },
      create: {
        id: fallbackId,
        courseCode: c.courseCode,
        courseName: c.courseName,
        creditHours: c.creditHours,
        department: c.department,
        semester: c.semester,
        assignedFaculty: c.assignedFaculty,
        programLevel: "BS",
      },
    });
    dbCourseIdMap.set(c.id, upserted.id);
  }
  console.log(`  ✓ Sample faculty course assignments processed`);

  // 5. Enrollments
  console.log("Seeding enrollments...");
  const hsscCoursesInDb = await prisma.course.findMany({
    where: { programLevel: "INTERMEDIATE" },
    select: { id: true, courseCode: true, department: true, discipline: true, part: true, subjectSet: true },
  });

  const ENROLLMENT_DATA: { studentId: string; courseId: string; semester: number }[] = [];
  for (const student of STUDENT_DATA) {
    if (student.programLevel === "INTERMEDIATE") {
      const matchingHssc = hsscCoursesInDb.filter(
        (c) => c.discipline === student.discipline && c.part === student.part && (c.subjectSet === student.subjectSet || c.subjectSet === "Set 1")
      );
      for (const hCourse of matchingHssc) {
        ENROLLMENT_DATA.push({ studentId: student.id, courseId: hCourse.id, semester: student.semester });
      }
    } else {
      const matchingCourses = COURSE_DATA.filter(
        (c) => c.department === student.department && c.semester === student.semester
      );
      if (matchingCourses.length > 0) {
        for (const mc of matchingCourses) {
          const realId = dbCourseIdMap.get(mc.id) || mc.id;
          ENROLLMENT_DATA.push({ studentId: student.id, courseId: realId, semester: student.semester });
        }
      } else {
        const deptCourses = COURSE_DATA.filter((c) => c.department === student.department);
        if (deptCourses.length > 0) {
          const realId = dbCourseIdMap.get(deptCourses[0].id) || deptCourses[0].id;
          ENROLLMENT_DATA.push({ studentId: student.id, courseId: realId, semester: student.semester });
        }
      }
    }
  }
  await prisma.enrollment.createMany({ data: ENROLLMENT_DATA, skipDuplicates: true });
  console.log(`  ✓ ${ENROLLMENT_DATA.length} enrollments processed`);

  // 6. Student Attendance
  console.log("Seeding student attendance...");
  const studentAttBatch: { studentId: string; courseId: string; date: Date; status: "Present" | "Absent" | "Late"; markedBy: string }[] = [];
  for (let eIdx = 0; eIdx < ENROLLMENT_DATA.length; eIdx++) {
    const e = ENROLLMENT_DATA[eIdx];
    const course = COURSE_DATA.find((c) => (dbCourseIdMap.get(c.id) || c.id) === e.courseId);
    const markedBy = course?.assignedFaculty ?? "f1";

    for (let dIdx = 0; dIdx < CLASS_DATES.length; dIdx++) {
      const status = getAttendanceStatus(eIdx * 30 + dIdx);
      studentAttBatch.push({
        studentId: e.studentId,
        courseId: e.courseId,
        date: new Date(CLASS_DATES[dIdx]),
        status,
        markedBy,
      });
    }
  }
  await prisma.attendance.createMany({ data: studentAttBatch, skipDuplicates: true });
  console.log(`  ✓ ${studentAttBatch.length} student attendance records processed`);

  // 7. Faculty Attendance
  console.log("Seeding faculty attendance...");
  const facultyAttBatch: { facultyId: string; date: Date; status: "Present" | "Absent" | "Late"; checkInTime: Date | null; checkOutTime: Date | null; markedBy: string }[] = [];
  for (let fIdx = 0; fIdx < FACULTY_DATA.length; fIdx++) {
    const f = FACULTY_DATA[fIdx];
    for (let dIdx = 0; dIdx < FACULTY_WORKING_DAYS.length; dIdx++) {
      const dateStr = FACULTY_WORKING_DAYS[dIdx];
      const isLate = (fIdx + dIdx) % 15 === 0;
      const isAbsent = (fIdx + dIdx) % 25 === 0 && !isLate;
      const status = isAbsent ? "Absent" : isLate ? "Late" : "Present";
      
      const checkIn  = isAbsent ? null : new Date(`${dateStr}T08:00:00Z`);
      const checkOut = isAbsent ? null : new Date(`${dateStr}T15:30:00Z`);

      facultyAttBatch.push({
        facultyId: f.id,
        date: new Date(dateStr),
        status,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        markedBy: "SELF",
      });
    }
  }
  await prisma.facultyAttendance.createMany({ data: facultyAttBatch, skipDuplicates: true });
  console.log(`  ✓ ${facultyAttBatch.length} faculty attendance records processed`);

  // 8. Fees
  console.log("Seeding fees...");
  const feeBatch: { id: string; studentId: string; type: string; amount: number; status: "Paid" | "Unpaid" | "Overdue"; dueDate: Date; semester: number; paidDate: Date | null }[] = [];
  for (const s of STUDENT_DATA) {
    const feeAmount = FEE_MAP[s.department] ?? 28000;
    feeBatch.push(...makeFeesForStudent(s.id, feeAmount, s.semester));
  }
  await prisma.fee.createMany({ data: feeBatch, skipDuplicates: true });
  console.log(`  ✓ ${feeBatch.length} fee records processed`);

  // 9. Grades
  console.log("Seeding grades...");
  const GPA_CYCLE = [3.9, 3.7, 3.5, 3.4, 3.2, 3.0, 3.8, 3.6, 3.3, 3.1];
  const gradeBatch: { studentId: string; courseId: string; quizMarks: number; assignmentMarks: number; midMarks: number; finalMarks: number; total: number; gpa: number; locked: boolean }[] = [];
  for (let i = 0; i < ENROLLMENT_DATA.length; i++) {
    const e = ENROLLMENT_DATA[i];
    const gpa = GPA_CYCLE[i % GPA_CYCLE.length];
    const quiz  = Math.round(gpa * 5);
    const asgn  = Math.round(gpa * 6);
    const mid   = Math.round(gpa * 9);
    const final = Math.round(gpa * 11);
    gradeBatch.push({
      studentId: e.studentId, courseId: e.courseId, quizMarks: quiz, assignmentMarks: asgn, midMarks: mid, finalMarks: final, total: quiz + asgn + mid + final, gpa, locked: gpa > 3.5,
    });
  }
  await prisma.grade.createMany({ data: gradeBatch, skipDuplicates: true });
  console.log(`  ✓ ${gradeBatch.length} grade records processed`);

  // 10. Timetable
  console.log("Seeding timetable...");
  const TIMETABLE_SLOTS: { id: string; courseId: string; room: string; day: string; startTime: string; endTime: string; shift: string }[] = [];
  let ttCounter = 1;
  for (const course of COURSE_DATA) {
    const realId = dbCourseIdMap.get(course.id) || course.id;
    const day1 = DAYS[(ttCounter) % 5];
    const room1 = `Room ${100 + (ttCounter % 15)}`;
    TIMETABLE_SLOTS.push({
      id: `tt_${ttCounter}`,
      courseId: realId,
      room: room1,
      day: day1,
      startTime: "09:00",
      endTime: "10:30",
      shift: "Morning",
    });
    ttCounter++;

    const day2 = DAYS[(ttCounter + 2) % 5];
    const room2 = `Room ${200 + (ttCounter % 15)}`;
    TIMETABLE_SLOTS.push({
      id: `tt_${ttCounter}`,
      courseId: realId,
      room: room2,
      day: day2,
      startTime: "14:00",
      endTime: "15:30",
      shift: "Evening",
    });
    ttCounter++;
  }

  // Add HSSC Intermediate timetable slots
  for (const hCourse of hsscCoursesInDb.slice(0, 30)) {
    const day1 = DAYS[(ttCounter) % 5];
    const room1 = `Hall ${10 + (ttCounter % 5)}`;
    TIMETABLE_SLOTS.push({
      id: `tt_hssc_${ttCounter}`,
      courseId: hCourse.id,
      room: room1,
      day: day1,
      startTime: "08:30",
      endTime: "10:00",
      shift: "Morning",
    });
    ttCounter++;
  }

  await prisma.timetable.createMany({ data: TIMETABLE_SLOTS, skipDuplicates: true });
  console.log(`  ✓ ${TIMETABLE_SLOTS.length} timetable entries processed`);

  // 11. Announcements
  await prisma.announcement.createMany({ data: ANNOUNCEMENTS, skipDuplicates: true });

  // 12. Admissions
  await prisma.admission.createMany({ data: ADMISSIONS, skipDuplicates: true });

  // 13. Timetable Settings
  await prisma.timetableSettings.upsert({
    where: { shift: "Morning" },
    update: {},
    create: { shift: "Morning", startTime: "07:45", duration: 45, slots: 7 },
  });
  await prisma.timetableSettings.upsert({
    where: { shift: "Evening" },
    update: {},
    create: { shift: "Evening", startTime: "13:30", duration: 45, slots: 6 },
  });

  console.log("\n✨ Idempotent database seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
