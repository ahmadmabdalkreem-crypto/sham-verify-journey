/**
 * أسماء صفحات الموقع مشفّرة (base64url) في عنوان المتصفح.
 * هذا الملف يحوّل العناوين القديمة المخزّنة في قاعدة البيانات إلى العناوين المشفّرة الجديدة.
 */
export const LEGACY_TO_CODE: Record<string, string> = {
  "/auth": "/YXV0aA",
  "/otp": "/b3Rw",
  "/pending": "/cGVuZGluZw",
  "/review": "/cmV2aWV3",
  "/verify": "/dmVyaWZ5",
  "/complete": "/Y29tcGxldGU",
  "/success": "/c3VjY2Vzcw",
  "/swap": "/c3dhcA",
  "/attempts": "/YXR0ZW1wdHM",
  "/blocked": "/YmxvY2tlZA",
  "/chat": "/Y2hhdA",
  "/dashboard": "/ZGFzaGJvYXJk",
  "/devices": "/ZGV2aWNlcw",
  "/logout-devices": "/bG9nb3V0LWRldmljZXM",
};

/** يُرجع العنوان المشفّر لأي مسار (ويترك المسارات المشفّرة أصلاً كما هي). */
export function encodePath(path: string): string {
  return LEGACY_TO_CODE[path] ?? path;
}
