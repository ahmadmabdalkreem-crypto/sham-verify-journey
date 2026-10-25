export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-5 pt-16" dir="rtl" aria-busy="true" aria-label="جارٍ التحميل">
      <div className="skel mx-auto h-16 w-16 rounded-2xl bg-muted" />
      <div className="skel mx-auto h-5 w-2/3 rounded-lg bg-muted" />
      <div className="skel mx-auto h-4 w-1/2 rounded-lg bg-muted" />
      <div className="skel mt-8 h-12 w-full rounded-xl bg-muted" />
      <div className="skel h-12 w-full rounded-xl bg-muted" />
      <div className="skel mt-4 h-12 w-full rounded-xl bg-muted" />
    </div>
  );
}
