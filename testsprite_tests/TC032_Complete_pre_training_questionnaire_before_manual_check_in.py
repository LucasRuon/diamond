import asyncio
from playwright import async_api
from playwright.async_api import expect


MOCK_SUPABASE = """
() => {
    const today = new Date();
    today.setHours(10, 0, 0, 0);

    const db = {
        users: [
            { id: 'admin-1', email: 'admin@example.com', full_name: 'Admin Teste', role: 'admin' },
            { id: 'student-1', email: 'atleta@example.com', full_name: 'Atleta Teste', role: 'student' }
        ],
        student_plans: [
            { id: 'plan-1', student_id: 'student-1', status: 'active' }
        ],
        training_sessions: [
            {
                id: 'session-1',
                title: 'Treino Manual Teste',
                location: 'Campo Principal',
                scheduled_at: today.toISOString(),
                qr_code_token: 'manual-token'
            }
        ],
        training_reservations: [],
        pre_training_questionnaires: [],
        attendance: []
    };

    const currentUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        user_metadata: { role: 'admin', full_name: 'Admin Teste' }
    };

    const clone = (value) => JSON.parse(JSON.stringify(value));
    const compare = (left, operator, right) => {
        if (operator === 'eq') return left === right;
        if (operator === 'gte') return String(left) >= String(right);
        if (operator === 'lte') return String(left) <= String(right);
        if (operator === 'lt') return String(left) < String(right);
        if (operator === 'in') return right.includes(left);
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
        in(column, value) { this.filters.push({ column, operator: 'in', value }); return this; }
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
    await page.locator('[data-recovery="15"]').click()
    await page.locator(".precheck-next").click()

    for key, value in {
        "nutrition_hydration": "5",
        "sleep_rest": "4",
        "emotional_support": "4",
        "active_recovery": "4",
    }.items():
        await page.locator(f'[data-wellness-key="{key}"][data-wellness-value="{value}"]').click()

    await page.locator(".precheck-next").click()
    await page.locator('.precheck-body-region[data-region="ombro"]').first.click()
    await expect(page.locator(".precheck-sheet-overlay")).to_be_visible()
    await page.locator('.precheck-sheet-scale').nth(1).click()
    await page.locator(".precheck-sheet-form button[type='submit']").click()
    await expect(page.locator("#sheet-overlay").first).to_be_visible()

    await page.locator(".precheck-next").click()
    await page.locator("#precheck-weight").fill("80.2")
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
        await expect(page.locator("body")).to_contain_text("TREINOS")

        await page.locator(".btn-attendance").click()
        student_item = page.locator('.attendance-item[data-student-id="student-1"]')
        await expect(student_item).to_be_visible()

        await student_item.click()
        await expect(page.locator(".precheck-overlay")).to_be_visible()
        assert await page.evaluate("() => window.__mockDb.attendance.length") == 0, "Manual attendance must not be inserted before questionnaire completion."

        await page.locator(".precheck-close").click()
        await expect(page.locator(".precheck-overlay")).not_to_be_visible()
        assert await page.evaluate("() => window.__mockDb.attendance.length") == 0, "Closing the questionnaire must keep the student absent."
        await expect(page.locator(".toast-error")).to_contain_text("Questionário obrigatório")

        await student_item.click()
        await complete_questionnaire(page)

        assert await page.evaluate("() => window.__mockDb.pre_training_questionnaires.length") == 1, "Manual questionnaire response must be persisted."
        assert await page.evaluate("() => window.__mockDb.pre_training_questionnaires[0].source") == "manual", "Manual questionnaire must keep source=manual."
        assert await page.evaluate("() => window.__mockDb.pre_training_questionnaires[0].submitted_by") == "admin-1", "Manual questionnaire must store submitted_by admin id."
        assert await page.evaluate("() => window.__mockDb.attendance.length") == 1, "Manual attendance must be inserted after questionnaire completion."
        assert await page.evaluate("() => window.__mockDb.attendance[0].method") == "manual", "Manual attendance must keep method=manual."
        await expect(student_item.locator(".attendance-toggle .ph-check")).to_be_visible()

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
