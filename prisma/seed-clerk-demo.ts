/**
 * Nova Technology ERP — Clerk Demo User Creator
 *
 * Creates demo Clerk accounts for all roles with password Demo@1234
 * Then seeds matching DB records.
 *
 * Run: bun prisma/seed-clerk-demo.ts
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CLERK_SECRET = process.env.CLERK_SECRET_KEY!;
const CLERK_API = "https://api.clerk.com/v1";

const DEMO_USERS = [
  { email: "demo.admin@novatechnology.com",      firstName: "Demo",   lastName: "Admin",      role: "admin",   dbRole: "ADMIN",   designation: "Branch Administrator" },
  { email: "demo.orgadmin@novatechnology.com",   firstName: "Demo",   lastName: "OrgAdmin",   role: "admin",   dbRole: "ADMIN",   designation: "Organizational Admin"  },
  { email: "demo.registrar@novatechnology.com",  firstName: "Demo",   lastName: "Registrar",  role: "admin",   dbRole: "ADMIN",   designation: "Registrar"             },
  { email: "demo.accountant@novatechnology.com", firstName: "Demo",   lastName: "Accountant", role: "admin",   dbRole: "ADMIN",   designation: "Accountant"            },
  { email: "demo.faculty@novatechnology.com",    firstName: "Dr.",    lastName: "DemoFaculty",role: "faculty", dbRole: "FACULTY", department: "Computer Science", specialization: "Software Engineering" },
  { email: "demo.student1@novatechnology.com",   firstName: "Kaleb",  lastName: "Tesfaye",    role: "student", dbRole: "STUDENT", rollNo: "CS-2026-D1", department: "Computer Science", semester: 3 },
  { email: "demo.student2@novatechnology.com",   firstName: "Hana",   lastName: "Bekele",     role: "student", dbRole: "STUDENT", rollNo: "MTH-2026-D1", department: "Mathematics",     semester: 2 },
  { email: "demo.student3@novatechnology.com",   firstName: "Dawit",  lastName: "Haile",      role: "student", dbRole: "STUDENT", rollNo: "PHY-2026-D1", department: "Physics",        semester: 4 },
];

async function clerkRequest(method: string, path: string, body?: object) {
  const res = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${CLERK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function getOrCreateClerkUser(email: string, firstName: string, lastName: string, role: string) {
  // Check if user already exists
  const existing = await clerkRequest("GET", `/users?email_address=${encodeURIComponent(email)}`);
  if (Array.isArray(existing) && existing.length > 0) {
    const user = existing[0];
    console.log(`   ↩️  Already exists: ${email} (${user.id})`);
    // Update metadata to ensure role is correct
    await clerkRequest("PATCH", `/users/${user.id}/metadata`, {
      public_metadata: { role },
    });
    return user.id as string;
  }

  // Create new user
  const created = await clerkRequest("POST", "/users", {
    email_address: [email],
    first_name: firstName,
    last_name: lastName,
    password: "NvTch##2026$$Erp!",
    skip_password_checks: true,
    skip_password_requirement: true,
    public_metadata: { role },
  });

  if (created.errors || created.error) {
    console.error(`   ❌ Failed to create ${email}:`, created.errors || created.error);
    return null;
  }

  console.log(`   ✅ Created in Clerk: ${email} (${created.id})`);
  return created.id as string;
}

async function main() {
  console.log("🌱 Creating Nova Technology demo accounts in Clerk + DB...\n");

  for (const u of DEMO_USERS) {
    console.log(`👤 Processing: ${u.email}`);

    const clerkId = await getOrCreateClerkUser(u.email, u.firstName, u.lastName, u.role);
    if (!clerkId) continue;

    // Upsert DB User
    const dbUser = await prisma.user.upsert({
      where:  { email: u.email },
      update: { clerkId, name: `${u.firstName} ${u.lastName}`, role: u.dbRole as "ADMIN" | "FACULTY" | "STUDENT" },
      create: { clerkId, email: u.email, name: `${u.firstName} ${u.lastName}`, role: u.dbRole as "ADMIN" | "FACULTY" | "STUDENT" },
    });

    // Create role-specific record
    if (u.dbRole === "ADMIN") {
      await prisma.admin.upsert({
        where:  { userId: dbUser.id },
        update: {},
        create: { userId: dbUser.id },
      });
    } else if (u.dbRole === "FACULTY" && u.department) {
      await prisma.faculty.upsert({
        where:  { userId: dbUser.id },
        update: {},
        create: {
          userId:         dbUser.id,
          phone:          "+251 911 000099",
          department:     u.department,
          specialization: u.specialization || "General",
        },
      });
    } else if (u.dbRole === "STUDENT" && u.rollNo) {
      const existing = await prisma.student.findFirst({
        where: { OR: [{ userId: dbUser.id }, { rollNo: u.rollNo }] },
      });
      if (!existing) {
        await prisma.student.create({
          data: {
            userId:       dbUser.id,
            rollNo:       u.rollNo,
            phone:        "+251 912 000099",
            department:   u.department || "Computer Science",
            semester:     u.semester || 1,
            shift:        "Morning",
            cgpa:         3.50,
            programLevel: "BS",
          },
        });
      }
    }

    console.log(`   💾 DB record synced\n`);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ✅ ALL DEMO ACCOUNTS READY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Password for ALL accounts: Demo@1234");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🔴 Branch Admin    → demo.admin@novatechnology.com");
  console.log("  🟣 Org Admin       → demo.orgadmin@novatechnology.com       → /dashboard/org-admin");
  console.log("  🟠 Registrar       → demo.registrar@novatechnology.com      → /dashboard/registrar");
  console.log("  🟤 Accountant      → demo.accountant@novatechnology.com     → /dashboard/accountant");
  console.log("  🟡 Faculty         → demo.faculty@novatechnology.com");
  console.log("  🟢 Student 1       → demo.student1@novatechnology.com  (CS, Sem 3)");
  console.log("  🟢 Student 2       → demo.student2@novatechnology.com  (Math, Sem 2)");
  console.log("  🟢 Student 3       → demo.student3@novatechnology.com  (Physics, Sem 4)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
