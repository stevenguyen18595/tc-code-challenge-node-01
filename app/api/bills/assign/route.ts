import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId, billId } = await request.json();

    // Basic validation
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bills: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user already has 3 or more bills
    if (user.bills.length >= 3) {
      return NextResponse.json(
        {
          error: `User ${user.name} already has ${user.bills.length} bills assigned. Maximum is 3.`,
        },
        { status: 400 },
      );
    }

    let targetBillId: string;

    if (billId) {
      // Specific bill provided
      targetBillId = billId;
    } else {
      // Auto-assign the oldest unassigned bill in "Submitted" stage. Also, need to check if this AC is met.
      const submittedStage = await prisma.billStage.findFirst({
        where: { label: "Submitted" },
      });

      if (!submittedStage) {
        return NextResponse.json(
          { error: "No 'Submitted' stage found" },
          { status: 400 },
        );
      }

      const unassignedBill = await prisma.bill.findFirst({
        where: {
          OR: [{ assignedToId: null }, { assignedToId: "" }],
          billStageId: submittedStage.id,
        },
        orderBy: { createdAt: "asc" },
      });

      if (!unassignedBill) {
        return NextResponse.json(
          { error: "No unassigned bills available to assign" },
          { status: 404 },
        );
      }

      targetBillId = unassignedBill.id;
    }

    // Verify the bill is unassigned and in submitted stage
    const billToAssign = await prisma.bill.findUnique({
      where: { id: targetBillId },
      include: {
        billStage: {
          select: { label: true },
        },
      },
    });

    if (!billToAssign) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (billToAssign.assignedToId != null) {
      return NextResponse.json(
        { error: "Bill is already assigned to another user" },
        { status: 400 },
      );
    }

    if (billToAssign.billStage.label !== "Submitted") {
      return NextResponse.json(
        { error: "Bill is not in 'Submitted' stage and cannot be assigned" },
        { status: 400 },
      );
    }

    // Assign the bill to the user
    const updatedBill = await prisma.bill.update({
      where: { id: targetBillId },
      data: { assignedToId: userId },
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

    return NextResponse.json(
      {
        message: `Successfully assigned bill ${updatedBill.billReference} to ${user.name}`,
        assignedBill: updatedBill,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error assigning bills:", error);
    return NextResponse.json(
      { error: "Failed to assign bills" },
      { status: 500 },
    );
  }
}
