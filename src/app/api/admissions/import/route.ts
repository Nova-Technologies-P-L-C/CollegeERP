import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

/**
 * POST /api/admissions/import
 *
 * Accepts a multipart/form-data request with a single "file" field containing
 * a UTF-8 CSV file. The first row must be a header row with (at minimum) these
 * column names (case-insensitive):
 *
 *   studentName, email, phone, appliedDepartment,
 *   fatherName, cnic, previousInstitution, marksObtained, totalMarks
 *
 * Rows that are missing required fields or contain invalid numeric values are
 * skipped and reported in the response.
 *
 * Requires ADMIN role.
 */
export async function POST(request: NextRequest) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
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

    // Parse header row — normalise to lowercase for case-insensitive matching
    const headers = parseCSVRow(lines[0]).map((h) => h.toLowerCase().trim());

    const col = (name: string): number => headers.indexOf(name);

    const REQUIRED_COLUMNS = [
      "studentname",
      "email",
      "phone",
      "applieddepartment",
      "fathername",
      "cnic",
      "previousinstitution",
      "marksobtained",
      "totalmarks",
    ] as const;

    const missingCols = REQUIRED_COLUMNS.filter((c) => col(c) === -1);
    if (missingCols.length > 0) {
      return NextResponse.json(
        {
          error: `CSV is missing required column(s): ${missingCols.join(", ")}. Expected headers: studentName, email, phone, appliedDepartment, fatherName, cnic, previousInstitution, marksObtained, totalMarks`,
        },
        { status: 400 }
      );
    }

    type AdmissionData = {
      studentName: string;
      email: string;
      phone: string;
      appliedDepartment: string;
      fatherName: string;
      cnic: string;
      previousInstitution: string;
      marksObtained: number;
      totalMarks: number;
    };

    const toCreate: AdmissionData[] = [];
    const skipped: { row: number; reason: string }[] = [];

    const validateMarks = (marksObtained: number, totalMarks: number): string | null => {
      if (!Number.isFinite(marksObtained) || marksObtained < 0) {
        return "marksObtained must be a non-negative number";
      }
      if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
        return "totalMarks must be greater than 0";
      }
      if (marksObtained > totalMarks) {
        return "marksObtained cannot exceed totalMarks";
      }
      return null;
    };

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVRow(lines[i]);
      const get = (name: string) => (cells[col(name)] ?? "").trim();

      const studentName = get("studentname");
      const email = get("email");
      const phone = get("phone");
      const appliedDepartment = get("applieddepartment");
      const fatherName = get("fathername");
      const cnic = get("cnic");
      const previousInstitution = get("previousinstitution");
      const marksObtainedRaw = get("marksobtained");
      const totalMarksRaw = get("totalmarks");

      if (
        !studentName ||
        !email ||
        !phone ||
        !appliedDepartment ||
        !fatherName ||
        !cnic ||
        !previousInstitution
      ) {
        skipped.push({ row: i + 1, reason: "Missing required text field(s)" });
        continue;
      }

      const marksObtained = Number(marksObtainedRaw);
      const totalMarks = Number(totalMarksRaw);
      const marksError = validateMarks(marksObtained, totalMarks);
      if (marksError) {
        skipped.push({ row: i + 1, reason: marksError });
        continue;
      }

      toCreate.push({
        studentName,
        email,
        phone,
        appliedDepartment,
        fatherName,
        cnic,
        previousInstitution,
        marksObtained,
        totalMarks,
      });
    }

    if (toCreate.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in CSV", skipped },
        { status: 422 }
      );
    }

    await prisma.admission.createMany({ data: toCreate });

    return NextResponse.json({ imported: toCreate.length, skipped });
  } catch (error) {
    console.error("[POST /api/admissions/import] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Parses a single CSV row, handling double-quoted fields that may contain
 * commas or escaped quotes ("").
 *
 * State machine:
 *  - `inQuotes` tracks whether we are inside a quoted field.
 *  - On encountering `"` outside quotes: enter quoted mode.
 *  - On encountering `"` inside quotes: check the next character.
 *      - If the next char is also `"`, it's an escaped quote — emit one `"` and
 *        advance the index past the second `"`.
 *      - Otherwise, exit quoted mode (closing quote).
 *  - On encountering `,` outside quotes: delimiter — push current cell and reset.
 *  - Any other character: append to the current cell.
 * After the loop, the last (or only) cell is pushed.
 */
function parseCSVRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ("")
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
