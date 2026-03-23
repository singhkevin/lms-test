import { db, usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

const testUsers = [
  {
    name: "Admin Owner",
    email: "owner@test.com",
    password: "password123",
    role: "owner" as const,
  },
  {
    name: "Test Instructor",
    email: "instructor@test.com",
    password: "password123",
    role: "instructor" as const,
  },
  {
    name: "Test Student",
    email: "student@test.com",
    password: "password123",
    role: "student" as const,
  },
];

console.log("🌱 Seeding test accounts...\n");

for (const u of testUsers) {
  const passwordHash = await bcrypt.hash(u.password, 12);
  await db
    .insert(usersTable)
    .values({ name: u.name, email: u.email, passwordHash, role: u.role })
    .onConflictDoUpdate({
      target: usersTable.email,
      set: { passwordHash, name: u.name, role: u.role },
    });
  console.log(`✅  ${u.role.padEnd(12)} | ${u.email} | password: ${u.password}`);
}

console.log("\n✨ Done! Use the credentials above to log in.");
process.exit(0);
