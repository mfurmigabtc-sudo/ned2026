// =============================================
// NED 2026 - QR Code Event Control System
// =============================================

const API_URL = '/api';
const TICKET_IMG_SRC = 'QR_entrada.png';

// Invitation image dimensions: 572 x 1280
// White QR space position (fine-tuned):
const TICKET_W = 572;
const TICKET_H = 1280;
const QR_AREA_X = 168;
const QR_AREA_Y = 945;
const QR_AREA_W = 240;
const QR_AREA_H = 240;

// Preload ticket image
let ticketImage = null;
const ticketImg = new Image();
ticketImg.crossOrigin = 'anonymous';
ticketImg.onload = () => { ticketImage = ticketImg; };
ticketImg.src = TICKET_IMG_SRC;

// Store generated ticket canvases for download
let generatedTickets = [];
let currentGuestName = '';

// --- QR Code Helper ---
function generateQRCanvas(text, size) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();

    const moduleCount = qr.getModuleCount();
    const cellSize = Math.floor(size / moduleCount);
    const actualSize = cellSize * moduleCount;

    const canvas = document.createElement('canvas');
    canvas.width = actualSize;
    canvas.height = actualSize;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, actualSize, actualSize);

    ctx.fillStyle = '#1a1a2e';
    for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
            if (qr.isDark(row, col)) {
                ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }
    }

    return canvas;
}

// --- Compose ticket image ---
function composeTicket(targetCanvas, nome, codigo, numero) {
    return new Promise((resolve, reject) => {
        const draw = () => {
            drawTicket(targetCanvas, nome, codigo, numero);
            resolve();
        };

        if (!ticketImage) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => { ticketImage = img; draw(); };
            img.onerror = reject;
            img.src = TICKET_IMG_SRC;
        } else {
            draw();
        }
    });
}

