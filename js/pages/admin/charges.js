import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui } from '../../ui.js';

export const adminCharges = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800;">FINANCEIRO</h1>
                    <div style="display: flex; gap: 8px;">
                        <button id="add-charge-btn" class="btn btn-primary" style="width: auto; padding: 10px 16px;">
                            <i class="ph ph-plus-circle" style="font-size: 20px;"></i>
                        </button>
                        <button id="refresh-charges-btn" class="btn" style="width: auto; padding: 10px; color: var(--dx-teal);">
                            <i class="ph ph-arrows-clockwise" style="font-size: 24px;"></i>
                        </button>
                    </div>
                </div>

                <div class="input-group" style="margin-bottom: 16px;">
                    <input type="text" id="search-charge-input" class="input-control" placeholder="Buscar por nome do aluno..." style="padding: 10px 14px; font-size: 14px;">
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
        this.setupSearch();
        document.getElementById('refresh-charges-btn').addEventListener('click', () => this.loadCharges());
        document.getElementById('add-charge-btn').addEventListener('click', () => this.showAddChargeForm());
    },

    setupSearch() {
        const input = document.getElementById('search-charge-input');
        input.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.charge-item-card');
            cards.forEach(card => {
                const name = card.querySelector('p').textContent.toLowerCase();
                card.style.display = name.includes(term) ? 'block' : 'none';
            });
        });
    },

    async showAddChargeForm() {
        toast.show('Carregando alunos...');
        const { data: students } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('role', 'student')
            .order('full_name');

        const formHtml = `
            <form id="manual-charge-form">
                <div class="input-group">
                    <label>ALUNO / CLIENTE</label>
                    <select name="student_id" class="input-control" required>
                        <option value="">Selecione um aluno...</option>
                        ${students?.map(s => `<option value="${s.id}">${s.full_name} (${s.email})</option>`).join('')}
                    </select>
                </div>
                <div class="input-group">
                    <label>DESCRIÇÃO DA COBRANÇA</label>
                    <input type="text" name="description" class="input-control" placeholder="Ex: Avaliação Física / Aula Avulsa" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div class="input-group">
                        <label>VALOR (R$)</label>
                        <input type="number" step="0.01" name="price" class="input-control" placeholder="0,00" required>
                    </div>
                    <div class="input-group">
                        <label>FORMA INICIAL</label>
                        <select name="payment_method" class="input-control">
                            <option value="pix">PIX</option>
                            <option value="boleto">Boleto</option>
                            <option value="credit_card">Cartão</option>
                        </select>
                    </div>
                </div>
                <p style="font-size: 11px; color: var(--dx-muted); margin-bottom: 16px;">
                    * Esta ação gera uma intenção de cobrança vinculada ao aluno.
                </p>
                <button type="submit" class="btn btn-primary" style="margin-top: 8px;">GERAR COBRANÇA</button>
            </form>
        `;

        ui.bottomSheet.show('Nova Cobrança Manual', formHtml, async (data) => {
            const adminId = (await supabase.auth.getUser()).data.user.id;
            
            // 1. Criar um "plano customizado" ou serviço avulso
            // Na spec, serviços avulsos (fisio) são comuns.
            // Para cobrança manual, vamos registrar como um plano de id fixo de "Serviço Avulso" ou nulo
            const { error } = await supabase.from('student_plans').insert([{
                student_id: data.student_id,
                purchased_by: adminId,
                status: 'pending_payment',
                // Aqui usaríamos colunas customizadas se existissem. 
                // Como não existem no banco padrão, vamos usar o plano 'Fisio Sessão Avulsa' (ID 6 na spec) como placeholder
                // ou simplesmente criar o registro.
            }]);

            if (error) throw error;
            toast.show('Cobrança manual registrada!');
            this.loadCharges();
        });
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
                            <p style="font-weight: 700; font-size: 15px;">${charge.student?.full_name || 'Aluno Removido'}</p>
                            <p style="font-size: 12px; color: var(--dx-muted);">${charge.plan?.name || 'Cobrança Avulsa'} • ${date}</p>
                        </div>
                        <span class="badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                        <p style="font-weight: 800; color: var(--dx-teal);">R$ ${parseFloat(charge.plan?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
                    <p style="font-weight: 700; margin-top: 4px;">${charge.student?.full_name || 'Aluno'}</p>
                    <p style="font-size: 14px;">${charge.plan?.name || 'Cobrança Avulsa'} - R$ ${parseFloat(charge.plan?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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