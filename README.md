# Remix of تطبيق شام كاش

انشاء مشروع Act as an expert Full-Stack Developer and UI/UX Designer specializing in fintech applications. Design and build a fully responsive web application called "شام كاش - بوابة توثيق الحسابات" (Sham Cash Account Verification Portal) featuring an Arabic RTL layout. 



Design System & Theme:

- Primary Color: Deep Forest Green (#0A5C36 or similar rich fintech green) paired with clean white and soft neutral gray backgrounds.

- Typography: Modern Arabic font (Cairo or Tajawal), clean card layouts with soft shadows, rounded corners, and intuitive badge states.

- Layout: Fully responsive (Mobile-first design) supporting both user-facing portals and admin dashboards.



Core Pages and Sections to Implement:



1. Landing / Home Page (الرئيسية):

- Hero section with a welcoming headline ("بوابة توثيق حسابات شام كاش"), a supportive subtitle, and prominent Call-to-Action buttons ("تقديم طلب توثيق جديد", "متابعة طلب قائم").

- Feature cards highlighting security, privacy, and fast processing.



2. Multi-Step Verification Wizard (تقديم طلب توثيق جديد):

- A clear 4-step progress indicator: (البيانات الشخصية -> رفع المستندات -> مراجعة الطلب -> تأكيد الإرسال).

- Step 1 (Personal Info): Form inputs for Full Name, Email, Phone Number with country code selector, Date of Birth, and Gender.

- Step 2 (Document Upload): Drag-and-drop or file selection fields for:

  * الهوية الشخصية أو جواز السفر (National ID / Passport)

  * صورة شخصية (Personal Photo)

  * إثبات السكن (فاتورة أو عقد إيجار) (Proof of Residence / Utility Bill / Lease Agreement)



3. Request Status Tracking (متابعة حالة الطلب):

- Search/tracking mechanism using Request ID ("رقم الطلب") and Email ("البريد الإلكتروني").

- Visual status timeline showing stages: قيد المراجعة (Under Review), يحتاج معلومات (Needs Info), موثق (Verified).



4. Admin Dashboard (لوحة التحكم الإدارية):

- Top metric cards displaying statistics: إجمالي الطلبات (Total Requests: 1,248), قيد المراجعة (Under Review: 342), يحتاج معلومات (Needs Info: 78), موثق (Verified: 828).

- A detailed data table showing recent requests with columns: رقم الطلب, الاسم, البريد الإلكتروني, الحالة, تاريخ التقديم، and actions.

- A functional sidebar navigation menu (الرئيسية، الطلبات، المستخدمين، التقارير، الإعدادات).



Provide clean, modular, and production-ready code (e.g., HTML/Tailwind CSS or React/Next.js components) with proper state management for the multi-step form and tab switching.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sham-verify-journey.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f6acd97d-8c01-4927-8b35-0dad3a1666b7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
