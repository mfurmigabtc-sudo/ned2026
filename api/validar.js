const { getSupabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

    const { codigo } = req.body || {};
    if (!codigo || !codigo.trim()) {
        return res.status(400).json({ erro: 'Código QR é obrigatório.' });
    }

    const supabase = getSupabase();

    try {
        // Buscar entrada com dados do convidado
        const { data: entrada, error: errBusca } = await supabase
            .from('entradas')
            .select('*, convidados(nome)')
            .eq('codigo', codigo.trim())
            .single();

        if (errBusca || !entrada) {
            return res.status(200).json({
                status: 'invalido',
                mensagem: '❌ QR Code inválido! Código não encontrado.'
            });
        }

        const nomeConvidado = entrada.convidados?.nome || 'Desconhecido';

        // Já utilizado?
        if (entrada.utilizado) {
            return res.status(200).json({
                status: 'usado',
                mensagem: '⚠️ Entrada já utilizada!',
                convidado: nomeConvidado,
                numero: entrada.numero,
                utilizado_em: entrada.utilizado_em
            });
        }

        // Marcar como utilizado
        const { error: errUpdate } = await supabase
            .from('entradas')
            .update({ utilizado: true, utilizado_em: new Date().toISOString() })
            .eq('id', entrada.id);

        if (errUpdate) throw errUpdate;

        return res.status(200).json({
            status: 'confirmado',
            mensagem: '✅ Presença Confirmada!',
            convidado: nomeConvidado,
            numero: entrada.numero
        });

    } catch (err) {
        console.error('Erro ao validar:', err);
        return res.status(500).json({ erro: 'Erro interno ao validar.' });
    }
};
