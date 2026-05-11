import asyncio
from pathlib import Path
from playwright import async_api
from playwright.async_api import expect


# Fixture: authenticated student with one attendance record linked to one
# pre_training_questionnaires response.
MOCK_SUPABASE = """
() => {
    const scheduledAt = new Date();
    scheduledAt.setHours(10, 0, 0, 0);

    const submittedAt = new Date(scheduledAt.getTime() + 5 * 60 * 1000);

    const db = {
        users: [
            { id: 'student-1', email: 'atleta@example.com', full_name: 'Atleta Teste', role: 'student' }
        ],
        training_sessions: [
            {
                id: 'session-1',
                title: 'Treino Pré-Treino Teste',
                location: 'Campo Principal',
                scheduled_at: scheduledAt.toISOString()
            }
        ],
        attendance: [
            {
                id: 'attendance-1',
                session_id: 'session-1',
                student_id: 'student-1',
                checked_in_at: submittedAt.toISOString(),
                method: 'qrcode',
                session: {
                    title: 'Treino Pré-Treino Teste',
                    scheduled_at: scheduledAt.toISOString()
                }
            }
        ],
        pre_training_questionnaires: [
            {
                id: 'questionnaire-1',
                session_id: 'session-1',
                student_id: 'student-1',
                recovery_score: 17,
                wellness_scores: {
                    nutrition_hydration: 4,
                    sleep_rest: 5,
                    emotional_support: 4,
                    active_recovery: 3
                },
                pain_points: [
                    {
                        region: 'joelho_esquerdo',
                        label: 'Joelho esquerdo',
                        side: 'frente',
                        intensity: 3
                    }
                ],
                weight_kg: 72.5,
                source: 'qrcode',
                submitted_at: submittedAt.toISOString(),
                updated_at: submittedAt.toISOString(),
                submitted_by: 'student-1'
            }
        ],
        responsible_students: []
    };

    const currentUser = {
        id: 'student-1',
        email: 'atleta@example.com',
        user_metadata: { role: 'student', full_name: 'Atleta Teste' }
    };

    const clone = (value) => JSON.parse(JSON.stringify(value));
    const compare = (left, operator, right) => {
        if (operator === 'eq') return left === right;
        if (operator === 'in') return right.includes(left);
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
            this.orderAscending = true;
            this.singleMode = false;
            this.maybeSingleMode = false;
        }

        select() { return this; }
        eq(column, value) { this.filters.push({ column, operator: 'eq', value }); return this; }
        in(column, value) { this.filters.push({ column, operator: 'in', value }); return this; }
        gte(column, value) { this.filters.push({ column, operator: 'gte', value }); return this; }
        lte(column, value) { this.filters.push({ column, operator: 'lte', value }); return this; }
        lt(column, value) { this.filters.push({ column, operator: 'lt', value }); return this; }
        limit(count) { this.limitCount = count; return this; }
        order(column, options = {}) {
            this.orderColumn = column;
            this.orderAscending = options.ascending !== false;
            return this;
        }
        single() { this.singleMode = true; return this; }
        maybeSingle() { this.maybeSingleMode = true; return this; }

        then(resolve, reject) {
            return this.execute().then(resolve, reject);
        }

        async execute() {
            let rows = [...(db[this.table] || [])];
            rows = rows.filter((row) => this.filters.every((filter) => compare(row[filter.column], filter.operator, filter.value)));

            if (this.orderColumn) {
                rows.sort((a, b) => String(a[this.orderColumn]).localeCompare(String(b[this.orderColumn])));
                if (!this.orderAscending) rows.reverse();
            }

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


async def run_test():
    pw = None
    browser = None
    context = None
    page = None

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
        await page.goto("http://localhost:3000/#attendance")

        await expect(page.locator("body")).to_contain_text("MINHA FREQUÊNCIA")
        await expect(page.locator("body")).to_contain_text("Treino Pré-Treino Teste")

        questionnaire_link = page.locator('a[href="#pre-training-questionnaire?id=questionnaire-1"]')
        await expect(questionnaire_link).to_be_visible()
        await expect(questionnaire_link).to_contain_text("QUESTIONÁRIO")
        await questionnaire_link.click()

        current_url = await page.evaluate("() => window.location.href")
        assert "#pre-training-questionnaire?id=questionnaire-1" in current_url, "Questionnaire link must navigate to the detail route."
        await expect(page.locator("body")).to_contain_text("QUESTIONÁRIO PRÉ-TREINO")
        await expect(page.locator("body")).to_contain_text("Recuperação")
        await expect(page.locator("body")).to_contain_text("Recuperação boa")
        await expect(page.locator("body")).to_contain_text("Bem-estar")
        await expect(page.locator("body")).to_contain_text("Dores")
        await expect(page.locator("body")).to_contain_text("Peso")
        await expect(page.locator("body")).to_contain_text("QR CODE")
        await expect(page.locator("body")).to_contain_text("72,5 kg")

    except Exception:
        if page:
            output_dir = Path("testsprite_tests/tmp")
            output_dir.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(output_dir / "TC033_View_pre_training_questionnaire_response_failure.png"), full_page=True)
        raise

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
