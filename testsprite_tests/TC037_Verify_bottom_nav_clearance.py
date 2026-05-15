import asyncio
from pathlib import Path

from playwright import async_api


BASE_URL = "http://localhost:3000"
SCREENSHOT_PATH = Path(__file__).parent / "tmp" / "TC037_bottom_nav_clearance.png"
MIN_CLEARANCE_PX = 20
MAX_STANDALONE_NAV_EXTRA_PX = 1
MAX_STANDALONE_NAV_HEIGHT_PX = 50
MAX_STANDALONE_PADDING_BOTTOM_PX = 110


async def prepare_layout(page, standalone=False, safe_bottom_px=34):
    await page.add_style_tag(content=f":root {{ --safe-bottom: {safe_bottom_px}px !important; }}")
    await page.evaluate(
        """({ standalone }) => {
            const mainContent = document.getElementById('main-content');
            const bottomNav = document.getElementById('bottom-nav');

            if (!mainContent || !bottomNav) {
                throw new Error('App shell elements were not found.');
            }

            document.documentElement.classList.add('bottom-nav-visible');
            document.documentElement.classList.toggle('standalone-app', standalone);
            mainContent.className = '';
            bottomNav.classList.remove('hidden');
            bottomNav.innerHTML = `
                <a href="#dashboard" class="nav-item active">
                    <i class="ph-bold ph-house"></i>
                    <span>Inicio</span>
                </a>
                <a href="#trainings" class="nav-item">
                    <i class="ph ph-calendar"></i>
                    <span>Treinos</span>
                </a>
                <a href="#plans" class="nav-item">
                    <i class="ph ph-receipt"></i>
                    <span>Planos</span>
                </a>
                <a href="#attendance" class="nav-item">
                    <i class="ph ph-check-square"></i>
                    <span>Presenca</span>
                </a>
                <button type="button" class="nav-item">
                    <i class="ph ph-dots-three"></i>
                    <span>Mais</span>
                </button>
            `;

            mainContent.innerHTML = `
                <section class="page-container" data-testid="tc037-page">
                    <h1>Teste de clearance</h1>
                    <p style="color: var(--dx-muted); margin-bottom: 24px;">
                        Conteudo sintetico para validar o fim do scroll com bottom nav fixa.
                    </p>
                    <div style="display: grid; gap: 16px;">
                        ${Array.from({ length: 18 }, (_, index) => `
                            <article class="card" style="min-height: 92px;">
                                <h2 style="font-size: 16px;">Item ${index + 1}</h2>
                                <p style="color: var(--dx-muted); margin-top: 8px;">
                                    Linha de conteudo para aumentar a area rolavel.
                                </p>
                            </article>
                        `).join('')}
                    </div>
                    <button id="tc037-final-button" class="btn-primary" style="width: 100%; margin-top: 24px;">
                        Botao final visivel
                    </button>
                </section>
            `;

            mainContent.scrollTop = 0;
        }""",
        {"standalone": standalone},
    )


