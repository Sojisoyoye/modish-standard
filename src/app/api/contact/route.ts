import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const contactSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  phone: z
    .string()
    .regex(
      /^(\+?234|0)[789][01]\d{8}$/,
      "Please enter a valid Nigerian phone number (e.g. 08012345678)"
    ),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be less than 1000 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          fieldErrors[field] = issue.message;
        }
      }

      return NextResponse.json(
        { error: "Validation failed", errors: fieldErrors },
        { status: 400 }
      );
    }

    const { name, message } = result.data;
    const whatsappUrl = buildWhatsAppUrl();
    const whatsappWithMessage = `${whatsappUrl}&text=${encodeURIComponent(
      `Hi, I'm ${name}. ${message}`
    )}`;

    return NextResponse.json({
      success: true,
      whatsappUrl: whatsappWithMessage,
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
