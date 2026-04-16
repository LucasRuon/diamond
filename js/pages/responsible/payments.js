import { supabase } from '../../supabase.js';

export const responsiblePayments = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 24px;">MINHAS FATURAS</h1>
                
                <div id="payments-list" style="display: flex; flex-direction: column; gap: 16px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Buscando cobranças...</p>
                </div>
            </div>
        `;

        this.loadPayments();
    },

    async loadPayments() {
        const container = document.getElementById('payments-list');
        const userId = (await supabase.auth.getUser()).data.user.id;

        // Fetch plans purchased by this user
        const { data: payments, error } = await supabase
            .from('student_plans')
            .select(`
                id,
                status,
                created_at,
                student:users!student_id (full_name),
                plan:plans (name, price)
            `)
            .eq('purchased_by', userId)
            .order('created_at', { ascending: false });

        if (error) {
            container.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar faturas.</p>`;
            return;
        }

        if (payments.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; margin-top: 60px;">
                    <i class="ph ph-receipt" style="font-size: 48px; color: var(--dx-border); margin-bottom: 16px;"></i>
                    <p style="color: var(--dx-muted);">Nenhuma fatura encontrada.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = payments.map(payment => {
            const date = new Date(payment.created_at).toLocaleDateString('pt-BR');
            const statusLabel = this.getStatusLabel(payment.status);
            const statusClass = this.getStatusClass(payment.status);

            return `
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <p style="font-size: 11px; color: var(--dx-muted); font-weight: 700; text-transform: uppercase;">${date}</p>
                            <p style="font-weight: 700; font-size: 16px;">${payment.plan.name}</p>
                            <p style="font-size: 13px; color: var(--dx-teal);">Aluno: ${payment.student.full_name}</p>
                        </div>
                        <span class="badge ${statusClass}">${statusLabel}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 0.5px solid var(--dx-border);">
                        <p style="font-weight: 800; font-size: 18px;">R$ ${parseFloat(payment.plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        ${payment.status === 'pending_payment' ? `
                            <button class="btn btn-primary pay-btn" data-id="${payment.id}" style="width: auto; padding: 8px 16px; font-size: 12px;">
                                PAGAR AGORA
                            </button>
                        ` : `
                            <button class="btn" style="width: auto; padding: 8px 16px; font-size: 12px; border: 1px solid var(--dx-border); color: var(--dx-muted);">
                                COMPROVANTE
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    },

    getStatusLabel(status) {
        const labels = {
            'active': 'PAGO',
            'pending_payment': 'PENDENTE',
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