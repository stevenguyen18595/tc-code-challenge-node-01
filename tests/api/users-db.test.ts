import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { disconnectTestDB, setupTestDB, loadRoute } from "../setup";
import { NextRequest } from "next/server";

let GET: (req?: NextRequest) => Promise<Response>;

describe("/api/users (In-Memory DB)", () => {
  beforeEach(async () => {
    await setupTestDB();
    const routes = await loadRoute("../../app/api/users/route");
    GET = routes.GET!;
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  describe("GET /api/users", () => {
    it("should return all users with their bills", async () => {
      const response = await GET();
      const users = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);

      const firstUser = users[0];
      expect(firstUser).toHaveProperty("id");
      expect(firstUser).toHaveProperty("name");
      expect(firstUser).toHaveProperty("email");
      expect(firstUser).toHaveProperty("createdAt");
      expect(firstUser).toHaveProperty("updatedAt");

      // bills relation should be an array
      expect(Array.isArray(firstUser.bills)).toBe(true);
      if (firstUser.bills.length > 0) {
        const b = firstUser.bills[0];
        expect(b).toHaveProperty("id");
        expect(b).toHaveProperty("billReference");
        expect(b).toHaveProperty("billDate");
      }
    });

    it("should return users ordered by createdAt desc", async () => {
      const response = await GET();
      const users = await response.json();

      expect(response.status).toBe(200);
      expect(users.length).toBeGreaterThan(1);

      for (let i = 0; i < users.length - 1; i++) {
        const current = new Date(users[i].createdAt);
        const next = new Date(users[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it("should include bill details for each user", async () => {
      const response = await GET();
      const users = await response.json();

      expect(response.status).toBe(200);

      for (const u of users) {
        expect(u).toHaveProperty("bills");
        expect(Array.isArray(u.bills)).toBe(true);
        for (const bill of u.bills) {
          expect(bill).toHaveProperty("id");
          expect(bill).toHaveProperty("billReference");
          expect(bill).toHaveProperty("billStageId");
          expect(bill.billStageId).toBeTruthy();
        }
      }
    });

    it("should have correct bill assignment relationships", async () => {
      const response = await GET();
      const users = await response.json();

      for (const u of users) {
        for (const bill of u.bills) {
          // each bill in the user's bills array should reference that user as assignedToId
          expect(bill.assignedToId).toBe(u.id);
        }
      }
    });
  });
});
