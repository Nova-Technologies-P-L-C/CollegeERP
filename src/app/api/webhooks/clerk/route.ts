import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET =
    process.env.CLERK_WEBHOOK_SIGNING_SECRET ||
    process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SIGNING_SECRET from Clerk Dashboard to .env or .env.local",
    );
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { email_addresses, first_name, last_name, public_metadata } =
      evt.data;

    const email = email_addresses[0]?.email_address;
    const name = [first_name, last_name].filter(Boolean).join(" ");

    // Default to STUDENT if no role is set or invalid
    let role: Role = Role.STUDENT;
    if (public_metadata && typeof public_metadata.role === "string") {
      const metadataRole = public_metadata.role.toUpperCase();
      if (
        metadataRole === "ADMIN" ||
        metadataRole === "FACULTY" ||
        metadataRole === "STUDENT"
      ) {
        role = metadataRole as Role;
      }
    }

    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { clerkId: id },
            { email: email }
          ]
        },
        include: { student: true }
      });

      if (existingUser) {
        if (existingUser.email === email && existingUser.clerkId && existingUser.clerkId !== id) {
          // Stale Clerk user recreated. Clean up stale student profile
          if (existingUser.student) {
            await prisma.student.delete({
              where: { id: existingUser.student.id }
            });
          }
          // Delete admission records for the user's email to reset their onboarding form status
          await prisma.admission.deleteMany({
            where: { email }
          });
        }

        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            clerkId: id!,
            email: email,
            name: name,
            role: role,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            clerkId: id!,
            email: email,
            name: name,
            role: role,
          },
        });
      }
      console.log(
        `User ${id} successfully synced to database with role ${role}.`,
      );
    } catch (error) {
      console.error("Error syncing user to database:", error);
      return new Response("Database Error", { status: 500 });
    }
  }

  if (eventType === "user.deleted") {
    try {
      await prisma.user.delete({
        where: { clerkId: id },
      });
      console.log(`User ${id} successfully deleted from database.`);
    } catch (error) {
      console.error("Error deleting user from database:", error);
      return new Response("Database Error", { status: 500 });
    }
  }

  return new Response("", { status: 200 });
}
