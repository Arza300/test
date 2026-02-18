/**
 * أنواع البيانات المطابقة لجداول Neon (بدون Prisma)
 */

export type UserRole = "ADMIN" | "ASSISTANT_ADMIN" | "STUDENT";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  balance: string;
  student_number?: string | null;
  guardian_number?: string | null;
  current_session_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  description: string | null;
  image_url: string | null;
  order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Review {
  id: string;
  text: string;
  authorName: string;
  authorTitle: string | null;
  avatarLetter: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/** مفتاح لون خلفية الهيرو (وراء صورة المدرس) — قيم صالحة: navy | indigo | purple | teal | forest | slate */
export type HeroBgPreset = "navy" | "indigo" | "purple" | "teal" | "forest" | "slate";

export interface HomepageSetting {
  teacherImageUrl: string | null;
  heroTitle: string | null;
  heroSlogan: string | null;
  platformName: string | null;
  whatsappUrl: string | null;
  facebookUrl: string | null;
  pageTitle: string | null;
  heroBgPreset: HeroBgPreset | string | null;
  /** عنوان الفوتر (مثلاً: منصتي التعليمية) */
  footerTitle: string | null;
  /** وصف قصير تحت العنوان (مثلاً: تعلم بأسلوب حديث...) */
  footerTagline: string | null;
  /** نص حقوق النشر — يظهر بعد © والسنة (السنة تُضاف تلقائياً) */
  footerCopyright: string | null;
}

export interface Course {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  description: string;
  short_desc: string | null;
  image_url: string | null;
  price: string;
  duration: string | null;
  level: string | null;
  is_published: boolean;
  order: number;
  category_id: string | null;
  created_by_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Lesson {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  content: string | null;
  video_url: string | null;
  pdf_url: string | null;
  duration: number | null;
  order: number;
  course_id: string;
  created_at: Date;
  updated_at: Date;
}

export type QuestionType = "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE";

export interface Quiz {
  id: string;
  title: string;
  course_id: string;
  order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Question {
  id: string;
  type: QuestionType;
  question_text: string;
  order: number;
  quiz_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
  question_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: Date;
}

export type LiveStreamProvider = "zoom" | "google_meet";

export interface LiveStream {
  id: string;
  course_id: string;
  title: string;
  title_ar: string | null;
  provider: LiveStreamProvider;
  meeting_url: string;
  meeting_id: string | null;
  meeting_password: string | null;
  scheduled_at: Date;
  description: string | null;
  order: number;
  created_at: Date;
  updated_at: Date;
}

// ----- أشكال للواجهة (camelCase) كما يتوقعها التطبيق -----
export interface CourseApp {
  id: string;
  title: string;
  titleAr?: string | null;
  slug: string;
  description?: string;
  shortDesc?: string | null;
  imageUrl?: string | null;
  price?: number | string;
  isPublished?: boolean;
  order?: number;
  categoryId?: string | null;
  createdById?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  category?: { id: string; name: string; nameAr?: string | null; slug: string } | null;
}

export interface LessonApp {
  id: string;
  title: string;
  titleAr?: string | null;
  slug: string;
  content?: string | null;
  videoUrl?: string | null;
  pdfUrl?: string | null;
  duration?: number | null;
  order: number;
  courseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuizApp {
  id: string;
  title: string;
  courseId: string;
  order: number;
  questions?: (QuestionApp & { options: QuestionOptionApp[] })[];
}

export interface QuestionApp {
  id: string;
  type: QuestionType;
  questionText: string;
  order: number;
  quizId: string;
  options?: QuestionOptionApp[];
}

export interface QuestionOptionApp {
  id: string;
  text: string;
  isCorrect: boolean;
  questionId: string;
}
