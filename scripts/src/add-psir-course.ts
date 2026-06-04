import { db, usersTable, coursesTable, sectionsTable, lessonsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addCourse() {
  console.log("Reading PSIR course data JSON...");
  const jsonPath = path.resolve(__dirname, "./psir-data.json");
  const courseData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  console.log("Finding an instructor or owner to assign to the course...");
  const [instructor] = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.role, "instructor"), eq(usersTable.role, "owner")))
    .limit(1);

  if (!instructor) {
    console.error("❌ ERROR: No instructor or owner found in the database. Please register/seed an account first.");
    process.exit(1);
  }

  console.log(`Assigning course to: ${instructor.name} (${instructor.role})`);

  // Auto-generate slug
  const slug = "psir-lecture-plan-" + Date.now();

  console.log("Inserting course...");
  const [insertedCourse] = await db
    .insert(coursesTable)
    .values({
      title: courseData.title,
      slug,
      description: courseData.description,
      longDescription: courseData.description + "\n\nThis course is fully structured according to the standard UPSC syllabus, covering Political Theory, Indian Politics, and Indian Government.",
      courseType: "recorded",
      status: "published",
      instructorId: instructor.id,
      price: "0.00",
    })
    .returning();

  console.log(`✅ Course inserted! ID: ${insertedCourse.id}`);

  for (const mod of courseData.modules) {
    console.log(`Inserting module: ${mod.title}...`);
    const [insertedSection] = await db
      .insert(sectionsTable)
      .values({
        courseId: insertedCourse.id,
        title: mod.title,
        order: mod.order,
      })
      .returning();

    console.log(`Inserting ${mod.lessons.length} lessons into module: ${mod.title}...`);
    
    // Batch insert lessons
    const lessonsToInsert = mod.lessons.map((lesson: any) => ({
      sectionId: insertedSection.id,
      title: lesson.title,
      type: "text" as const,
      content: `## ${lesson.title}\n\nWelcome to the lecture topic: **${lesson.title.replace(/^Lecture \d+:\s*/, "")}**.\n\nThis is a standard recorded lesson for the PSIR course. In this lecture, we cover key concepts, UPSC mains requirements, and previous year questions.`,
      durationMinutes: lesson.durationMinutes,
      order: lesson.order,
      isFree: lesson.order === 1, // Make first lecture free preview
    }));

    // Chunk batch insert to prevent any Postgres parameter limit issues
    const chunkSize = 20;
    for (let i = 0; i < lessonsToInsert.length; i += chunkSize) {
      const chunk = lessonsToInsert.slice(i, i + chunkSize);
      await db.insert(lessonsTable).values(chunk);
    }
    console.log(`✅ Lessons inserted for ${mod.title}`);
  }

  console.log("\n✨ PSIR Course added successfully to the database!");
  process.exit(0);
}

addCourse().catch((err) => {
  console.error("❌ ERROR adding course:", err);
  process.exit(1);
});
