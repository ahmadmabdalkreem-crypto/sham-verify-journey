"""Regression checks for unavailable scroll observers and home navigation."""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        for setup in [
            "window.IntersectionObserver = undefined",
            "delete window.IntersectionObserver",
            "window.IntersectionObserver = null",
        ]:
            context = await browser.new_context(viewport={"width": 411, "height": 732})
            # No credentials are restored; this only simulates browser support.
            await context.add_init_script(setup)
            page = await context.new_page()
            await page.goto("http://localhost:8080/aG9tZQ", wait_until="domcontentloaded")
            await page.get_by_role("heading", name="شام كاش", exact=True).wait_for()
            await page.wait_for_function(
                "Array.from(document.querySelectorAll('[data-reveal]')).every(n => n.dataset.reveal === 'in')"
            )
            assert await page.get_by_role("heading", name="تعذّر تحميل هذه الصفحة").count() == 0
            await page.get_by_role("button", name="فتح القائمة", exact=True).click()
            await page.get_by_role("navigation", name="قائمة الجوال").get_by_role("link", name="المزايا", exact=True).click()
            assert await page.get_by_role("navigation", name="قائمة الجوال").count() == 0
            assert not await page.evaluate("document.documentElement.scrollWidth > innerWidth")
            await context.close()
        await browser.close()
    print("Home fallback and navigation checks passed (3 browser support states).")


if __name__ == "__main__":
    asyncio.run(main())