-- جدول أكواد التفعيل المجانية للدورات
-- تشغيله مرة واحدة من لوحة Neon: SQL Editor

CREATE TABLE IF NOT EXISTS "ActivationCode" (
  id               TEXT PRIMARY KEY,
  course_id        TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  code             TEXT NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at          TIMESTAMPTZ,
  used_by_user_id  TEXT REFERENCES "User"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ActivationCode_course_id_idx" ON "ActivationCode"(course_id);
CREATE INDEX IF NOT EXISTS "ActivationCode_code_idx" ON "ActivationCode"(code);
CREATE INDEX IF NOT EXISTS "ActivationCode_created_at_idx" ON "ActivationCode"(created_at);
