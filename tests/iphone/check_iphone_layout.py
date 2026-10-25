"""Visual layout checks on iPhone sizes, portrait + landscape.
Fails if any page scrolls horizontally or a visible element sticks out past the screen edge.
Run: python3 tests/iphone/check_iphone_layout.py  (dev server on :8080)"""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
PAGES = ["/", "/YXV0aA", "/b3Rw", "/dmVyaWZ5", "/cGVuZGluZw", "/c3VjY2Vzcw", "/YmxvY2tlZA", "/YXR0ZW1wdHM", "/c3dhcA"]
DEVICES = {"iPhone SE": (375, 667), "iPhone 13 mini": (375, 812), "iPhone 15": (393, 852), "iPhone 15 Pro Max": (430, 932)}
OUT = Path(__file__).parent / "screenshots"; OUT.mkdir(exist_ok=True)
UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

JS = """() => {
  const W = document.documentElement.clientWidth;
  const scroll = document.documentElement.scrollWidth - W;
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.visibility==='hidden'||cs.display==='none'||cs.position==='fixed') continue;
    if (el.closest('[aria-hidden="true"],svg,.home-shapes,[data-decor]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width===0||r.height===0) continue;
    if (r.right > W + 2 || r.left < -2) {
      let p = el.parentElement, clipped = false;
      while (p) { const o = getComputedStyle(p).overflowX; if (o==='hidden'||o==='clip'||o==='auto'||o==='scroll') { if (p!==document.body && p!==document.documentElement) { clipped=true; break; } } p = p.parentElement; }
      if (!clipped && el.innerText && el.children.length===0) bad.push((el.tagName+'.'+el.className).slice(0,80)+' «'+el.innerText.slice(0,30)+'»');
    }
  }
  return {scroll, bad: bad.slice(0,5)};
}"""

async def main():
    fails = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        for name, (w, h) in DEVICES.items():
            for orient, (vw, vh) in {"portrait": (w, h), "landscape": (h, w)}.items():
                ctx = await b.new_context(viewport={"width": vw, "height": vh}, user_agent=UA, is_mobile=True, has_touch=True, device_scale_factor=2)
                page = await ctx.new_page()
                for path in PAGES:
                    try:
                        await page.goto(BASE + path, wait_until="domcontentloaded", timeout=20000)
                    except Exception:
                        await page.wait_for_timeout(1500)
                    await page.wait_for_timeout(1200)
                    res = await page.evaluate(JS)
                    ok = res["scroll"] <= 1 and not res["bad"]
                    tag = f"{name} {orient} {page.url.replace(BASE,'') or '/'}"
                    if not ok:
                        fails += 1
                        print("FAIL", tag, res)
                        await page.screenshot(path=str(OUT / f"{name.replace(' ','_')}_{orient}_{path.strip('/') or 'home'}.png"))
                    else:
                        print("ok  ", tag)
                await ctx.close()
        await b.close()
    print(f"\n{fails} failures")
    sys.exit(1 if fails else 0)

asyncio.run(main())
