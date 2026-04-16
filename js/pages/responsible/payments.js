import { supabase } from '../../supabase.js';

export const responsiblePayments = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 24px;">FATURAS E PAGAMENTOS</h1>
                
                <div id="payments-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Buscando faturas...</p>
                </div>
            </div>
        `;

        this.loadPayments();
    },

    async loadPayments() {
        const listContainer = document.getElementById('payments-list');
        const userId = (await supabase.auth.getUser()).data.user.id;

        const { data: payments, error } = await supabase
            .from('student_plans')
            .select(`
                id,
                created_at,
                status,
                plan:plans(name, price),
                student:users!student_id(full_name)
            `)
            .eq('purchased_by', userId)
            .order('created_at', { ascending: false });

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar faturas.</p>`;
            return;
        }

        if (payments.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; margin-top: 60px; padding: 20px;">
                    <i class="ph ph-receipt" style="font-size: 48px; color: var(--dx-border); margin-bottom: 16px;"></i>
                    <p style="color: var(--dx-muted);">Você ainda não possui faturas geradas.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = payments.map(p => {
            const date = new Date(p.created_at).toLocaleDateString('pt-BR');
            const statusLabel = this.getStatusLabel(p.status);
            const statusClass = this.getStatusClass(p.status);

            return `
                <div class="card" style="padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <p style="font-weight: 800; font-size: 16px;">${p.plan.name}</p>
                            <p style="font-size: 12px; color: var(--dx-muted);">Para: ${p.student.full_name} • ${date}</p>
                        </div>
                        <p style="font-weight: 800; color: var(--dx-teal);">R$ ${parseFloat(p.plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 0.5px solid var(--dx-border);">
                        <span class="badge ${statusClass}">${statusLabel}</span>
                        ${p.status === 'pending_payment' ? `
                            <button class="btn pay-btn" data-id="${p.id}" style="width: auto; padding: 6px 14px; font-size: 11px; background: var(--dx-teal); color: #000;">
                                PAGAR AGORA
                            </button>
                        ` : `
                            <p style="font-size: 11px; color: var(--dx-muted);">Recibo gerado</p>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    },

    getStatusLabel(status) {
        const labels = {
            'active': 'PAGO',
            'pending_payment': 'AGUARDANDO',
            'expired': 'VENCIDO',
            'cancelled': 'CANCELADO'
        };
        return labels[status] || status.toUpperCase();
    },

    getStatusClass(status) {
        const classes = {
            'active': 'badge-active',
            'pending_payment': 'badge-pending',
            'expired': 'badge-overdue',
            'cancelled': 'badge-cancelled'
        };
        return classes[status] || '';
    }
};