function drawTicket(canvas, nome, codigo, numero) {
    canvas.width = TICKET_W;
    canvas.height = TICKET_H;
    const ctx = canvas.getContext('2d');

    // Draw invitation background
    ctx.drawImage(ticketImage, 0, 0, TICKET_W, TICKET_H);

    // Generate QR code
    const qrSize = QR_AREA_W - 16;
    const qrCanvas = generateQRCanvas(codigo, qrSize);

    // Center QR in the white area
    const qrX = QR_AREA_X + (QR_AREA_W - qrCanvas.width) / 2;
    const qrY = QR_AREA_Y + (QR_AREA_H - qrCanvas.height) / 2;
    ctx.drawImage(qrCanvas, qrX, qrY);

    // Guest name + entry number bar below QR
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const nameY = QR_AREA_Y + QR_AREA_H + 10;
    const barH = 36;
    const barX = 60;
    const barW = TICKET_W - 120;

    // Dark background bar
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    roundRect(ctx, barX, nameY, barW, barH, 8);
    ctx.fill();

    // Guest name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, Arial, sans-serif';
    let displayName = nome.toUpperCase();
    while (ctx.measureText(displayName).width > barW - 20 && displayName.length > 3) {
        displayName = displayName.slice(0, -4) + '...';
    }
    ctx.fillText(displayName, TICKET_W / 2, nameY + 5);

    // Entry number badge
    const numY = nameY + barH + 8;
    const numH = 24;
    const numW = 100;
    const numX = (TICKET_W - numW) / 2;

    ctx.fillStyle = 'rgba(138, 92, 246, 0.9)';
    roundRect(ctx, numX, numY, numW, numH, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Inter, Arial, sans-serif';
    ctx.fillText(`Nº ${numero}`, TICKET_W / 2, numY + 5);

    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// --- Download all tickets as ZIP ---
async function downloadAllTicketsZip(tickets, guestName) {
    const zip = new JSZip();
    const folder = zip.folder(`Ingressos_NED2026_${guestName.replace(/\s+/g, '_')}`);

    for (let i = 0; i < tickets.length; i++) {
        const { canvas, numero } = tickets[i];
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        folder.file(`Ingresso_${guestName.replace(/\s+/g, '_')}_N${numero}.png`, base64, { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Ingressos_NED2026_${guestName.replace(/\s+/g, '_')}.zip`;
    link.click();
    URL.revokeObjectURL(link.href);

    showToast(`📥 ${tickets.length} ingressos baixados!`, 'success');
}

// --- Tab Navigation ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`panel-${tab}`).classList.add('active');
        if (tab === 'lista') carregarConvidados();
    });
});

// =============================================
// 1. GERAR INGRESSOS
// =============================================

const formGerar = document.getElementById('form-gerar');
const inputNome = document.getElementById('input-nome');
const btnGerar = document.getElementById('btn-gerar');
const ingressoResultado = document.getElementById('ingresso-resultado');
const resultadoNome = document.getElementById('resultado-nome');
const ingressosGrid = document.getElementById('ingressos-grid');
const btnDownloadTodos = document.getElementById('btn-download-todos');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

formGerar.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = inputNome.value.trim();
    if (!nome) return;

    btnGerar.disabled = true;
    btnGerar.innerHTML = '<span class="spinner"></span> Gerando...';

    try {
        const res = await fetch(`${API_URL}/gerar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome })
        });

        const data = await res.json();

        if (data.erro) {
            showToast(data.erro, 'error');
            return;
        }

        // Show results area
        resultadoNome.textContent = `🎫 ${data.convidado.nome} — 20 entradas`;
        currentGuestName = data.convidado.nome;
        generatedTickets = [];
        ingressosGrid.innerHTML = '';
        ingressoResultado.classList.remove('hidden');

        // Show progress
        progressContainer.classList.remove('hidden');
        progressFill.style.width = '0%';

        // Generate all 20 ticket images
        for (let i = 0; i < data.entradas.length; i++) {
            const entrada = data.entradas[i];

            // Create ticket card
            const item = document.createElement('div');
            item.className = 'ingresso-item';

            const canvas = document.createElement('canvas');
            canvas.className = 'ingresso-canvas';
            item.appendChild(canvas);

            // Entry number label
            const label = document.createElement('span');
            label.className = 'ingresso-numero';
            label.textContent = `Nº ${entrada.numero}`;
            item.appendChild(label);

            // Individual download button
            const dlBtn = document.createElement('button');
            dlBtn.className = 'btn-download-single';
            dlBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
            dlBtn.title = 'Baixar este ingresso';
            item.appendChild(dlBtn);

            ingressosGrid.appendChild(item);

            // Compose ticket
            await composeTicket(canvas, data.convidado.nome, entrada.codigo, entrada.numero);

            // Store for batch download
            generatedTickets.push({ canvas, numero: entrada.numero });

            // Individual download click
            dlBtn.addEventListener('click', () => {
                const link = document.createElement('a');
                link.download = `Ingresso_NED2026_${currentGuestName.replace(/\s+/g, '_')}_N${entrada.numero}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });

            // Update progress
            const pct = Math.round(((i + 1) / data.entradas.length) * 100);
            progressFill.style.width = `${pct}%`;
            progressText.textContent = `Gerando ingresso ${i + 1} de ${data.entradas.length}...`;

            // Small delay to prevent UI freeze
            await new Promise(r => setTimeout(r, 50));
        }

        // Hide progress, show success
        progressContainer.classList.add('hidden');
        inputNome.value = '';
        showToast(`✅ 20 ingressos gerados para ${data.convidado.nome}!`, 'success');

        // Scroll to results
        ingressoResultado.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
        console.error(err);
        showToast('Erro ao gerar ingressos. Verifique a conexão.', 'error');
        progressContainer.classList.add('hidden');
    } finally {
        btnGerar.disabled = false;
        btnGerar.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Gerar
        `;
    }
});

// Download all as ZIP
btnDownloadTodos.addEventListener('click', () => {
    if (generatedTickets.length === 0) {
        showToast('Nenhum ingresso para baixar.', 'warning');
        return;
    }
    downloadAllTicketsZip(generatedTickets, currentGuestName);
});

// =============================================
// 2. VALIDAR PRESENÇA (Scanner)
// =============================================

let html5QrCode = null;
let isScanning = false;
let lastScannedCode = '';
let scanCooldown = false;

const btnIniciar = document.getElementById('btn-iniciar-scanner');
const btnParar = document.getElementById('btn-parar-scanner');
const btnValidarManual = document.getElementById('btn-validar-manual');
const inputCodigo = document.getElementById('input-codigo');
const validacaoResultado = document.getElementById('validacao-resultado');

btnIniciar.addEventListener('click', iniciarScanner);
btnParar.addEventListener('click', pararScanner);
btnValidarManual.addEventListener('click', () => {
    const codigo = inputCodigo.value.trim();
    if (codigo) validarCodigo(codigo);
});

inputCodigo.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const codigo = inputCodigo.value.trim();
        if (codigo) validarCodigo(codigo);
    }
});

