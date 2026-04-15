import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui } from '../../ui.js';

export const adminCharges = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div style="padding: 24px 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800;">COBRANÇAS</h1>
                    <button id="refresh-charges-btn" class="btn" style="width: auto; padding: 10px; color: var(--dx-teal);">
                        <i class="ph ph-arrows-clockwise" style="font-size: 24px;"></i>
                    </button>
                </div>

                <div style="display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 8px;">
                    <button class="filter-btn active" data-status="all">Todas</button>
                    <button class="filter-btn" data-status="pending_payment">Pendentes</button>
                    <button class="filter-btn" data-status="active">Pagas</button>
                    <button class="filter-btn" data-status="expired">Vencidas</button>
                </div>

                <div id="admin-charges-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando financeiro...</p>
                </div>
            </div>
        `;

        this.loadCharges();
        this.setupFilters();
        document.getElementById('refresh-charges-btn').addEventListener('click', () => this.loadCharges());
    },

    async loadCharges(statusFilter = 'all') {
        const listContainer = document.getElementById('admin-charges-list');
        
        let query = supabase
            .from('student_plans')
            .select(`
                id,
                status,
                created_at,
                student:users!student_id (full_name),
                plan:plans (name, price)
            `)
            .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data: charges, error } = await query;

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar dados.</p>`;
            return;
        }

        if (charges.length === 0) {
            listContainer.innerHTML = `<p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Nenhuma cobrança encontrada.</p>`;
            return;
        }

        listContainer.innerHTML = charges.map(charge => {
            const date = new Date(charge.created_at).toLocaleDateString('pt-BR');
            const statusLabel = this.getStatusLabel(charge.status);
            const statusClass = this.getStatusClass(charge.status);

            return `
                <div class="card charge-item-card" data-id="${charge.id}" style="cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div>
                            <p style="font-weight: 700; font-size: 15px;">${charge.student.full_name}</p>
                            <p style="font-size: 12px; color: var(--dx-muted);">${charge.plan.name} • ${date}</p>
                        </div>
                        <span class="badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                        <p style="font-weight: 800; color: var(--dx-teal);">R$ ${parseFloat(charge.plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <i class="ph ph-dots-three-vertical" style="color: var(--dx-muted);"></i>
                    </div>
                </div>
            `;
        }).join('');

        this.setupActionEvents(charges);
    },

    setupActionEvents(charges) {
        document.querySelectorAll('.charge-item-card').forEach(card => {
            card.addEventListener('click', () => {
                const chargeId = card.dataset.id;
                const charge = charges.find(c => c.id === chargeId);
                this.showChargeActions(charge);
            });
        });
    },

    showChargeActions(charge) {
        const content = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div class="card" style="margin-bottom: 12px; background: var(--dx-surface2);">
                    <p style="font-size: 12px; color: var(--dx-muted);">DETALHES DA COBRANÇA</p>
                    <p style="font-weight: 700; margin-top: 4px;">${charge.student.full_name}</p>
                    <p style="font-size: 14px;">${charge.plan.name} - R$ ${parseFloat(charge.plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                
                ${charge.status === 'pending_payment' ? `
                    <button id="mark-paid-btn" class="btn btn-primary" style="background: var(--dx-success); color: #000;">
                        <i class="ph-bold ph-check-circle" style="margin-right: 8px;"></i> CONFIRMAR PAGAMENTO MANUAL
                    </button>
                ` : ''}
                
                <button id="cancel-charge-btn" class="btn" style="border: 1px solid var(--dx-border); color: var(--dx-danger);">
                    <i class="ph ph-x-circle" style="margin-right: 8px;"></i> CANCELAR COBRANÇA
                </button>
            </div>
        `;

        ui.bottomSheet.show('Gerenciar Cobrança', content, async () => {});

        // Override the default onSave since we have multiple buttons
        const sheet = document.getElementById('sheet-overlay');
        
        sheet.querySelector('#mark-paid-btn')?.addEventListener('click', async () => {
            const { error } = await supabase.from('student_plans').update({ status: 'active' }).eq('id', charge.id);
            if (error) toast.show(error.message, 'error');
            else {
                toast.show('Pagamento confirmado!');
                sheet.classList.add('closing');
                setTimeout(() => { sheet.remove(); this.loadCharges(); }, 300);
            }
        });

        sheet.querySelector('#cancel-charge-btn').addEventListener('click', async () => {
            const { error } = await supabase.from('student_plans').update({ status: 'cancelled' }).eq('id', charge.id);
            if (error) toast.show(error.message, 'error');
            else {
                toast.show('Cobrança cancelada.');
                sheet.classList.add('closing');
                setTimeout(() => { sheet.remove(); this.loadCharges(); }, 300);
            }
        });
    },

    getStatusLabel(status) {
        const labels = { 'active': 'PAGO', 'pending_payment': 'PENDENTE', 'expired': 'VENCIDO', 'cancelled': 'CANCELADA' };
        return labels[status] || status.toUpperCase();
    },

    getStatusClass(status) {
        const classes = { 'active': 'badge-active', 'pending_payment': 'badge-pending', 'expired': 'badge-overdue', 'cancelled': 'badge-cancelled' };
        return classes[status] || '';
    },

    setupFilters() {
        const filters = document.querySelectorAll('.filter-btn');
        filters.forEach(btn => {
            btn.addEventListener('click', () => {
                filters.forEach(f => f.classList.remove('active'));
                btn.classList.add('active');
                this.loadCharges(btn.dataset.status);
            });
        });
    }
};