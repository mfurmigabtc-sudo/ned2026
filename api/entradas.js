const { getSupabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });

    const convidadoId = parseInt(req.query.id);
    if (!convidadoId || convidadoId <= 0) {
        return res.status(400).json({ erro: 'ID do convidado inválido.' });
    }

    const supabase = getSupabase();

    try {
        // Buscar convidado
        const { data: convidado, error: errConvidado } = await supabase
            .from('convidados')
            .select('*')
            .eq('id', convidadoId)
            .single();

        if (errConvidado || !convidado) {
            return res.status(404).json({ erro: 'Convidado não encontrado.' });
        }

        // Buscar entradas
        const { data: entradas, error: errEntradas } = await supabase
            .from('entradas')
            .select('*')
            .eq('convidado_id', convidadoId)
            .order('numero', { ascending: true });

        if (errEntradas) throw errEntradas;

        return res.status(200).json({ convidado, entradas });

    } catch (err) {
        console.error('Erro ao buscar entradas:', err);
        return res.status(500).json({ erro: 'Erro interno ao buscar entradas.' });
    }
};