async function iniciarScanner() {
    try {
        html5QrCode = new Html5Qrcode("reader");
        
        try {
            // Tenta iniciar com a câmera traseira
            await html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
                onScanSuccess,
                () => {}
            );
        } catch (backErr) {
            console.warn("Falha ao abrir câmera traseira, tentando câmeras disponíveis:", backErr);
            // Fallback: lista as câmeras e abre a primeira disponível
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                await html5QrCode.start(
                    devices[0].id,
                    { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
                    onScanSuccess,
                    () => {}
                );
            } else {
                throw new Error("Nenhuma câmera encontrada no dispositivo.");
            }
        }

        isScanning = true;
        btnIniciar.classList.add('hidden');
        btnParar.classList.remove('hidden');
    } catch (err) {
        console.error('Erro ao iniciar câmera:', err);
        showToast('Erro ao acessar câmera. Verifique as permissões.', 'error');
    }
}

async function pararScanner() {
    if (html5QrCode && isScanning) {
        try { await html5QrCode.stop(); } catch(e) {}
        html5QrCode = null;
        isScanning = false;
        btnIniciar.classList.remove('hidden');
        btnParar.classList.add('hidden');
        document.getElementById('reader').innerHTML = '';
    }
}

function onScanSuccess(decodedText) {
    if (scanCooldown || decodedText === lastScannedCode) return;
    lastScannedCode = decodedText;
    scanCooldown = true;
    validarCodigo(decodedText);
    setTimeout(() => { scanCooldown = false; lastScannedCode = ''; }, 3000);
}

