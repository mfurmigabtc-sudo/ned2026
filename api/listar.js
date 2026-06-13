const { getSupabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });

    const supabase = getSupabase();

    try {
        // Buscar todos os convidados com contagem de entradas
        const { data: convidados, error } = await supabase
            .from('convidados')
            .select('id, nome, criado_em, entradas(id, utilizado)')
            .order('criado_em', { ascending: false });

        if (error) throw error;

        const resultado = convidados.map((c) => {
            const total = c.entradas ? c.entradas.length : 0;
            const usadas = c.entradas ? c.entradas.filter(e => e.utilizado).length : 0;
            return {
                id: c.id,
                nome: c.nome,
                criado_em: c.criado_em,
                total_entradas: total,
                entradas_usadas: usadas
            };
        });

        return res.status(200).json({ convidados: resultado });

    } catch (err) {
        console.error('Erro ao listar:', err);
        return res.status(500).json({ erro: 'Erro interno ao listar convidados.' });
    }
};
