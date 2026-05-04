import asyncio
import time
from playwright import async_api
from playwright.async_api import expect


async def run_test():
    pw = None
    browser = None
    context = None

    try:
        pw = await async_api.async_playwright().start()

        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process",
            ],
        )

        context = await browser.new_context()
        context.set_default_timeout(7000)

        page = await context.new_page()
        email = f"testuser.tc001.{int(time.time() * 1000)}@example.com"

        await page.goto("http://localhost:3000/#register")

        await page.locator("#reg-name").fill("Test User TC001")
        await page.locator("#reg-email").fill(email)
        await page.locator("#reg-cpf").fill("123.456.789-10")
        await page.locator("#reg-phone").fill("(11) 91111-1111")
        await page.locator("#reg-role").select_option("student")
        await page.locator("#reg-password").fill("123456789")

        await page.locator('#register-form button[type="submit"]').click()
        await expect(page.locator("#register-form")).to_be_visible()
        assert page.url.endswith("/#register") or page.url.endswith("#register"), "Invalid CPF must keep the user on the registration route"
        await expect(page.locator(".toast-error")).to_contain_text("CPF")

        await page.locator("#reg-cpf").fill("529.982.247-25")
        await page.locator('#register-form button[type="submit"]').click()

        try:
            await page.wait_for_url("**/#dashboard", timeout=10000)
        except Exception as exc:
            current_url = await page.evaluate("() => window.location.href")
            login_visible = await page.locator("#login-form").is_visible()
            raise AssertionError(
                "Registration with valid data must land in #dashboard when Supabase returns an immediate session. "
                f"Current URL: {current_url}; login visible: {login_visible}. "
                "If email confirmation is enabled, this test is incompatible with dashboard-immediate TC001."
            ) from exc

        await expect(page.locator("#register-form")).not_to_be_visible()
        await expect(page.locator("body")).to_contain_text("Painel do Atleta")
        await expect(page.locator("body")).to_contain_text("OLÁ")
        await expect(page.locator("#bottom-nav")).to_be_visible()

        await asyncio.sleep(2)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
