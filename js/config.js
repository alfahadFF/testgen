/* ─────────────────────────────────────────────────────────────────
   إعداد واحد فقط — مفتاح Supabase العام (anon / publishable)
   ─────────────────────────────────────────────────────────────────
   بدونه: القوالب تُحفظ في متصفحك فقط.
   بوجوده: القوالب تُحفظ في قاعدة البيانات وتُفتح من أي جهاز.

   من أين تجلبه؟
   supabase.com → مشروعك → Settings → API Keys → anon / public
   انسخ الرابط والمفتاح والصقهما بين علامتي التنصيص أدناه.

   ⚠️ هذا المفتاح "عام" ومصمَّم ليكون داخل صفحات الويب.
      لا تضع هنا كلمة مرور القاعدة أبداً.
   ───────────────────────────────────────────────────────────────── */
window.SCOR_SUPABASE = Object.assign(
  { url: 'https://gvbogfyfmkohepmukqmw.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Ym9nZnlmbWtvaGVwbXVrcW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxODU3NDksImV4cCI6MjEwNzc2MTc0OX0.A-84w91IS7XZbNlWRRBdXCpoMJFgcfGP8LKYdJqSNV0' },   // ← تم الملء
  window.SCOR_SUPABASE || {}     // أو اتركهما لطريقة الحقن الخارجية
);

window.SCOR_API_BASE = '';
