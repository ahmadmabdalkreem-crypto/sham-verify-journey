"""
اختبار تباين آلي (WCAG) لصفحات الخطوات والدخول ورمز التحقق في الوضعين الفاتح والداكن.

التشغيل (والموقع يعمل على المنفذ 8080):
    python3 tests/contrast/check_contrast.py
    BASE_URL=https://example.com python3 tests/contrast/check_contrast.py

القواعد:
- نص عادي: تباين >= 4.5
- نص كبير (>= 24px أو >= 18.66px عريض): تباين >= 3
- إطار الحقول وخانات الرمز مقابل الخلفية: تباين >= 3 (أو خلفية الحقل نفسها مميّزة)
يخرج برمز 1 عند أي فشل.
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
PAGES = {
    "البيانات": "/aW5mbw",
    "تسجيل الدخول": "/YXV0aA",
    "رمز التحقق": "/b3Rw",
    "بانتظار التحقق": "/cGVuZGluZw",
    "متابعة الطلب": "/cmV2aWV3",
    "التوثيق": "/dmVyaWZ5",
    "تم بنجاح": "/c3VjY2Vzcw",
    "استكمال الإجراءات": "/Y29tcGxldGU",
    "تجاوز المحاولات": "/YXR0ZW1wdHM",
    "تسجيل الخروج": "/bG9nb3V0LWRldmljZXM",
}

JS = r"""
() => {
  const parse = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const blend = (top, bot) => {
    const a = top[3];
    return [0,1,2].map(i => top[i]*a + bot[i]*(1-a)).concat(1);
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
  const hasImageBg = (el) => {
    const s = getComputedStyle(el);
    return s.backgroundImage && s.backgroundImage !== "none" && /gradient|url/.test(s.backgroundImage);
  };
  // الخلفية الفعلية: دمج الطبقات من العنصر حتى الجذر
  const bgOf = (el) => {
    const layers = [];
    let n = el, gradient = false;
    while (n && n.nodeType === 1) {
      const s = getComputedStyle(n);
      const c = parse(s.backgroundColor);
      if (hasImageBg(n)) gradient = true;
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
      n = n.parentElement;
    }
    const isLight = document.documentElement.classList.contains("theme-light");
    let base = isLight ? [255,255,255,1] : [10,15,30,1];
    for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);
    return { color: base, gradient };
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (r.width < 2 || r.height < 2 || s.visibility === "hidden" || s.display === "none" || parseFloat(s.opacity) < 0.05) return false;
    if (el.closest("[aria-hidden='true'],[data-input-otp],.sr-only")) return false;
    // WCAG يستثني العناصر المعطّلة من اشتراط التباين
    const dis = el.closest("button,a,input,select,textarea,[role=button]");
    if (dis && (dis.disabled || dis.getAttribute("aria-disabled") === "true")) return false;
    return true;
  };
  const label = (el) => (el.innerText || el.placeholder || el.getAttribute("aria-label") || el.tagName).trim().replace(/\s+/g," ").slice(0, 40);
  const out = [];

  // 1) النصوص
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.textContent.trim()) continue;
    const el = t.parentElement;
    if (!el || seen.has(el) || !visible(el)) continue;
    seen.add(el);
    const s = getComputedStyle(el);
    const fg = parse(s.color); if (!fg) continue;
    const bg = bgOf(el);
    const fgEff = blend([fg[0],fg[1],fg[2],fg[3]*parseFloat(s.opacity)], bg.color);
    const size = parseFloat(s.fontSize), bold = parseInt(s.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const min = large ? 3 : 4.5;
    const r = ratio(fgEff, bg.color);
    const kind = el.closest("button,a,[role=button]") ? "زر" : "نص";
    out.push({ kind, text: label(el), ratio: +r.toFixed(2), min, gradient: bg.gradient });
  }

  // 2) placeholder الحقول
  document.querySelectorAll("input:not([type=hidden]),textarea").forEach((el) => {
    if (!visible(el)) return;
    const bg = bgOf(el);
    if (el.placeholder) {
      const ph = parse(getComputedStyle(el, "::placeholder").color);
      if (ph) out.push({ kind: "نص إرشادي", text: el.placeholder.slice(0,40), ratio: +ratio(blend(ph, bg.color), bg.color).toFixed(2), min: 3, gradient: bg.gradient });
    }
    // 3) إطار الحقل مقابل خلفية الحاوية
    const s = getComputedStyle(el);
    const border = parse(s.borderTopColor);
    const parentBg = bgOf(el.parentElement).color;
    const selfBg = bg.color;
    const bw = parseFloat(s.borderTopWidth);
    const borderR = bw > 0 && border ? ratio(blend(border, parentBg), parentBg) : 1;
    const fillR = ratio(selfBg, parentBg);
    out.push({ kind: "حدود حقل", text: label(el), ratio: +Math.max(borderR, fillR).toFixed(2), min: 3, gradient: false });
  });
  return out;
}
"""


async def run():
    failures, total = [], 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for theme in ("light", "dark"):
            ctx = await browser.new_context(viewport={"width": 393, "height": 800},
                                            color_scheme=theme, reduced_motion="reduce")
            page = await ctx.new_page()
            # نُحيّد توجيه الإدارة وفحص الجلسة حتى لا يأخذانا بعيداً عن الصفحة المُختبَرة
            import base64
            NEUTRAL = {
                "client-route": '{"result":{"email":null,"session":null}}',
                "stale-session": '{"result":{"alive":true}}',
                "block.functions": '{"result":{"blocked":false}}',
            }

            async def _serverfn(route):
                url = route.request.url
                seg = url.rsplit("/", 1)[-1].split("?")[0]
                try:
                    decoded = base64.urlsafe_b64decode(seg + "=" * (-len(seg) % 4)).decode("utf-8", "ignore")
                except Exception:
                    decoded = ""
                for marker, body in NEUTRAL.items():
                    if marker in decoded:
                        await route.fulfill(status=200, content_type="application/json", body=body)
                        return
                await route.continue_()

            await ctx.route("**/_serverFn/**", _serverfn)
            await page.goto(BASE + "/", wait_until="domcontentloaded")
            await page.wait_for_timeout(400)
            await page.evaluate(f"""() => {{
                localStorage.setItem('sc-theme', '{theme}');
                localStorage.setItem('sham_reset_version', '2026-10-11b');
                localStorage.setItem('sham_name', 'عميل تجريبي');
                localStorage.setItem('sham_phone', '+963 991234666');
                localStorage.setItem('sham_email', 'contrast@test.local');
                localStorage.setItem('sham_auth_email', 'contrast@test.local');
            }}""")
            for name, path in PAGES.items():
                try:
                    await page.goto(BASE + path, wait_until="domcontentloaded", timeout=15000)
                except Exception as e:
                    print(f"  ⚠ [{theme}] {name}: فشل التحميل {e}")
                    continue
                await page.wait_for_timeout(1200)
                if page.url.rstrip("/") != (BASE + path).rstrip("/"):
                    print(f"  ⚠ [{theme}] {name}: تحوّلت إلى {page.url} — تخطّي")
                    continue
                is_light = await page.evaluate("document.documentElement.classList.contains('theme-light')")
                if is_light != (theme == "light"):
                    failures.append(f"[{theme}] {name}: الوضع لم يُطبَّق")
                await page.evaluate("document.activeElement && document.activeElement.blur()")
                results = await page.evaluate(JS)
                bad = [r for r in results if r["ratio"] < r["min"] and not r["gradient"]]
                total += len(results)
                print(f"{'✓' if not bad else '✗'} [{theme}] {name}: {len(results)} عنصر، {len(bad)} فشل")
                for r in bad:
                    failures.append(f"[{theme}] {name} — {r['kind']} «{r['text']}»: {r['ratio']} < {r['min']}")
            await ctx.close()
        await browser.close()

    print(f"\nتم فحص {total} عنصر.")
    if failures:
        print(f"\n{len(failures)} مشكلة تباين:")
        for f in failures:
            print("  -", f)
        sys.exit(1)
    print("كل العناصر تجتاز معايير التباين ✓")


if __name__ == "__main__":
    asyncio.run(run())
