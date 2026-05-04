import asyncio
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
        context.set_default_timeout(10000)
        page = await context.new_page()

        await page.goto("http://localhost:3000")

        await expect(page.locator("#login-email")).to_be_visible()
        await page.locator("#login-email").fill("luucasruon@gmail.com")
        await page.locator("#login-password").fill("123456789")
        await page.locator('#login-form button[type="submit"]').click()

        profile_nav = page.locator('a[href="#profile"]')
        await expect(profile_nav).to_be_visible()
        await profile_nav.click()

        await expect(page.locator("#edit-profile-btn")).to_be_visible()
        await page.locator("#edit-profile-btn").click()

        form = page.locator("#edit-profile-form")
        await expect(form).to_be_visible()
        await form.locator('input[name="full_name"]').fill("Lucas Silva")
        await form.locator('input[name="cpf"]').fill("529.982.247-25")
        await form.locator('input[name="phone"]').fill("(11) 91234-5678")
        await form.locator('button[type="submit"]').click()

        await expect(page.locator("#sheet-overlay")).to_be_hidden(timeout=15000)
        await expect(page.get_by_text("Alteracoes salvas com sucesso").first).to_be_visible()
        await expect(page.get_by_text("Lucas Silva", exact=True).first).to_be_visible()
        await expect(page.get_by_text("529.982.247-25", exact=True).first).to_be_visible()
        await expect(page.get_by_text("(11) 91234-5678", exact=True).first).to_be_visible()

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
