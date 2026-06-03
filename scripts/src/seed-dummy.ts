import { db, usersTable, coursesTable, sectionsTable, lessonsTable, webinarsTable, enrollmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seedDummyData() {
  console.log("🌱 Inserting dummy data...");

  // Get users to attach data to
  const instructors = await db.select().from(usersTable).where(eq(usersTable.role, "instructor"));
  const students = await db.select().from(usersTable).where(eq(usersTable.role, "student"));

  if (instructors.length === 0 || students.length === 0) {
    console.error("❌ Need at least one instructor and one student in the database to seed dummy data.");
    process.exit(1);
  }

  const instructorId = instructors[0].id;
  const studentId = students[0].id;

  // Insert a Published Course
  const [course1] = await db.insert(coursesTable).values({
    title: "Mastering UPSC Indian Polity",
    slug: "mastering-upsc-indian-polity-" + Date.now(),
    description: "A comprehensive guide to Indian Polity for UPSC CSE.",
    longDescription: "This course covers all aspects of Indian Polity, from the Constitution to governance, specifically designed for UPSC aspirants.",
    courseType: "recorded",
    price: "4999.00",
    status: "published",
    instructorId,
    thumbnailUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73",
  }).returning();

  // Insert a Draft Course
  await db.insert(coursesTable).values({
    title: "UPSC Modern History (Draft)",
    slug: "upsc-modern-history-draft-" + Date.now(),
    description: "Draft course for modern history.",
    courseType: "recorded",
    status: "draft",
    instructorId,
  });

  // Add Sections to the Published Course
  const [section1] = await db.insert(sectionsTable).values({
    courseId: course1.id,
    title: "Module 1: Making of the Constitution",
    order: 1,
  }).returning();

  const [section2] = await db.insert(sectionsTable).values({
    courseId: course1.id,
    title: "Module 2: Fundamental Rights",
    order: 2,
  }).returning();

  // Add Lessons
  await db.insert(lessonsTable).values([
    {
      sectionId: section1.id,
      title: "Historical Background",
      type: "text",
      content: "This lesson covers the historical underpinnings of the Indian Constitution, starting from the Regulating Act of 1773.",
      order: 1,
      isFree: true,
      durationMinutes: 15,
    },
    {
      sectionId: section1.id,
      title: "Drafting Committee",
      type: "video",
      videoUrl: "https://www.loom.com/share/placeholder123",
      order: 2,
      isFree: false,
      durationMinutes: 45,
    },
    {
      sectionId: section2.id,
      title: "Article 12-35 Overview",
      type: "text",
      content: "Deep dive into Part III of the Constitution.",
      order: 1,
      isFree: false,
      durationMinutes: 30,
    }
  ]);

  // Insert a Webinar
  await db.insert(webinarsTable).values({
    title: "Live Q&A: Mains Answer Writing",
    description: "Join us for a live session on how to structure your Mains answers.",
    zoomUrl: "https://zoom.us/j/123456789",
    scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    durationMinutes: 60,
    status: "upcoming",
  });

  // Enroll the student in the course
  await db.insert(enrollmentsTable).values({
    userId: studentId,
    courseId: course1.id,
    status: "active",
    enrolledAt: new Date(),
  });

  console.log("✨ Dummy data inserted successfully!");
  process.exit(0);
}

seedDummyData().catch(console.error);
