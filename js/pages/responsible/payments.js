import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui } from '../../ui.js';

export const responsiblePayments = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 24px;">MEUS CONTRATOS</h1>
                
                <div id="payments-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando contratos...</p>
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
                signed_at,
                review_approved,
                plan:plans(name, price, description),
                student:users!student_id(full_name)
            `)
            .eq('purchased_by', userId)
            .order('created_at', { ascending: false });

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar contratos.</p>`;
            return;
        }

        if (payments.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; margin-top: 60px; padding: 20px;">
                    <i class="ph ph-file-text" style="font-size: 48px; color: var(--dx-border); margin-bottom: 16px;"></i>
                    <p style="color: var(--dx-muted);">Você ainda não possui contratos gerados.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = payments.map(p => {
            const date = new Date(p.created_at).toLocaleDateString('pt-BR');
            const statusLabel = this.getStatusLabel(p.status, p.signed_at);
            const statusClass = this.getStatusClass(p.status, p.signed_at);

            return `
                <div class="card contract-item-card" data-id="${p.id}" style="padding: 16px; cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <p style="font-weight: 800; font-size: 16px;">${p.plan.name}</p>
                            <p style="font-size: 12px; color: var(--dx-muted);">Para: ${p.student.full_name} • ${date}</p>
                        </div>
                        <span class="badge ${statusClass}">${statusLabel}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 0.5px solid var(--dx-border);">
                        <p style="font-weight: 800; color: var(--dx-teal);">R$ ${parseFloat(p.plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <div style="display: flex; align-items: center; gap: 4px; color: var(--dx-teal); font-size: 12px; font-weight: 700;">
                            ${p.signed_at ? '<i class="ph-bold ph-check-circle"></i> ASSINADO' : 'VER CONTRATO <i class="ph ph-caret-right"></i>'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.setupEvents(payments);
    },

    setupEvents(payments) {
        document.querySelectorAll('.contract-item-card').forEach(card => {
            card.addEventListener('click', () => {
                const contract = payments.find(p => p.id === card.dataset.id);
                this.showContractModal(contract);
            });
        });
    },

    showContractModal(contract) {
        const content = `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div style="background: var(--dx-surface2); padding: 16px; border-radius: 12px; font-size: 13px; line-height: 1.6; color: var(--dx-text); max-height: 300px; overflow-y: auto; border: 1px solid var(--dx-border);">
                    <h4 style="margin-bottom: 12px; color: var(--dx-teal); text-align: center;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h4>
                    <p>Pelo presente instrumento, a <strong>DIAMOND X</strong> e o contratante <strong>${contract.student.full_name}</strong> celebram o presente acordo para o plano <strong>${contract.plan.name}</strong>.</p>
                    <p style="margin-top: 12px;"><strong>1. DO OBJETO:</strong> O serviço compreende o treinamento e capacitação conforme descrição: ${contract.plan.description || 'Treinamento esportivo'}.</p>
                    <p style="margin-top: 12px;"><strong>2. DO PAGAMENTO:</strong> O valor total de R$ ${contract.plan.price} deve ser quitado conforme o método escolhido.</p>
                    <p style="margin-top: 12px;"><strong>3. DA ASSINATURA:</strong> Ao clicar no botão abaixo, o contratante declara ter revisado as informações e aceita integralmente os termos aqui descritos.</p>
                </div>

                ${!contract.signed_at ? `
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                        <button id="sign-contract-btn" class="btn btn-primary" style="background: var(--dx-teal); color: #000;">
                            APROVAR REVISÃO E ASSINAR
                        </button>
                    </div>
                ` : `
                    <div style="text-align: center; padding: 12px; background: var(--dx-teal-dim); border-radius: 8px; border: 1px solid var(--dx-teal-border);">
                        <p style="color: var(--dx-teal); font-weight: 700; font-size: 13px;">
                            <i class="ph-bold ph-check-circle"></i> CONTRATO ASSINADO EM ${new Date(contract.signed_at).toLocaleDateString('pt-BR')}
                        </p>
                        <p style="font-size: 10px; color: var(--dx-muted); margin-top: 4px;">ID de Assinatura: ${contract.id.split('-')[0]}</p>
                    </div>
                `}
            </div>
        `;

        ui.bottomSheet.show('Documentação do Plano', content, () => {});

        const sheet = document.getElementById('sheet-overlay');
        sheet.querySelector('#sign-contract-btn')?.addEventListener('click', async () => {
            try {
                toast.show('Assinando documento...');
                
                const { error } = await supabase
                    .from('student_plans')
                    .update({ 
                        signed_at: new Date().toISOString(),
                        review_approved: true,
                        signature_token: crypto.randomUUID()
                    })
                    .eq('id', contract.id);

                if (error) throw error;

                toast.show('Contrato assinado com sucesso! ✍️');
                sheet.classList.add('closing');
                setTimeout(() => { sheet.remove(); this.loadPayments(); }, 300);
            } catch (err) {
                toast.show(err.message, 'error');
            }
        });
    },

    getStatusLabel(status, signedAt) {
        if (!signedAt && status === 'active') return 'AGUARDANDO ASSINATURA';
        const labels = {
            'active': 'PAGO',
            'pending_payment': 'AGUARDANDO PGTO',
            'expired': 'VENCIDO',
            'cancelled': 'CANCELADO'
        };
        return labels[status] || status.toUpperCase();
    },

    getStatusClass(status, signedAt) {
        if (!signedAt && status === 'active') return 'badge-pending';
        const classes = {
            'active': 'badge-active',
            'pending_payment': 'badge-pending',
            'expired': 'badge-overdue',
            'cancelled': 'badge-cancelled'
        };
        return classes[status] || '';
    }
};