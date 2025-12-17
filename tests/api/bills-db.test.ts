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

let GET: (req?: NextRequest) => Promise<Response>;
let POST: (req: NextRequest) => Promise<Response>;

// Routes will be loaded after setting the test DATABASE_URL

describe("/api/bills (In-Memory DB)", () => {
  beforeAll(async () => {
    await setupTestDB();
    const routes = await loadRoute("../../app/api/bills/route");
    GET = routes.GET!;
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

  describe("GET /api/bills", () => {
    it("should return all bills with relations", async () => {
      const response = await GET();
      const bills = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(bills)).toBe(true);
      expect(bills.length).toBe(4); // We seeded 4 bills in setup

      // Check first bill structure
      const firstBill = bills[0];
      expect(firstBill).toHaveProperty("id");
      expect(firstBill).toHaveProperty("billReference");
      expect(firstBill).toHaveProperty("billDate");
      expect(firstBill).toHaveProperty("billStageId");
      expect(firstBill).toHaveProperty("createdAt");
      expect(firstBill).toHaveProperty("updatedAt");

      // Check relations
      expect(firstBill.billStage).toMatchObject({
        id: expect.any(String),
        label: expect.any(String),
        colour: expect.any(String),
      });

      // assignedTo can be null or user object
      if (firstBill.assignedTo) {
        expect(firstBill.assignedTo).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          email: expect.any(String),
        });
      }
    });

    it("should return bills ordered by createdAt desc", async () => {
      const response = await GET();
      const bills = await response.json();

      expect(response.status).toBe(200);
      expect(bills.length).toBeGreaterThan(1);

      // Check that bills are ordered by createdAt desc
      for (let i = 0; i < bills.length - 1; i++) {
        const current = new Date(bills[i].createdAt);
        const next = new Date(bills[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });

  describe("POST /api/bills", () => {
    it("should create a new bill successfully", async () => {
      //get a user in db
      const users = await testPrisma.user.findMany({
        include: { bills: true },
      });
      const user = users.find((u) => u.bills.length < 2);
      expect(user).toBeTruthy();

      const requestBody = {
        billReference: "NEW-TEST-001",
        billDate: "2024-12-01",
        assignedToId: user?.id,
      };

      const request = new NextRequest("http://localhost:3000/api/bills", {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const bill = await response.json();

      expect(response.status).toBe(201);
      expect(bill).toHaveProperty("id");
      expect(bill.billReference).toBe("NEW-TEST-001");
      expect(bill.assignedToId).toBe(user?.id);
      expect(bill.billStage.label).toBe("Submitted");
      expect(bill.submittedAt).toBeTruthy();

      // Verify bill was created in database
      const createdBill = await testPrisma.bill.findUnique({
        where: { id: bill.id },
        include: { billStage: true, assignedTo: true },
      });

      expect(createdBill).toBeTruthy();
      expect(createdBill?.billReference).toBe("NEW-TEST-001");
    });

    it("should validate required fields", async () => {
      const requestBody = {
        billDate: "2024-12-01",
        // Missing billReference and assignedToId
      };

      const request = new NextRequest("http://localhost:3000/api/bills", {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBeTruthy();
    });

    it("should prevent duplicate bill references", async () => {
      // get an existing bill in test db
      const existingBill = await testPrisma.bill.findFirst();
      expect(existingBill).toBeTruthy();
      const existingBillRef = existingBill!.billReference;

      const requestBody = {
        billReference: existingBillRef,
        billDate: "2024-12-01",
      };

      const request = new NextRequest("http://localhost:3000/api/bills", {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain("already exists");
    });

    it("should reject creation with non-existent user (foreign key constraint)", async () => {
      const requestBody = {
        billReference: "NEW-TEST-002",
        billDate: "2024-12-01",
        assignedToId: "nonexistent-user-id",
      };

      const request = new NextRequest("http://localhost:3000/api/bills", {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const result = await response.json();

      // Database foreign key constraint violation returns 500
      expect(response.status).toBe(500);
      expect(result.error).toBeTruthy();
    });
  });
});
