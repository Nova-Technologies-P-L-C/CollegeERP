/**
 * Nova Technology ERP — Demo Account Seeder
 *
 * Creates ready-to-use demo accounts for all roles.
 * These accounts use mock Clerk IDs so they work without
 * real Clerk sign-up. Use the DemoRoleSwitcher in the
 * dashboard header to switch between them.
 *
 * Run: bun prisma/seed-demo.ts
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Demo Accounts ──────────────────────────────────────────────────────────
const DEMO_ADMIN = {
  clerkId: "demo_admin_001",
  email:   "admin@novatechnology.com",
  name:    "Temesgen Zelalem (Admin)",
  role:    "ADMIN" as const,
};

const DEMO_ORG_ADMIN = {
  clerkId: "demo_org_admin_001",
  email:   "orgadmin@novatechnology.com",
  name:    "Selam Haile (Org Admin)",
  role:    "ADMIN" as const,
};

const DEMO_REGISTRAR = {
  clerkId: "demo_registrar_001",
  email:   "registrar@novatechnology.com",
  name:    "Biruk Alemu (Registrar)",
  role:    "ADMIN" as const,
};

const DEMO_ACCOUNTANT = {
  clerkId: "demo_accountant_001",
  email:   "accountant@novatechnology.com",
  name:    "Tigist Bekele (Accountant)",
  role:    "ADMIN" as const,
};

const DEMO_FACULTY = {
  clerkId:        "demo_faculty_001",
  email:          "faculty@novatechnology.com",
  name:           "Dr. Abebe Girma",
  role:           "FACULTY" as const,
  phone:          "+251 911 234567",
  department:     "Computer Science",
  specialization: "Software Engineering",
};

const DEMO_STUDENTS = [
  {
    clerkId:    "demo_student_001",
    email:      "student1@novatechnology.com",
    name:       "Kaleb Tesfaye",
    rollNo:     "CS-2026-01",
    phone:      "+251 912 111001",
    department: "Computer Science",
    semester:   3,
    shift:      "Morning",
    cgpa:       3.75,
  },
  {
    clerkId:    "demo_student_002",
    email:      "student2@novatechnology.com",
    name:       "Hana Bekele",
    rollNo:     "CS-2026-02",
    phone:      "+251 912 111002",
    department: "Computer Science",
    semester:   3,
    shift:      "Morning",
    cgpa:       3.50,
  },
  {
    clerkId:    "demo_student_003",
    email:      "student3@novatechnology.com",
    name:       "Yonas Tadesse",
    rollNo:     "MTH-2026-01",
    phone:      "+251 912 111003",
    department: "Mathematics",
    semester:   2,
    shift:      "Morning",
    cgpa:       3.20,
  },
  {
    clerkId:    "demo_student_004",
    email:      "student4@novatechnology.com",
    name:       "Meron Alemu",
    rollNo:     "ENG-2026-01",
    phone:      "+251 912 111004",
    department: "English",
    semester:   1,
    shift:      "Evening",
    cgpa:       3.60,
  },
  {
    clerkId:    "demo_student_005",
    email:      "student5@novatechnology.com",
    name:       "Dawit Haile",
    rollNo:     "PHY-2026-01",
    phone:      "+251 912 111005",
    department: "Physics",
    semester:   4,
    shift:      "Morning",
    cgpa:       2.90,
  },
];

async function main() {
  console.log("🌱 Seeding Nova Technology demo accounts...\n");

  // ── 1. Admin ──────────────────────────────────────────────────────────────
  console.log("👤 Creating Admin demo accounts...");
  for (const a of [DEMO_ADMIN, DEMO_ORG_ADMIN, DEMO_REGISTRAR, DEMO_ACCOUNTANT]) {
    const u = await prisma.user.upsert({
      where:  { email: a.email },
      update: { clerkId: a.clerkId, name: a.name, role: a.role },
      create: { clerkId: a.clerkId, email: a.email, name: a.name, role: a.role },
    });
    await prisma.admin.upsert({
      where:  { userId: u.id },
      update: {},
      create: { userId: u.id },
    });
    console.log(`   ✅ ${a.name} → ${a.email}`);
  }

  // ── 2. Faculty ────────────────────────────────────────────────────────────
  console.log("👨‍🏫 Creating Faculty demo account...");
  const facultyUser = await prisma.user.upsert({
    where:  { email: DEMO_FACULTY.email },
    update: { clerkId: DEMO_FACULTY.clerkId, name: DEMO_FACULTY.name, role: DEMO_FACULTY.role },
    create: { clerkId: DEMO_FACULTY.clerkId, email: DEMO_FACULTY.email, name: DEMO_FACULTY.name, role: DEMO_FACULTY.role },
  });
  await prisma.faculty.upsert({
    where:  { userId: facultyUser.id },
    update: {},
    create: {
      userId:         facultyUser.id,
      phone:          DEMO_FACULTY.phone,
      department:     DEMO_FACULTY.department,
      specialization: DEMO_FACULTY.specialization,
    },
  });
  console.log(`   ✅ Faculty: ${DEMO_FACULTY.email}`);

  // ── 3. Students ───────────────────────────────────────────────────────────
  console.log("🎓 Creating Student demo accounts...");
  for (const s of DEMO_STUDENTS) {
    const studentUser = await prisma.user.upsert({
      where:  { email: s.email },
      update: { clerkId: s.clerkId, name: s.name, role: "STUDENT" },
      create: { clerkId: s.clerkId, email: s.email, name: s.name, role: "STUDENT" },
    });

    const existingStudent = await prisma.student.findFirst({
      where: { OR: [{ userId: studentUser.id }, { rollNo: s.rollNo }] },
    });

    if (!existingStudent) {
      await prisma.student.create({
        data: {
          userId:     studentUser.id,
          rollNo:     s.rollNo,
          phone:      s.phone,
          department: s.department,
          semester:   s.semester,
          shift:      s.shift,
          cgpa:       s.cgpa,
          programLevel: "BS",
        },
      });
    } else {
      await prisma.student.update({
        where: { id: existingStudent.id },
        data:  { cgpa: s.cgpa, phone: s.phone },
      });
    }
    console.log(`   ✅ Student: ${s.email} (${s.rollNo})`);
  }

  // ── 4. Summary ────────────────────────────────────────────────────────────
  console.log("\n✅ Demo accounts ready!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  DEMO LOGIN CREDENTIALS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🔴 Branch Admin      → admin@novatechnology.com");
  console.log("  🟣 Org Admin         → orgadmin@novatechnology.com        → /dashboard/org-admin");
  console.log("  🟠 Registrar         → registrar@novatechnology.com       → /dashboard/registrar");
  console.log("  🟤 Accountant        → accountant@novatechnology.com      → /dashboard/accountant");
  console.log("  🟡 Faculty           → faculty@novatechnology.com");
  console.log("  🟢 Student 1         → student1@novatechnology.com  (CS, Sem 3)");
  console.log("  🟢 Student 2         → student2@novatechnology.com  (CS, Sem 3)");
  console.log("  🟢 Student 3         → student3@novatechnology.com  (Math, Sem 2)");
  console.log("  🟢 Student 4         → student4@novatechnology.com  (English, Sem 1)");
  console.log("  🟢 Student 5         → student5@novatechnology.com  (Physics, Sem 4)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Password for all: Demo@1234");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  NOTE: After signing up with each email on Clerk,");
  console.log("  use the 'Role Demo' switcher in the dashboard header");
  console.log("  to navigate to Org Admin, Registrar & Accountant views.");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
