import { PrismaClient } from "@prisma/client";
import { join } from "path";
import { execSync } from "child_process";

// Use a single shared test DB file for the whole test run. Tests are run
// sequentially in the current Vitest config so a shared DB that is reset
// between tests is sufficient and simpler on Windows.
const TEST_DB_PATH = join(process.cwd(), "prisma", `test.db`);

// Create a test-specific Prisma client with SQLite file
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${TEST_DB_PATH}`,
    },
  },
});

// Track whether we have pushed the schema for this process. When running
// tests we push once and then reset the data between tests.
let schemaPushed = false;

const billStageData = [
  { label: "Draft", colour: "#9CA3AF" },
  { label: "Submitted", colour: "#3B82F6" },
  { label: "Approved", colour: "#10B981" },
  { label: "Paying", colour: "#F59E0B" },
  { label: "On Hold", colour: "#EF4444" },
  { label: "Rejected", colour: "#DC2626" },
  { label: "Paid", colour: "#059669" },
];

const generateRandomUsers = (count: number) => {
  const firstNames = ["John", "Jane"];
  const lastNames = ["Wick", "Johnson"];
  // Generate all possible combinations
  const allCombinations = [];
  for (const firstName of firstNames) {
    for (const lastName of lastNames) {
      allCombinations.push({ firstName, lastName });
    }
  }

  // Shuffle the combinations to get random order
  for (let i = allCombinations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCombinations[i], allCombinations[j]] = [
      allCombinations[j],
      allCombinations[i],
    ];
  }

  // Take the first 'count' combinations to ensure uniqueness
  // We dont want more users than unique combinations so count needs to be capped
  const users = [];
  for (let i = 0; i < Math.min(count, allCombinations.length); i++) {
    const { firstName, lastName } = allCombinations[i];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;

    users.push({
      name: `${firstName} ${lastName}`,
      email: email,
    });
  }
  return users;
};

const generateRandomBills = (
  count: number,
  userIds: string[],
  billStageIds: string[],
) => {
  const bills = [];

  for (let i = 0; i < count; i++) {
    const billDate = new Date(
      Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
    ); // Random date within last year
    const billReference = `BILL-${String(i + 1).padStart(4, "0")}`;
    const randomStageIndex = Math.floor(Math.random() * billStageIds.length);
    let stageId = billStageIds[randomStageIndex];
    let assignedToId: string | null =
      userIds[Math.floor(Math.random() * userIds.length)];

    // this if for testing unassigned bills
    if (i == 1) {
      assignedToId = null;
      stageId = billStageIds[1]; //Submitted stage
    }

    // Generate stage-specific timestamps
    let submittedAt = null;
    let approvedAt = null;
    let onHoldAt = null;

    const stageName = billStageData[randomStageIndex].label;

    if (
      [
        "Submitted",
        "Approved",
        "Paying",
        "On Hold",
        "Rejected",
        "Paid",
      ].includes(stageName)
    ) {
      submittedAt = new Date(
        billDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000,
      ); // 0-7 days after bill date
    }

    if (["Approved", "Paying", "Paid"].includes(stageName)) {
      approvedAt = new Date(
        submittedAt!.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000,
      ); // 0-5 days after submission
    }

    if (stageName === "On Hold") {
      onHoldAt = new Date(
        submittedAt!.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000,
      ); // 0-10 days after submission
    }

    bills.push({
      billReference,
      billDate,
      submittedAt,
      approvedAt,
      onHoldAt,
      billStageId: stageId,
      assignedToId,
    });
  }

  return bills;
};

export async function setupTestDB() {
  // Push schema to create tables (only runs once per process)
  const maxRetries = 5;
  let lastError = null;
  if (!schemaPushed) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Increase timeout to allow Prisma more time to run migrations/reset
        const result = execSync(
          `npx prisma db push --skip-generate --force-reset`,
          {
            env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 120_000, // 2 minutes
          },
        );
        if (result) {
          try {
            console.log(
              "[test-setup] prisma db push result:",
              result.toString(),
            );
          } catch {}
        }
        console.log("[test-setup] prisma db push completed");

        schemaPushed = true;
        lastError = null;
        break;
      } catch (e: any) {
        lastError = e;
        console.error(
          `[test-setup] prisma db push failed (attempt ${attempt + 1}):`,
          e?.message || e,
        );
        // Print stdout/stderr when available for better diagnostics
        try {
          if (e?.stdout)
            console.error("[test-setup] prisma stdout:", e.stdout.toString());
        } catch {}
        try {
          if (e?.stderr)
            console.error("[test-setup] prisma stderr:", e.stderr.toString());
        } catch {}
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 500ms, 1000ms, 2000ms, ...
          await new Promise((res) =>
            setTimeout(res, 500 * Math.pow(2, attempt)),
          );
        }
      }
    }
    if (lastError) {
      throw lastError;
    }
  }
}

// Reset test DB by deleting records in the correct order.
export async function resetTestDB() {
  // Delete child tables first to avoid FK constraint issues.
  try {
    await testPrisma.bill.deleteMany();
    await testPrisma.user.deleteMany();
    await testPrisma.billStage.deleteMany();
  } catch (e) {
    // If tables don't exist yet, ignore the error — they will be created on first push
  }
}

export async function seedTestData() {
  console.log("Starting seed...");

  // Clear existing data
  await testPrisma.bill.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.billStage.deleteMany();
  // Seed bill stages
  console.log("Seeding bill stages...");
  await testPrisma.billStage.createMany({ data: billStageData });
  const createdBillStages = await testPrisma.billStage.findMany();
  console.log(`Created ${createdBillStages.length} bill stages`);

  // Seed users
  console.log("Seeding users...");
  const userData = generateRandomUsers(50);
  await testPrisma.user.createMany({ data: userData });
  const createdUsers = await testPrisma.user.findMany();
  console.log(`Created ${createdUsers.length} users`);

  // Seed bills
  console.log("Seeding bills...");
  const billData = generateRandomBills(
    4,
    createdUsers.map((u) => u.id),
    createdBillStages.map((bs) => bs.id),
  );
  // Use createMany for bulk insert; ensure related IDs exist
  await testPrisma.bill.createMany({ data: billData });
  const createdBills = await testPrisma.bill.findMany();
  console.log(`Created ${createdBills.length} bills`);

  console.log("Seeding completed successfully!");
}

export async function disconnectTestDB() {
  await testPrisma.$disconnect();
}

// Helper to expose the test database URL for tests that need to set DATABASE_URL
function getTestDbUrl() {
  return `file:${TEST_DB_PATH}`;
}

// Load a route module after ensuring the test DATABASE_URL is set.
// `relativePath` should be the module path used in tests, e.g. "../../app/api/users/route"
type RouteModule = {
  GET?: (req?: Request) => Promise<Response>;
  POST?: (req: Request) => Promise<Response>;
  // ...other HTTP methods if present
};
export async function loadRoute<T = RouteModule>(
  relativePath: string,
): Promise<T> {
  process.env.DATABASE_URL = getTestDbUrl();
  return (await import(relativePath)) as T;
}
