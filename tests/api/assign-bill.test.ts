import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest";
import {
  disconnectTestDB,
  setupTestDB,
  testPrisma,
  loadRoute,
  resetTestDB,
  seedTestData,
} from "../setup";
import { NextRequest } from "next/server";

let POST: (req: NextRequest) => Promise<Response>;

describe("/api/bills/assign (In-Memory DB)", () => {
  beforeAll(async () => {
    await setupTestDB();
    const routes = await loadRoute("../../app/api/bills/assign/route");
    POST = routes.POST!;
  });

  beforeEach(async () => {
    // Reset DB state and seed for a clean test run
    await resetTestDB();
    console.log("[test-setup] starting seedTestData...");
    await seedTestData();
    console.log("[test-setup] setupTestDB: finished");
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it("assigns a specific bill to a user by billId", async () => {
    const submittedStage = await testPrisma.billStage.findFirst({
      where: { label: "Submitted" },
    });

    expect(submittedStage).toBeTruthy();

    let unassignedBill = await testPrisma.bill.findFirst({
      where: {
        assignedToId: null,
        billStageId: submittedStage!.id,
      },
      orderBy: { createdAt: "asc" },
    });

    // If none exists (seed randomness), create one deterministically for the test
    if (!unassignedBill) {
      unassignedBill = await testPrisma.bill.create({
        data: {
          billReference: `TEST-UNASSIGNED-${Date.now()}`,
          billDate: new Date(),
          billStageId: submittedStage!.id,
          assignedToId: null,
        },
      });
    }

    // pick a user with fewer than 3 bills
    const user = (
      await testPrisma.user.findMany({ include: { bills: true } })
    ).find((u) => u.bills.length < 3);
    expect(user).toBeTruthy();

    const body = { userId: user!.id, billId: unassignedBill!.id };
    const req = new NextRequest("http://localhost/api/bills/assign", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.assignedBill).toBeTruthy();
    expect(json.assignedBill.assignedToId).toBe(user!.id);
  });

  it("returns 400 when userId is missing", async () => {
    const req = new NextRequest("http://localhost/api/bills/assign", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  it("returns 400 when billId is missing", async () => {
    const req = new NextRequest("http://localhost/api/bills/assign", {
      method: "POST",
      body: JSON.stringify({ userId: "some-user-id", billId: null }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  it("returns 404 when user not found", async () => {
    const req = new NextRequest("http://localhost/api/bills/assign", {
      method: "POST",
      body: JSON.stringify({ userId: "no-user", billId: 1 }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBeTruthy();
  });

  it("returns 400 when user already has 3 or more bills", async () => {
    // create a user and assign 3 bills to them
    const user = await testPrisma.user.create({
      data: { name: "Many", email: `many${Date.now()}@example.com` },
    });
    const submittedStage = await testPrisma.billStage.findFirst({
      where: { label: "Submitted" },
    });
    expect(submittedStage).toBeTruthy();

    // create 3 bills and assign
    for (let i = 0; i < 3; i++) {
      await testPrisma.bill.create({
        data: {
          billReference: `MANY-${i}-${Date.now()}`,
          billDate: new Date(),
          billStageId: submittedStage!.id,
          assignedToId: user.id,
        },
      });
    }

    const req = new NextRequest("http://localhost/api/bills/assign", {
      method: "POST",
      body: JSON.stringify({ userId: user.id }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  it("returns 400 when bill is already assigned", async () => {
    const user = (
      await testPrisma.user.findMany({ include: { bills: true } })
    )[0];
    const submittedStage = await testPrisma.billStage.findFirst({
      where: { label: "Submitted" },
    });
    // create a bill and assign it to someone else
    const other = await testPrisma.user.create({
      data: {
        name: `Other-${Date.now()}`,
        email: `other${Date.now()}@example.com`,
      },
    });
    const bill = await testPrisma.bill.create({
      data: {
        billReference: `ASSIGNED-${Date.now()}`,
        billDate: new Date(),
        billStageId: submittedStage!.id,
        assignedToId: other.id,
      },
    });

    const req = new NextRequest("http://localhost/api/bills/assign", {
      method: "POST",
      body: JSON.stringify({ userId: user.id, billId: bill.id }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  it("returns 400 when bill is not in Submitted stage", async () => {
    const user = (
      await testPrisma.user.findMany({ include: { bills: true } })
    )[0];
    // create a bill in Draft stage
    const draftStage = await testPrisma.billStage.findFirst({
      where: { label: "Draft" },
    });
    const bill = await testPrisma.bill.create({
      data: {
        billReference: `NOTSUB-${Date.now()}`,
        billDate: new Date(),
        billStageId: draftStage!.id,
      },
    });

    const req = new NextRequest("http://localhost/api/bills/assign", {
      method: "POST",
      body: JSON.stringify({ userId: user.id, billId: bill.id }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });
});
