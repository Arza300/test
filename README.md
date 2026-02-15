# منصتي التعليمية

منصة تعليمية مبنية بـ **Next.js** و **Prisma**، جاهزة للنشر على **Vercel**.

## التقنيات

- **Next.js 16** (App Router)
- **Prisma** مع PostgreSQL
- **Tailwind CSS 4**
- **TypeScript**

## التشغيل محلياً

1. تثبيت الحزم:
   ```bash
   npm install
   ```

2. إعداد قاعدة البيانات:
   - أنشئ ملف `.env` وضَع فيه:
     ```
     DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
     ```
   - يمكنك استخدام [Vercel Postgres](https://vercel.com/storage/postgres) أو [Neon](https://neon.tech) أو [Supabase](https://supabase.com).

3. تطبيق الـ schema وإنشاء الجداول:
   ```bash
   npm run db:push
   ```

4. (اختياري) إدخال بيانات تجريبية:
   ```bash
   npm run db:seed
   ```

5. تشغيل المشروع:
   ```bash
   npm dev
   ```

افتح [http://localhost:3000](http://localhost:3000).

## النشر على Vercel

1. ارفع المشروع إلى GitHub وربطه بمشروع جديد في [Vercel](https://vercel.com).
2. أضف متغير البيئة `DATABASE_URL` في إعدادات المشروع (Vercel → Project → Settings → Environment Variables).
3. إذا استخدمت Vercel Postgres، انسخ رابط الاتصال من لوحة التخزين وألصقه في `DATABASE_URL`.
4. عند كل نشر، سيتم تشغيل `postinstall` (prisma generate) تلقائياً.

لا تحتاج إلى تشغيل `db:push` أو `db:seed` على السيرفر يدوياً إن كنت تستخدم نفس قاعدة البيانات؛ نفّذها مرة واحدة من جهازك بعد ربط `.env` بـ DATABASE_URL.

## أوامر مفيدة

| الأمر | الوصف |
|--------|--------|
| `npm run dev` | تشغيل وضع التطوير |
| `npm run build` | بناء المشروع للإنتاج |
| `npm run db:generate` | توليد Prisma Client |
| `npm run db:push` | مزامنة الـ schema مع قاعدة البيانات |
| `npm run db:seed` | إدخال البيانات التجريبية |

## هيكل المشروع

- `app/` — صفحات وواجهات API (App Router)
- `components/` — مكونات الواجهة
- `lib/db.ts` — عميل Prisma (Singleton)
- `prisma/schema.prisma` — نموذج البيانات
- `prisma/seed.ts` — سكربت البذرة

## التصميم

- واجهة حديثة مع دعم الوضع الفاتح والداكن
- دعم كامل للعربية (RTL)
- ألوان هادئة ومناسبة للتعلم (أخضر مزرق/teal)
- متجاوب مع الجوال وسهل التصفح
"# test" 
