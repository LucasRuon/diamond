export const qrCode = {
    generate(containerId, token, size = 200) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = ''; // Limpa anterior
        
        try {
            new QRCode(container, {
                text: token,
                width: size,
                height: size,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (err) {
            console.error('Erro ao gerar QR Code:', err);
            container.innerHTML = '<p style="color: var(--dx-danger);">Erro ao gerar QR Code.</p>';
        }
    }
};