import asyncio
from playwright import async_api
from playwright.async_api import expect


MOCK_SUPABASE = """
() => {
    const today = new Date();
    today.setHours(10, 0, 0, 0);

    const db = {
        users: [
            { id: 'student-1', email: 'atleta@example.com', full_name: 'Atleta Teste', role: 'student' }
        ],
        student_plans: [
            { id: 'plan-1', student_id: 'student-1', status: 'active' }
        ],
        training_sessions: [
            {
                id: 'session-1',
                title: 'Treino Teste QR',
                location: 'Campo Principal',
                scheduled_at: today.toISOString(),
                qr_code_token: 'valid-qr-token'
            }
        ],
        training_reservations: [],
        pre_training_questionnaires: [],
        attendance: []
    };

    const currentUser = {
        id: 'student-1',
        email: 'atleta@example.com',
        user_metadata: { role: 'student', full_name: 'Atleta Teste' }
    };

    const clone = (value) => JSON.parse(JSON.stringify(value));
    const compare = (left, operator, right) => {
        if (operator === 'eq') return left === right;
        if (operator === 'gte') return String(left) >= String(right);
        if (operator === 'lte') return String(left) <= String(right);
        if (operator === 'lt') return String(left) < String(right);
        return true;
    };

    class Query {
        constructor(table) {
            this.table = table;
            this.filters = [];
            this.limitCount = null;
            this.orderColumn = null;
            this.singleMode = false;
            this.maybeSingleMode = false;
            this.mutation = null;
        }

        select() { return this; }
        eq(column, value) { this.filters.push({ column, operator: 'eq', value }); return this; }
        gte(column, value) { this.filters.push({ column, operator: 'gte', value }); return this; }
        lte(column, value) { this.filters.push({ column, operator: 'lte', value }); return this; }
        lt(column, value) { this.filters.push({ column, operator: 'lt', value }); return this; }
        limit(count) { this.limitCount = count; return this; }
        order(column) { this.orderColumn = column; return this; }
        single() { this.singleMode = true; return this; }
        maybeSingle() { this.maybeSingleMode = true; return this; }

        insert(rows) {
            this.mutation = { type: 'insert', rows };
            return this;
        }

        upsert(row, options = {}) {
            this.mutation = { type: 'upsert', row, options };
            return this;
        }

        delete() {
            this.mutation = { type: 'delete' };
            return this;
        }

        then(resolve, reject) {
            return this.execute().then(resolve, reject);
        }

        async execute() {
            if (this.mutation?.type === 'insert') {
                const rows = this.mutation.rows.map((row) => ({ id: `${this.table}-${Date.now()}-${Math.random()}`, ...row }));
                db[this.table].push(...rows);
                return { data: clone(rows), error: null };
            }

            if (this.mutation?.type === 'upsert') {
                const keys = (this.mutation.options.onConflict || '').split(',').map((key) => key.trim()).filter(Boolean);
                const index = db[this.table].findIndex((row) => keys.every((key) => row[key] === this.mutation.row[key]));
                const saved = {
                    id: index >= 0 ? db[this.table][index].id : `${this.table}-${Date.now()}`,
                    ...this.mutation.row
                };
                if (index >= 0) db[this.table][index] = { ...db[this.table][index], ...saved };
                else db[this.table].push(saved);
                return { data: clone(saved), error: null };
            }

            let rows = [...db[this.table]];
            rows = rows.filter((row) => this.filters.every((filter) => compare(row[filter.column], filter.operator, filter.value)));
            if (this.orderColumn) rows.sort((a, b) => String(a[this.orderColumn]).localeCompare(String(b[this.orderColumn])));
            if (this.limitCount !== null) rows = rows.slice(0, this.limitCount);

            if (this.singleMode) return { data: clone(rows[0] || null), error: rows[0] ? null : { message: 'No rows found' } };
            if (this.maybeSingleMode) return { data: clone(rows[0] || null), error: null };
            return { data: clone(rows), error: null };
        }
    }

    window.__mockDb = db;
    const mockSupabase = {
        createClient: () => ({
            auth: {
                getSession: async () => ({ data: { session: { user: currentUser } }, error: null }),
                getUser: async () => ({ data: { user: currentUser }, error: null }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
            },
            from: (table) => new Query(table)
        })
    };
    Object.defineProperty(window, 'supabase', {
        configurable: false,
        get: () => mockSupabase,
        set: () => {}
    });
}
"""


async def complete_questionnaire(page):
    await expect(page.locator(".precheck-overlay")).to_be_visible()
    await page.locator('[data-recovery="14"]').click()
    await page.locator(".precheck-next").click()

    for key, value in {
        "nutrition_hydration": "4",
        "sleep_rest": "5",
        "emotional_support": "4",
        "active_recovery": "3",
    }.items():
        await page.locator(f'[data-wellness-key="{key}"][data-wellness-value="{value}"]').click()

    await page.locator(".precheck-next").click()
    await page.locator('.precheck-body-region[data-region="joelho_esquerdo"]').click()
    await expect(page.locator(".precheck-sheet-overlay")).to_be_visible()
    await page.locator('.precheck-sheet-scale').nth(2).click()
    await page.locator(".precheck-sheet-form button[type='submit']").click()
    await expect(page.locator("#sheet-overlay")).not_to_be_visible()

    await page.locator(".precheck-next").click()
    await page.locator("#precheck-weight").fill("72.5")
    await page.locator(".precheck-next").click()
    await page.locator(".precheck-next").click()


async def run_test():
    pw = None
    browser = None
    context = None

    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=390,844",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process",
            ],
        )

        context = await browser.new_context(viewport={"width": 390, "height": 844})
        context.set_default_timeout(7000)
        await context.add_init_script(f"({MOCK_SUPABASE})()")

        page = await context.new_page()
        await page.goto("http://localhost:3000/#trainings")
        await expect(page.locator("body")).to_contain_text("MEUS TREINOS")

        scan_task = asyncio.create_task(
            page.evaluate(
                """async () => {
                    const { studentTrainings } = await import('/js/pages/student/trainings.js');
                    await studentTrainings.handleScanSuccess('valid-qr-token');
                }"""
            )
        )

        await expect(page.locator(".precheck-overlay")).to_be_visible()
        assert await page.evaluate("() => window.__mockDb.attendance.length") == 0, "Attendance must not be inserted before questionnaire completion."

        await complete_questionnaire(page)
        await scan_task

        assert await page.evaluate("() => window.__mockDb.pre_training_questionnaires.length") == 1, "Questionnaire response must be persisted."
        assert await page.evaluate("() => window.__mockDb.attendance.length") == 1, "Attendance must be inserted after questionnaire completion."
        assert await page.evaluate("() => window.__mockDb.attendance[0].method") == "qrcode", "QR check-in must keep method=qrcode."
        await expect(page.locator(".toast-success").filter(has_text="Check-in realizado")).to_be_visible()

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
