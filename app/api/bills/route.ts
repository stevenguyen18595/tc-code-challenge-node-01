import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const bills = await prisma.bill.findMany({
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        billStage: {
          select: {
            id: true,
            label: true,
            colour: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(bills);
  } catch (error) {
    console.error("Error fetching bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { billReference, billDate, assignedToId } = await request.json();

    // Basic validation
    // Allow unassigned bills - need to check ACs
    if (!billReference || !billDate) {
      return NextResponse.json(
        { error: "Bill reference and bill date are required" },
        { status: 400 },
      );
    }

    // Check if billReference already exists
    const existingBill = await prisma.bill.findFirst({
      where: { billReference },
    });

    if (existingBill) {
      return NextResponse.json(
        { error: `Bill reference '${billReference}' already exists` },
        { status: 400 },
      );
    }

    //Assuming bill stage after submitting is defaulted to 'Submitted'
    const defaultStage = await prisma.billStage.findFirst({
      where: { label: "Submitted" },
    });

    if (!defaultStage) {
      return NextResponse.json(
        { error: "No bill stages found. Please create bill stages first." },
        { status: 400 },
      );
    }

    const bill = await prisma.bill.create({
      data: {
        billReference,
        billDate: new Date(billDate),
        assignedToId,
        billStageId: defaultStage.id,
        submittedAt: new Date(),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        billStage: {
          select: {
            id: true,
            label: true,
            colour: true,
          },
        },
      },
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error("Error creating bill:", error);
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 },
    );
  }
}