async function validarCodigo(codigo) {
    try {
        const res = await fetch(`${API_URL}/validar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo })
        });

        const data = await res.json();

        validacaoResultado.classList.remove('hidden', 'status-confirmado', 'status-usado', 'status-invalido');
        validacaoResultado.classList.add(`status-${data.status}`);

        let icon = '❌';
        if (data.status === 'confirmado') icon = '✅';
        else if (data.status === 'usado') icon = '⚠️';

        let detalhes = '';
        if (data.convidado) {
            detalhes = `<p class="resultado-detalhe"><strong>${data.convidado}</strong> — Entrada Nº ${data.numero}</p>`;
        }
        if (data.utilizado_em) {
            detalhes += `<p class="resultado-detalhe">Usado em: ${formatDate(data.utilizado_em)}</p>`;
        }

        validacaoResultado.innerHTML = `
            <span class="resultado-icon">${icon}</span>
            <p class="resultado-mensagem">${data.mensagem}</p>
            ${detalhes}
        `;

        validacaoResultado.style.animation = 'none';
        validacaoResultado.offsetHeight;
        validacaoResultado.style.animation = '';

        if (data.status === 'confirmado') playBeep(800, 150);
        else playBeep(300, 300);

        inputCodigo.value = '';

    } catch (err) {
        console.error(err);
        showToast('Erro ao validar código.', 'error');
    }
}

// =============================================
// 3. LISTA DE CONVIDADOS
// =============================================

async function carregarConvidados() {
    const container = document.getElementById('lista-convidados');
    container.innerHTML = '<p class="loading">Carregando...</p>';

    try {
        const res = await fetch(`${API_URL}/listar`);
        const data = await res.json();

        if (!data.convidados || data.convidados.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                    </svg>
                    <p>Nenhum convidado cadastrado ainda.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.convidados.map(c => {
            const usadas = parseInt(c.entradas_usadas) || 0;
            const total = parseInt(c.total_entradas) || 0;
            return `
                <div class="convidado-item" onclick="verDetalhes(${c.id})" title="Ver Ingressos">
                    <div class="convidado-info">
                        <span class="convidado-nome">🎫 ${escapeHtml(c.nome)}</span>
                        <span class="convidado-data">${formatDate(c.criado_em)}</span>
                    </div>
                    <div class="convidado-badges">
                        <span class="badge badge-total">${total} entradas</span>
                        <span class="badge badge-used">${usadas} usadas</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="loading">Erro ao carregar convidados.</p>';
    }
}

// --- Ver detalhes / ingressos de um convidado ---
async function verDetalhes(convidadoId) {
    const modal = document.getElementById('modal-overlay');
    const titulo = document.getElementById('modal-titulo');
    const conteudo = document.getElementById('modal-conteudo');
    const btnModalDl = document.getElementById('btn-modal-download');

    titulo.textContent = 'Carregando...';
    conteudo.innerHTML = '<p class="loading">Carregando ingressos...</p>';
    btnModalDl.classList.add('hidden');
    modal.classList.remove('hidden');

    try {
        const res = await fetch(`${API_URL}/entradas?id=${convidadoId}`);
        const data = await res.json();

        if (data.erro) {
            titulo.textContent = 'Erro';
            conteudo.innerHTML = `<p>${data.erro}</p>`;
            return;
        }

        titulo.textContent = `🎫 ${data.convidado.nome} — ${data.entradas.length} entradas`;
        conteudo.innerHTML = '';
        conteudo.className = 'modal-conteudo modal-grid';

        const modalTickets = [];

        for (const entrada of data.entradas) {
            const item = document.createElement('div');
            item.className = 'modal-entrada';

            const canvas = document.createElement('canvas');
            canvas.className = 'modal-ticket-canvas';
            item.appendChild(canvas);

            const statusBar = document.createElement('div');
            statusBar.className = `entrada-status-bar ${entrada.utilizado ? 'status-usado' : 'status-disponivel'}`;
            statusBar.innerHTML = entrada.utilizado
                ? `⚠️ Usada — ${formatDate(entrada.utilizado_em)}`
                : `✅ Nº ${entrada.numero} — Disponível`;
            item.appendChild(statusBar);

            conteudo.appendChild(item);

            await composeTicket(canvas, data.convidado.nome, entrada.codigo, entrada.numero);
            modalTickets.push({ canvas, numero: entrada.numero });

            await new Promise(r => setTimeout(r, 30));
        }

        // Show download button
        btnModalDl.classList.remove('hidden');
        btnModalDl.onclick = () => {
            downloadAllTicketsZip(modalTickets, data.convidado.nome);
        };

    } catch (err) {
        console.error(err);
        titulo.textContent = 'Erro';
        conteudo.innerHTML = '<p>Erro ao carregar dados.</p>';
    }
}

// --- Fechar modal ---
document.getElementById('btn-fechar-modal').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.add('hidden');
});

document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.add('hidden');
    }
});

// =============================================
// UTILITIES
// =============================================

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function playBeep(frequency, duration) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = frequency;
        osc.type = 'sine';
        gain.gain.value = 0.15;
        osc.start();
        osc.stop(ctx.currentTime + duration / 1000);
    } catch (e) {}
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('modal-overlay').classList.add('hidden');
    }
});
