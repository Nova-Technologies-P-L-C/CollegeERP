import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { DEPARTMENTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * POST /api/courses/import
 *
 * Accepts a multipart/form-data request with a single "file" field containing
 * a UTF-8 CSV file OR a JSON body containing an array of courses.
 *
 * Expected CSV Columns (case-insensitive):
 *  - courseCode (required, string)
 *  - courseName (required, string)
 *  - creditHours (required, number 1-6)
 *  - department (required, string matching DEPARTMENTS)
 *  - semester (required, number 1-8)
 *  - shift (optional, "Morning" | "Evening", default "Morning")
 *
 * Requires ADMIN role.
 */
export async function POST(request: NextRequest) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    const contentType = request.headers.get("content-type") || "";

    type RawCourse = {
      courseCode: string;
      courseName: string;
      creditHours: number;
      department: string;
      semester: number;
      shift?: string;
      rowNum?: number;
    };

    let rawCourses: RawCourse[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "A CSV file must be uploaded as the 'file' field" },
          { status: 400 }
        );
      }

      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        return NextResponse.json(
          { error: "CSV file must contain a header row and at least one data row" },
          { status: 400 }
        );
      }

      const headers = parseCSVRow(lines[0]).map((h) => h.toLowerCase().trim());
      const col = (name: string): number => headers.indexOf(name);

      const REQUIRED_COLUMNS = ["coursecode", "coursename", "credithours", "department", "semester"];
      const missingCols = REQUIRED_COLUMNS.filter((c) => col(c) === -1);
      if (missingCols.length > 0) {
        return NextResponse.json(
          {
            error: `CSV is missing required column(s): ${missingCols.join(", ")}. Expected headers: courseCode, courseName, creditHours, department, semester, shift`,
          },
          { status: 400 }
        );
      }

      for (let i = 1; i < lines.length; i++) {
        const cells = parseCSVRow(lines[i]);
        const get = (name: string) => (cells[col(name)] ?? "").trim();

        rawCourses.push({
          courseCode: get("coursecode"),
          courseName: get("coursename"),
          creditHours: Number(get("credithours")),
          department: get("department"),
          semester: Number(get("semester")),
          shift: get("shift") || "Morning",
          rowNum: i + 1,
        });
      }
    } else {
      const body = await request.json();
      if (!Array.isArray(body.courses)) {
        return NextResponse.json(
          { error: "Payload must include a 'courses' array" },
          { status: 400 }
        );
      }
      rawCourses = body.courses;
    }

    if (rawCourses.length === 0) {
      return NextResponse.json(
        { error: "No course data found to import" },
        { status: 400 }
      );
    }

    // Fetch existing course code & department pairs to prevent unique constraint conflicts
    const existingCourses = await prisma.course.findMany({
      select: { courseCode: true, department: true },
    });
    const existingPairSet = new Set(
      existingCourses.map((c) => `${c.courseCode.toUpperCase()}|${c.department.toLowerCase()}`)
    );
    const seenInBatchSet = new Set<string>();

    const toCreate: {
      courseCode: string;
      courseName: string;
      creditHours: number;
      department: string;
      semester: number;
      shift: string;
    }[] = [];

    const skipped: { row: number; courseCode?: string; reason: string }[] = [];

    for (let idx = 0; idx < rawCourses.length; idx++) {
      const item = rawCourses[idx];
      const row = item.rowNum ?? idx + 1;
      const codeUpper = (item.courseCode || "").trim().toUpperCase();

      if (!item.courseCode || !item.courseName || !item.department) {
        skipped.push({ row, courseCode: item.courseCode, reason: "Missing required text field(s)" });
        continue;
      }

      if (!Number.isInteger(item.creditHours) || item.creditHours < 1 || item.creditHours > 6) {
        skipped.push({ row, courseCode: item.courseCode, reason: "Credit hours must be an integer between 1 and 6" });
        continue;
      }

      if (!Number.isInteger(item.semester) || item.semester < 1 || item.semester > 8) {
        skipped.push({ row, courseCode: item.courseCode, reason: "Semester must be an integer between 1 and 8" });
        continue;
      }

      const validDept = DEPARTMENTS.find(
        (d) => d.toLowerCase() === item.department.trim().toLowerCase()
      );
      if (!validDept) {
        skipped.push({
          row,
          courseCode: item.courseCode,
          reason: `Invalid department '${item.department}'. Allowed: ${DEPARTMENTS.join(", ")}`,
        });
        continue;
      }

      const pairKey = `${codeUpper}|${validDept.toLowerCase()}`;

      if (existingPairSet.has(pairKey)) {
        skipped.push({
          row,
          courseCode: item.courseCode,
          reason: `Course code '${item.courseCode}' already exists in department '${validDept}'`,
        });
        continue;
      }

      if (seenInBatchSet.has(pairKey)) {
        skipped.push({
          row,
          courseCode: item.courseCode,
          reason: `Duplicate course code '${item.courseCode}' in department '${validDept}' in upload batch`,
        });
        continue;
      }

      seenInBatchSet.add(pairKey);

      toCreate.push({
        courseCode: item.courseCode.trim().toUpperCase(),
        courseName: item.courseName.trim(),
        creditHours: item.creditHours,
        department: validDept,
        semester: item.semester,
        shift: item.shift && item.shift.toLowerCase() === "evening" ? "Evening" : "Morning",
      });
    }

    if (toCreate.length === 0) {
      return NextResponse.json(
        { error: "No valid courses could be imported", skipped },
        { status: 422 }
      );
    }

    // Perform bulk create
    await prisma.course.createMany({
      data: toCreate,
    });

    // Create Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          action: "CREATED",
          entity: "Course",
          entityId: "BULK_IMPORT",
          description: `Bulk imported ${toCreate.length} courses (${skipped.length} skipped)`,
        },
      });
    } catch {
      /* audit log optional fallback */
    }

    return NextResponse.json({
      imported: toCreate.length,
      skipped,
    });
  } catch (error) {
    console.error("[POST /api/courses/import] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Parses a single CSV row handling quotes and commas
 */
function parseCSVRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cells.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }

  cells.push(current);
  return cells;
}
