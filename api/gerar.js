const crypto = require('crypto');
const { getSupabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

    const { nome } = req.body || {};
    if (!nome || !nome.trim()) {
        return res.status(400).json({ erro: 'Nome do convidado é obrigatório.' });
    }

    const supabase = getSupabase();

    try {
        // Inserir convidado
        const { data: convidado, error: errConvidado } = await supabase
            .from('convidados')
            .insert({ nome: nome.trim() })
            .select('id, nome')
            .single();

        if (errConvidado) throw errConvidado;

        // Gerar numeração aleatória (100-999) sem repetição
        const numeros = [];
        const pool = Array.from({ length: 900 }, (_, i) => i + 100);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const selectedNums = pool.slice(0, 20);

        // Gerar 20 entradas
        const entradasInsert = selectedNums.map(numero => {
            const hash = crypto.randomBytes(4).toString('hex').toUpperCase();
            const codigo = `NED2026-${convidado.id}-${numero}-${hash}`;
            return {
                convidado_id: convidado.id,
                codigo,
                numero
            };
        });

        const { data: entradas, error: errEntradas } = await supabase
            .from('entradas')
            .insert(entradasInsert)
            .select('numero, codigo');

        if (errEntradas) throw errEntradas;

        // Ordenar por número
        entradas.sort((a, b) => a.numero - b.numero);

        return res.status(200).json({
            sucesso: true,
            convidado: { id: convidado.id, nome: convidado.nome },
            entradas
        });

    } catch (err) {
        console.error('Erro ao gerar:', err);
        return res.status(500).json({ erro: 'Erro interno ao gerar ingressos.' });
    }
};
