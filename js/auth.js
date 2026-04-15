import { supabase } from './supabase.js';

export const auth = {
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        
        if (error) throw error;
        return data;
    },

    async register(email, password, metadata) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });

        if (error) throw error;
        
        // After signup, we should also create a record in our 'users' table
        // This is usually done via a Supabase Trigger, but we can do it manually if needed.
        // For Phase 1, we'll assume the trigger handles it or we'll add it later.
        
        return data;
    },

    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
    }
};

export const toast = {
    show(message, type = 'success') {
        const container = document.getElementById('toasts-container');
        const toastEl = document.createElement('div');
        toastEl.className = `toast toast-${type}`;
        toastEl.innerHTML = `
            <span>${message}</span>
        `;
        
        // Inline styles for toast (can be moved to CSS later)
        Object.assign(toastEl.style, {
            background: type === 'success' ? 'var(--dx-teal)' : 'var(--dx-danger)',
            color: type === 'success' ? 'var(--dx-bg)' : '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            marginBottom: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            fontSize: '14px',
            fontWeight: '600',
            opacity: '0',
            transform: 'translateY(-20px)',
            transition: 'all 0.3s ease'
        });

        container.appendChild(toastEl);
        
        // Force reflow for animation
        setTimeout(() => {
            toastEl.style.opacity = '1';
            toastEl.style.transform = 'translateY(0)';
        }, 10);

        setTimeout(() => {
            toastEl.style.opacity = '0';
            toastEl.style.transform = 'translateY(-20px)';
            setTimeout(() => toastEl.remove(), 300);
        }, 3000);
    }
};

// Also add toasts container styling to pages.css or components.css
const style = document.createElement('style');
style.textContent = `
    #toasts-container {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 90%;
        max-width: 400px;
        pointer-events: none;
    }
`;
document.head.appendChild(style);