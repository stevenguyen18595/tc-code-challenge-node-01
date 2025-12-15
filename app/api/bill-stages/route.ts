import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const billStages = await prisma.billStage.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(billStages);
  } catch (error) {
    console.error("Error fetching bill stages:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill stages" },
      { status: 500 },
    );
  }
}
