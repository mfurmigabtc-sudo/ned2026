-- =============================================
-- NED 2026 - Supabase (PostgreSQL)
-- Execute no SQL Editor do Supabase
-- =============================================

-- Tabela de convidados
CREATE TABLE IF NOT EXISTS convidados (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de entradas (QR Codes)
CREATE TABLE IF NOT EXISTS entradas (
  id SERIAL PRIMARY KEY,
  convidado_id INTEGER NOT NULL REFERENCES convidados(id) ON DELETE CASCADE,
  codigo VARCHAR(64) NOT NULL UNIQUE,
  numero INTEGER NOT NULL,
  utilizado BOOLEAN DEFAULT FALSE,
  utilizado_em TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para buscas rápidas por código
CREATE INDEX IF NOT EXISTS idx_entradas_codigo ON entradas(codigo);
CREATE INDEX IF NOT EXISTS idx_entradas_convidado ON entradas(convidado_id);
