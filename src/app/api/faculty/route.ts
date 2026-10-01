import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const faculty = await prisma.faculty.findMany({
      include: {
        user: { select: { name: true, email: true } },
        teaches: { select: { id: true, courseCode: true, courseName: true } },
      },
    });

    const result = faculty.map((f) => ({
      id: f.id,
      userId: f.userId,
      user: { name: f.user.name, email: f.user.email },
      phone: f.phone,
      department: f.department,
      specialization: f.specialization,
      joinDate: f.joinDate.toISOString(),
      avatar: f.avatar,
      teaches: f.teaches,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/faculty error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      userId: string;
      phone?: string;
      department: string;
      specialization: string;
    };

    // Load authenticated user
    const authUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, id: true },
    });

    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify authorization: admin OR user creating their own record
    const isAdmin = authUser.role === "ADMIN";
    const isSelfCreation = authUser.id === body.userId;

    if (!isAdmin && !isSelfCreation) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.role?.toUpperCase() !== "FACULTY")
      return NextResponse.json({ error: "User is not a FACULTY" }, { status: 400 });

    const faculty = await prisma.faculty.create({
      data: {
        userId: body.userId,
        phone: body.phone,
        department: body.department,
        specialization: body.specialization,
      },
    });

    return NextResponse.json(faculty, { status: 201 });
  } catch (error) {
    console.error("POST /api/faculty error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}