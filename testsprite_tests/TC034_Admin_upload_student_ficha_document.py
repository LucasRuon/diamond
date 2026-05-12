import asyncio
from pathlib import Path
from playwright import async_api
from playwright.async_api import expect


MOCK_SUPABASE = """
() => {
    const db = {
        users: [
            { id: 'admin-1', email: 'admin@example.com', full_name: 'Admin Teste', role: 'admin' },
            { id: 'student-1', email: 'aluno@example.com', full_name: 'Aluno Teste', role: 'student', cpf: '123.456.789-09', phone: '(11) 99999-0000', athlete_record_url: null }
        ],
        student_documents: []
    };

    const clone = (value) => JSON.parse(JSON.stringify(value));
    let currentUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        user_metadata: { role: 'admin', full_name: 'Admin Teste' }
    };
    const listeners = [];
    const storageObjects = new Map();

    const getProfile = () => db.users.find((user) => user.id === currentUser.id);
    const compare = (left, operator, right) => {
        if (operator === 'eq') return left === right;
        if (operator === 'is') return left === right;
        return true;
    };

    class Query {
        constructor(table) {
            this.table = table;
            this.filters = [];
            this.orderColumn = null;
            this.orderAscending = true;
            this.singleMode = false;
            this.maybeSingleMode = false;
            this.insertRows = null;
            this.updatePayload = null;
        }

        select() { return this; }
        eq(column, value) { this.filters.push({ column, operator: 'eq', value }); return this; }
        is(column, value) { this.filters.push({ column, operator: 'is', value }); return this; }
        order(column, options = {}) {
            this.orderColumn = column;
            this.orderAscending = options.ascending !== false;
            return this;
        }
        insert(rows) { this.insertRows = Array.isArray(rows) ? rows : [rows]; return this; }
        update(payload) { this.updatePayload = payload; return this; }
        single() { this.singleMode = true; return this; }
        maybeSingle() { this.maybeSingleMode = true; return this; }

        then(resolve, reject) {
            return this.execute().then(resolve, reject);
        }

        rows() {
            return (db[this.table] || []).filter((row) => {
                return this.filters.every((filter) => compare(row[filter.column], filter.operator, filter.value));
            });
        }

        async execute() {
            if (this.insertRows) {
                const rows = this.insertRows.map((row) => ({
                    ...clone(row),
                    uploaded_at: row.uploaded_at || new Date().toISOString(),
                    deleted_at: row.deleted_at || null
                }));
                db[this.table].push(...rows);
                return this.format(rows);
            }

            if (this.updatePayload) {
                const matchedRows = this.rows();
                matchedRows.forEach((row) => Object.assign(row, clone(this.updatePayload)));
                return this.format(matchedRows);
            }

            let rows = this.rows();
            if (this.orderColumn) {
                rows = [...rows].sort((a, b) => String(a[this.orderColumn] || '').localeCompare(String(b[this.orderColumn] || '')));
                if (!this.orderAscending) rows.reverse();
            }
            return this.format(rows);
        }

        format(rows) {
            const data = clone(rows);
            if (this.singleMode) return { data: data[0] || null, error: data[0] ? null : { message: 'No rows found' } };
            if (this.maybeSingleMode) return { data: data[0] || null, error: null };
            return { data, error: null, count: data.length };
        }
    }

    const makeUser = (role) => {
        if (role === 'student') {
            return { id: 'student-1', email: 'aluno@example.com', user_metadata: { role: 'student', full_name: 'Aluno Teste' } };
        }
        return { id: 'admin-1', email: 'admin@example.com', user_metadata: { role: 'admin', full_name: 'Admin Teste' } };
    };

    window.__setCurrentRole = (role) => {
        currentUser = makeUser(role);
        listeners.forEach((listener) => listener('SIGNED_IN', { user: currentUser }));
    };
    window.__mockDb = db;
    window.__mockStorageObjects = storageObjects;

    const mockSupabase = {
        createClient: () => ({
            auth: {
                getSession: async () => ({ data: { session: { user: currentUser } }, error: null }),
                getUser: async () => ({ data: { user: currentUser }, error: null }),
                onAuthStateChange: (listener) => {
                    listeners.push(listener);
                    return { data: { subscription: { unsubscribe() {} } } };
                },
                signOut: async () => ({ error: null }),
                updateUser: async () => ({ data: { user: currentUser }, error: null })
            },
            from: (table) => new Query(table),
            storage: {
                from: (bucket) => ({
                    upload: async (path, file) => {
                        storageObjects.set(`${bucket}/${path}`, { name: file.name, size: file.size, type: file.type });
                        return { data: { path }, error: null };
                    },
                    remove: async (paths) => {
                        paths.forEach((path) => storageObjects.delete(`${bucket}/${path}`));
                        return { data: [], error: null };
                    },
                    createSignedUrl: async (path) => ({
                        data: { signedUrl: `https://example.com/signed/${encodeURIComponent(path)}` },
                        error: null
                    }),
                    getPublicUrl: (path) => ({ data: { publicUrl: `https://example.com/public/${path}` } })
                })
            },
            functions: { invoke: async () => ({ data: {}, error: null }) }
        })
    };

    Object.defineProperty(window, 'supabase', {
        configurable: false,
        get: () => mockSupabase,
        set: () => {}
    });
}
"""


async def empty_script(route):
    await route.fulfill(status=200, content_type="application/javascript", body="")


async def run_test():
    pw = None
    browser = None
    context = None
    page = None

    fixture_path = Path("testsprite_tests/tmp/TC034_ficha_teste.txt")
    fixture_path.parent.mkdir(parents=True, exist_ok=True)
    fixture_path.write_text("Ficha fisica de teste Diamond X\\n", encoding="utf-8")

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
        context.set_default_timeout(10000)
        await context.route("https://cdn.jsdelivr.net/**", empty_script)
        await context.route("https://unpkg.com/**", empty_script)
        await context.add_init_script(f"({MOCK_SUPABASE})()")

        page = await context.new_page()
        await page.goto("http://localhost:3000/#student-documents")

        await expect(page.locator("body")).to_contain_text("FICHAS DOS ALUNOS")
        await expect(page.get_by_text("Aluno Teste").first).to_be_visible()
        await page.get_by_text("Aluno Teste").first.click()

        await expect(page.get_by_text("ENVIAR FICHA")).to_be_visible()
        await page.get_by_text("ENVIAR FICHA").click()

        form = page.locator("#student-document-upload-form")
        await expect(form).to_be_visible()
        await form.locator('input[name="title"]').fill("Ficha física TestSprite")
        await page.locator("#student-document-file").set_input_files(str(fixture_path))
        await form.locator('button[type="submit"]').click()

        await expect(page.locator("#sheet-overlay")).to_be_hidden(timeout=10000)
        await expect(page.locator("body")).to_contain_text("Ficha física TestSprite")
        await expect(page.locator("body")).to_contain_text("VISÍVEL AO ALUNO")

        await page.evaluate("() => window.__setCurrentRole('student')")
        await page.goto("http://localhost:3000/#profile")

        await expect(page.locator("body")).to_contain_text("DOCUMENTOS DA FICHA")
        await expect(page.locator("body")).to_contain_text("Ficha física TestSprite")
        await expect(page.get_by_role("button", name="Abrir").first).to_be_visible()

    except Exception:
        if page:
            output_dir = Path("testsprite_tests/tmp")
            output_dir.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(output_dir / "TC034_Admin_upload_student_ficha_document_failure.png"), full_page=True)
        raise

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
