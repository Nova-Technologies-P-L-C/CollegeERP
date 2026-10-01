import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { errorResponse, handleApiError } from "@/lib/api-errors";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

export async function PATCH(request: NextRequest) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  const { userId: adminClerkId } = await auth();
  if (!adminClerkId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    const body = (await request.json()) as {
      requestId: string;
      status: "Approved" | "Rejected";
    };

    const { requestId, status } = body;

    if (!requestId || !status || !["Approved", "Rejected"].includes(status)) {
      return errorResponse("BAD_REQUEST", "Invalid approval request details", 400);
    }

    const onboardingRequest = await prisma.onboardingRequest.findUnique({
      where: { id: requestId },
    });

    if (!onboardingRequest) {
      return errorResponse("NOT_FOUND", "Onboarding request not found", 404);
    }

    if (onboardingRequest.status !== "Pending") {
      return errorResponse("BAD_REQUEST", "Request is already processed", 400);
    }

    let result;

    if (status === "Approved") {
      // Find the user by email
      const targetUser = await prisma.user.findUnique({
        where: { email: onboardingRequest.email },
      });

      if (!targetUser) {
        return errorResponse("NOT_FOUND", "User account not found in database", 404);
      }

      result = await prisma.$transaction(async (tx) => {
        // 1. Update request status to Approved
        const req = await tx.onboardingRequest.update({
          where: { id: requestId },
          data: { status: "Approved" },
        });

        // 2. Update User role
        await tx.user.update({
          where: { id: targetUser.id },
          data: { role: req.role },
        });

        // 3. Create the corresponding profile
        if (req.role === "FACULTY") {
          await tx.faculty.create({
            data: {
              userId: targetUser.id,
              phone: req.phone,
              department: req.department || "General",
              specialization: req.specialization || "General",
            },
          });
        } else if (req.role === "ADMIN") {
          await tx.admin.upsert({
            where: { userId: targetUser.id },
            update: {},
            create: {
              userId: targetUser.id,
            },
          });
        }

        return req;
      });

      // 4. Update role in Clerk publicMetadata
      if (targetUser.clerkId) {
        try {
          const client = await clerkClient();
          await client.users.updateUserMetadata(targetUser.clerkId, {
            publicMetadata: { role: onboardingRequest.role.toLowerCase() },
          });
        } catch (clerkErr) {
          console.error("Clerk role sync failed during onboarding approval:", clerkErr);
        }
      }

      const adminName = await getAdminName(adminClerkId);
      await logAuditAction({
        action: "UPDATED",
        entity: "User",
        entityId: targetUser.id,
        description: `Approved onboarding request for ${onboardingRequest.name} as ${onboardingRequest.role}`,
        adminClerkId,
        adminName,
      });
    } else {
      // Reject request
      result = await prisma.onboardingRequest.update({
        where: { id: requestId },
        data: { status: "Rejected" },
      });

      const adminName = await getAdminName(adminClerkId);
      await logAuditAction({
        action: "UPDATED",
        entity: "OnboardingRequest",
        entityId: requestId,
        description: `Rejected onboarding request for ${onboardingRequest.name}`,
        adminClerkId,
        adminName,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError("PATCH /api/onboarding/approve", error);
  }
}
