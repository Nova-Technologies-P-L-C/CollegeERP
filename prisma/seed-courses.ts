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

async function seedAllCourses() {
  console.log("🚀 Starting Course Curriculum Seeding (BS + Intermediate)...\n");
  
  await seedHsscCourses(prisma);
  await seedBsCourses(prisma);

  console.log("\n✨ All BS and Intermediate Course Curricula successfully seeded!");
}

seedAllCourses()
  .catch((e) => {
    console.error("❌ Course seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