async def measure_clearance(page, viewport, standalone=False, safe_bottom_px=34):
    await page.set_viewport_size(viewport)
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await prepare_layout(page, standalone=standalone, safe_bottom_px=safe_bottom_px)
    await page.evaluate("() => new Promise(resolve => requestAnimationFrame(resolve))")
    await page.evaluate(
        """() => {
            const mainContent = document.getElementById('main-content');
            mainContent.scrollTop = mainContent.scrollHeight;
        }"""
    )
    await page.wait_for_timeout(100)

    return await page.evaluate(
        """() => {
            const mainContent = document.getElementById('main-content');
            const bottomNav = document.getElementById('bottom-nav');
            const finalButton = document.getElementById('tc037-final-button');
            const firstNavItem = bottomNav.querySelector('.nav-item');
            const finalButtonRect = finalButton.getBoundingClientRect();
            const bottomNavRect = bottomNav.getBoundingClientRect();
            const navItemRect = firstNavItem.getBoundingClientRect();
            const mainStyle = getComputedStyle(mainContent);
            const rootStyle = getComputedStyle(document.documentElement);

            return {
                gap: bottomNavRect.top - finalButtonRect.bottom,
                paddingBottom: parseFloat(mainStyle.paddingBottom),
                bottomNavHeight: bottomNavRect.height,
                navItemHeight: navItemRect.height,
                navBottomExtra: bottomNavRect.height - navItemRect.height,
                navBottomPadding: parseFloat(rootStyle.getPropertyValue('--nav-bottom-padding')),
                pageEndGap: parseFloat(rootStyle.getPropertyValue('--page-end-gap')),
                finalButtonBottom: finalButtonRect.bottom,
                bottomNavTop: bottomNavRect.top,
                scrollTop: mainContent.scrollTop,
                scrollHeight: mainContent.scrollHeight,
                clientHeight: mainContent.clientHeight,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
            };
        }"""
    )


async def assert_clearance(page, viewport, standalone=False, safe_bottom_px=34):
    metrics = await measure_clearance(
        page,
        viewport,
        standalone=standalone,
        safe_bottom_px=safe_bottom_px,
    )
    mode = "standalone" if standalone else "browser"
    label = f"{mode} {viewport['width']}x{viewport['height']}"

    try:
        assert metrics["gap"] >= MIN_CLEARANCE_PX, (
            f"{label}: expected at least {MIN_CLEARANCE_PX}px between final button and nav, "
            f"got {metrics['gap']:.2f}px. Metrics: {metrics}"
        )
        assert metrics["paddingBottom"] >= metrics["bottomNavHeight"], (
            f"{label}: expected #main-content padding-bottom to cover nav height, "
            f"got padding {metrics['paddingBottom']:.2f}px and nav {metrics['bottomNavHeight']:.2f}px. "
            f"Metrics: {metrics}"
        )
        if standalone:
            assert metrics["navBottomExtra"] <= MAX_STANDALONE_NAV_EXTRA_PX, (
                f"{label}: expected standalone nav bottom band to stay compact, "
                f"got {metrics['navBottomExtra']:.2f}px. Metrics: {metrics}"
            )
            assert metrics["bottomNavHeight"] <= MAX_STANDALONE_NAV_HEIGHT_PX, (
                f"{label}: expected standalone nav to be shorter than {MAX_STANDALONE_NAV_HEIGHT_PX}px, "
                f"got {metrics['bottomNavHeight']:.2f}px. Metrics: {metrics}"
            )
            assert metrics["paddingBottom"] <= MAX_STANDALONE_PADDING_BOTTOM_PX, (
                f"{label}: expected standalone content padding not to use the overreported safe area, "
                f"got {metrics['paddingBottom']:.2f}px. Metrics: {metrics}"
            )
    except AssertionError:
        SCREENSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(SCREENSHOT_PATH), full_page=True)
        raise

    print(
        f"TC037 {label}: gap={metrics['gap']:.2f}px, "
        f"padding-bottom={metrics['paddingBottom']:.2f}px, "
        f"nav-height={metrics['bottomNavHeight']:.2f}px, "
        f"nav-extra={metrics['navBottomExtra']:.2f}px"
    )


async def run_test():
    pw = None
    browser = None
    context = None

    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=393,852",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process",
            ],
        )

        context = await browser.new_context(viewport={"width": 393, "height": 852})
        context.set_default_timeout(7000)
        page = await context.new_page()

        await assert_clearance(page, {"width": 393, "height": 852})
        await assert_clearance(page, {"width": 360, "height": 640})
        await assert_clearance(
            page,
            {"width": 393, "height": 852},
            standalone=True,
            safe_bottom_px=160,
        )
        await assert_clearance(
            page,
            {"width": 360, "height": 640},
            standalone=True,
            safe_bottom_px=160,
        )

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
