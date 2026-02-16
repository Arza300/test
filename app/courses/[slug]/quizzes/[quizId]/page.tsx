import { QuizPageClient } from "./QuizPageClient";

type Props = { params: Promise<{ slug: string; quizId: string }> };

/**
 * صفحة الاختبار — تعتمد على معرّف الاختبار فقط.
 * جلب البيانات يتم من العميل عبر /api/quizzes/[quizId] ليعمل بشكل موثوق على Vercel مع Neon.
 */
export default async function QuizPage({ params }: Props) {
  const { quizId } = await params;
  return <QuizPageClient quizId={quizId} />;
}
