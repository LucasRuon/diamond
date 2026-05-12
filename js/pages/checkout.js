import { supabase } from '../supabase.js';
import { toast } from '../auth.js';
import { escapeHtml, safeUrl } from '../ui.js';
import { getPaymentStatus, translateAsaasStatus } from '../asaas.js';

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_TICKS = 120; // ~10min

export const checkoutPage = {
    pollTimer: null,
    pollTicks: 0,
    currentStudentPlanId: null,

    async render(studentPlanId) {
        const mainContent = document.getElementById('main-content');
        this.stopPolling();
        this.currentStudentPlanId = studentPlanId || null;

        if (!studentPlanId) {
            mainContent.innerHTML = this.errorShell('Cobrança não informada.');
            this.bindBack();
            return;
        }

        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <h1 style="font-family: var(--font-brand); font-size: 22px; font-weight: 400;">CHECKOUT</h1>
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                </div>
                <div id="checkout-body">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando cobrança...</p>
                </div>
            </div>
        `;

        try {
            const data = await this.loadFull(studentPlanId);
            if (!data) {
                document.getElementById('checkout-body').innerHTML = this.errorShell('Cobrança não encontrada.');
                this.bindBack();
                return;
            }
            this.renderBody(data);
            if (data.status === 'pending_payment') {
                this.startPolling(studentPlanId);
            }
        } catch (error) {
            console.error('[checkout] load error', error);
            document.getElementById('checkout-body').innerHTML = this.errorShell('Não foi possível carregar a cobrança.');
            this.bindBack();
        }
    },

    async loadFull(studentPlanId) {
        const { data, error } = await supabase
            .from('student_plans')
            .select('id, status, asaas_status, asaas_invoice_url, asaas_payment_id, plan:plans(id, name, price, category)')
            .eq('id', studentPlanId)
            .single();
        if (error) throw error;
        return data;
    },

    renderBody(sp) {
        const body = document.getElementById('checkout-body');
        if (!body) return;

        const isPending = sp.status === 'pending_payment';
        const isPaid = sp.status === 'active' || ['CONFIRMED', 'RECEIVED'].includes(sp.asaas_status);

        if (isPaid) {
            body.innerHTML = `
                <div class="card" style="text-align: center; padding: 24px;">
                    <i class="ph-fill ph-check-circle" style="font-size: 56px; color: var(--dx-teal);"></i>
                    <h2 style="font-family: var(--font-brand); font-weight: 400; margin-top: 12px;">PAGAMENTO CONFIRMADO</h2>
                    <p style="color: var(--dx-muted); margin-top: 8px;">Plano ${escapeHtml(sp.plan?.name || '')} ativado.</p>
                    <a href="#payments" class="btn btn-primary" style="margin-top: 20px; text-decoration:none;">VER PAGAMENTOS</a>
                </div>
            `;
            return;
        }

        const isCard = !!sp.asaas_invoice_url && !sp.asaas_payment_id?.startsWith('pix_');
        // Buscar QR (não persistimos QR, então tentamos chamar Edge? não — QR só vem na criação)
        // Para PIX, exibimos copy-paste/invoice_url; QR fica disponível durante criação inicial.
        const pix = this.cachedPix && this.cachedPix.sp === sp.id ? this.cachedPix.data : null;

        body.innerHTML = `
            <div class="card" style="margin-bottom: 16px;">
                <p style="font-size: 12px; color: var(--dx-muted); font-weight: 700;">PLANO</p>
                <p style="font-weight: 800; font-size: 16px;">${escapeHtml(sp.plan?.name || '')}</p>
                <p style="font-size: 12px; color: var(--dx-muted); margin-top: 6px;">Status: <strong>${escapeHtml(translateAsaasStatus(sp.asaas_status))}</strong></p>
            </div>

            ${pix ? this.renderPix(pix) : ''}

            ${sp.asaas_invoice_url ? `
                <a href="${safeUrl(sp.asaas_invoice_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-diamond" style="margin-bottom: 12px; text-decoration:none;">
                    <i class="ph ph-credit-card" style="margin-right:6px;"></i> ABRIR FATURA / PAGAR
                </a>
            ` : ''}

            ${isPending ? `
                <div style="text-align:center; color: var(--dx-muted); font-size: 12px; margin: 12px 0;">
                    <i class="ph ph-circle-notch-bold spin" style="margin-right:6px;"></i>
                    Aguardando confirmação automática...
                </div>
            ` : ''}

            <button id="checkout-back" class="btn" style="border:1px solid var(--dx-border);">VOLTAR</button>
        `;

        this.bindBack();
    },

    renderPix(pix) {
        const expires = pix.expirationDate ? new Date(pix.expirationDate).toLocaleString('pt-BR') : '';
        return `
            <div class="card" style="margin-bottom: 16px; text-align:center;">
                <p style="font-size: 12px; color: var(--dx-muted); font-weight: 700; margin-bottom: 8px;">PAGAR COM PIX</p>
                <img src="data:image/png;base64,${pix.encodedImage}" alt="QR Code PIX" style="width: 220px; height: 220px; margin: 0 auto; border: 1px solid var(--dx-border); border-radius: 8px; background: #fff; padding: 8px;">
                ${expires ? `<p style="font-size: 12px; color: var(--dx-muted); margin-top: 8px;">Expira em ${escapeHtml(expires)}</p>` : ''}
                <div style="margin-top: 12px;">
                    <p style="font-size: 12px; color: var(--dx-muted); font-weight: 700; margin-bottom: 6px;">COPIA-E-COLA</p>
                    <textarea readonly id="pix-payload" style="width:100%; min-height: 80px; padding: 8px; border-radius: 6px; border: 1px solid var(--dx-border); background: var(--dx-surface2); color: var(--dx-text); font-size: 12px;">${escapeHtml(pix.payload || '')}</textarea>
                    <button id="pix-copy" class="btn btn-primary" style="margin-top: 8px;"><i class="ph ph-copy" style="margin-right:6px;"></i> COPIAR CÓDIGO</button>
                </div>
            </div>
        `;
    },

    setPixForCurrent(pix) {
        // Permite que o fluxo de compra deixe o QR disponível para a renderização inicial.
        if (this.currentStudentPlanId) {
            this.cachedPix = { sp: this.currentStudentPlanId, data: pix };
        }
    },

    bindBack() {
        const back = document.getElementById('checkout-back');
        if (back) back.addEventListener('click', () => { window.location.hash = '#payments'; });
        const copy = document.getElementById('pix-copy');
        if (copy) {
            copy.addEventListener('click', async () => {
                const ta = document.getElementById('pix-payload');
                if (!ta) return;
                try {
                    await navigator.clipboard.writeText(ta.value);
                    toast.show('Código PIX copiado!');
                } catch {
                    ta.select();
                    document.execCommand('copy');
                    toast.show('Código copiado.');
                }
            });
        }
    },

    startPolling(studentPlanId) {
        this.stopPolling();
        this.pollTicks = 0;
        this.pollTimer = setInterval(async () => {
            this.pollTicks++;
            if (this.pollTicks > POLL_MAX_TICKS) {
                this.stopPolling();
                return;
            }
            try {
                const row = await getPaymentStatus(studentPlanId);
                if (!row) return;
                if (row.status === 'active' || ['CONFIRMED', 'RECEIVED'].includes(row.asaas_status)) {
                    this.stopPolling();
                    toast.show('Pagamento confirmado!');
                    window.location.hash = '#payments';
                } else if (row.status === 'cancelled' || ['REFUNDED', 'CANCELLED'].includes(row.asaas_status)) {
                    this.stopPolling();
                    toast.show('Cobrança cancelada.', 'error');
                    // Atualiza a tela
                    this.render(studentPlanId);
                }
            } catch (err) {
                console.warn('[checkout] poll error', err);
            }
        }, POLL_INTERVAL_MS);
    },

    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    },

    errorShell(msg) {
        return `
            <div class="card" style="text-align:center; padding: 24px;">
                <i class="ph ph-warning" style="font-size: 40px; color: var(--dx-danger);"></i>
                <p style="margin-top: 10px;">${escapeHtml(msg)}</p>
                <button id="checkout-back" class="btn btn-primary" style="margin-top: 16px;">VOLTAR</button>
            </div>
        `;
    }
};

// Cleanup quando o usuário sair da rota
window.addEventListener('hashchange', () => {
    if (!window.location.hash.startsWith('#checkout')) {
        checkoutPage.stopPolling();
    }
});
