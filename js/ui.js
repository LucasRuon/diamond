export function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str ?? ''));
    return div.innerHTML;
}

export function safeUrl(url) {
    if (!url) return '#';
    try {
        const u = new URL(url);
        return (u.protocol === 'https:' || u.protocol === 'http:') ? url : '#';
    } catch {
        return '#';
    }
}

export const ui = {
    bottomSheet: {
        show(title, contentHtml, onSave) {
            const overlay = document.createElement('div');
            overlay.id = 'sheet-overlay';
            overlay.innerHTML = `
                <div class="sheet-content">
                    <div class="sheet-header">
                        <div class="sheet-handle"></div>
                        <h3>${title}</h3>
                        <button class="sheet-close"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="sheet-body">
                        ${contentHtml}
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);

            // Close logic
            const close = () => {
                overlay.classList.add('closing');
                setTimeout(() => overlay.remove(), 300);
            };

            overlay.querySelector('.sheet-close').addEventListener('click', close);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });

            // Form submission
            const form = overlay.querySelector('form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    
                    const btn = form.querySelector('button[type="submit"]');
                    const originalText = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="ph ph-circle-notch-bold"></i> SALVANDO...';

                    try {
                        await onSave(data);
                        close();
                    } catch (err) {
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }
                });
            }

            // Animate in
            setTimeout(() => overlay.classList.add('active'), 10);
        }
    },
    mask: {
        cpf(value) {
            return value
                .replace(/\D/g, '')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                .replace(/(-\d{2})\d+?$/, '$1');
        },
        phone(value) {
            return value
                .replace(/\D/g, '')
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2')
                .replace(/(-\d{4})\d+?$/, '$1');
        },
        apply(input, type) {
            input.addEventListener('input', (e) => {
                e.target.value = this[type](e.target.value);
            });
        }
    },
    validate: {
        cpf(cpf) {
            cpf = cpf.replace(/[^\d]+/g, '');
            if (cpf == '' || cpf.length != 11 || /^(\d)\1{10}$/.test(cpf)) return false;
            let add = 0;
            for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
            let rev = 11 - (add % 11);
            if (rev == 10 || rev == 11) rev = 0;
            if (rev != parseInt(cpf.charAt(9))) return false;
            add = 0;
            for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
            rev = 11 - (add % 11);
            if (rev == 10 || rev == 11) rev = 0;
            if (rev != parseInt(cpf.charAt(10))) return false;
            return true;
        }
    }
};

// Add Bottom Sheet Styles
const style = document.createElement('style');
style.textContent = `
    #sheet-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        z-index: 1000;
        display: flex;
        align-items: flex-end;
        opacity: 0;
        transition: opacity 0.3s ease;
        padding-top: 60px;
    }
    #sheet-overlay.active { opacity: 1; }
    #sheet-overlay.closing { opacity: 0; }

    .sheet-content {
        width: 100%;
        background: var(--dx-surface);
        border-radius: 20px 20px 0 0;
        transform: translateY(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        max-height: 90vh;
        display: flex;
        flex-direction: column;
    }
    #sheet-overlay.active .sheet-content { transform: translateY(0); }
    #sheet-overlay.closing .sheet-content { transform: translateY(100%); }

    .sheet-header {
        padding: 12px 20px 20px;
        text-align: center;
        position: relative;
        border-bottom: 0.5px solid var(--dx-border);
    }
    .sheet-handle {
        width: 40px;
        height: 4px;
        background: var(--dx-border);
        border-radius: 2px;
        margin: 0 auto 16px;
    }
    .sheet-header h3 {
        font-family: var(--font-display);
        font-size: 18px;
        text-transform: uppercase;
    }
    .sheet-close {
        position: absolute;
        right: 20px;
        top: 24px;
        color: var(--dx-muted);
        font-size: 24px;
    }
    .sheet-body {
        padding: 24px 20px calc(24px + env(safe-area-inset-bottom));
        overflow-y: auto;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .ph-circle-notch-bold { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);