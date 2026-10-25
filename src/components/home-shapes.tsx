/** الأشكال المتحركة لخلفية الصفحة الرئيسية — تُستخدم في كل صفحات الموقع (تحتاج أباً بصنف home-v3) */
export function HomeShapes() {
  return (
    <div aria-hidden className="h-shapes pointer-events-none absolute inset-0 overflow-hidden">
      <span className="h-shape h-shape-blob h-shape--a" />
      <span className="h-shape h-shape-blob h-shape--b" />
      <span className="h-shape h-shape-blob h-shape--c" />
      <span className="h-shape h-shape-ring h-shape--d" />
      <span className="h-shape h-shape-ring h-shape--e" />
      <span className="h-shape h-shape-tri h-shape--f" />
      <span className="h-shape h-shape-dot h-shape--g" />
      <span className="h-shape h-shape-dot h-shape--h" />
      <span className="h-shape h-shape-grid" />
      <span className="h-shape h-hex h-shape--i" />
      <span className="h-shape h-hex h-hex--line h-shape--j" />
      <span className="h-shape h-orbit h-shape--k"><i /></span>
      <span className="h-shape h-spark h-shape--l" />
      <span className="h-shape h-spark h-shape--m" />
      <span className="h-shape h-spark h-shape--n" />
      <span className="h-shape h-beam h-shape--o" />
    </div>
  );
}
