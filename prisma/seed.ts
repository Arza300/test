import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // مستخدمون تجريبيون (غيّر كلمة المرور في الإنتاج)
  const adminPassword = await hash("admin123", 12);
  const assistantPassword = await hash("assistant123", 12);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: adminPassword,
      name: "مدير المنصة",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "assistant@example.com" },
    update: {},
    create: {
      email: "assistant@example.com",
      password: assistantPassword,
      name: "مساعد المدير",
      role: "ASSISTANT_ADMIN",
    },
  });

  // تصنيفات تجريبية
  const cat1 = await prisma.category.upsert({
    where: { slug: "programming" },
    update: {},
    create: {
      name: "Programming",
      nameAr: "البرمجة",
      slug: "programming",
      description: "دورات البرمجة وتطوير البرمجيات",
      order: 1,
    },
  });

  const cat2 = await prisma.category.upsert({
    where: { slug: "design" },
    update: {},
    create: {
      name: "Design",
      nameAr: "التصميم",
      slug: "design",
      description: "التصميم الجرافيكي والواجهات",
      order: 2,
    },
  });

  // دورة تجريبية
  const course = await prisma.course.upsert({
    where: { slug: "nextjs-basics" },
    update: {},
    create: {
      title: "Next.js من الصفر",
      titleAr: "Next.js من الصفر",
      slug: "nextjs-basics",
      description: "تعلم بناء تطبيقات ويب حديثة باستخدام Next.js و React. نغطي التوجيه، جلب البيانات، والـ API Routes.",
      shortDesc: "تعلم Next.js و React خطوة بخطوة",
      duration: "4 أسابيع",
      level: "beginner",
      isPublished: true,
      order: 1,
      categoryId: cat1.id,
    },
  });

  await prisma.lesson.upsert({
    where: { courseId_slug: { courseId: course.id, slug: "intro-nextjs" } },
    update: {},
    create: {
      title: "مقدمة إلى Next.js",
      titleAr: "مقدمة إلى Next.js",
      slug: "intro-nextjs",
      content: "نظرة عامة على الإطار وكيفية إعداد المشروع.",
      duration: 15,
      order: 1,
      courseId: course.id,
    },
  });

  await prisma.lesson.upsert({
    where: { courseId_slug: { courseId: course.id, slug: "routing" } },
    update: {},
    create: {
      title: "التوجيه (Routing)",
      titleAr: "التوجيه",
      slug: "routing",
      content: "App Router وملفات التوجيه الديناميكي.",
      duration: 20,
      order: 2,
      courseId: course.id,
    },
  });

  console.log("Seed completed:", { cat1, cat2, course });
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
