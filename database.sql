-- =============================================
-- NED 2026 - Sistema de QR Code para Eventos
-- =============================================

CREATE DATABASE IF NOT EXISTS ned2026
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ned2026;

-- Tabela de convidados
CREATE TABLE IF NOT EXISTS convidados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabela de entradas (QR Codes)
CREATE TABLE IF NOT EXISTS entradas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  convidado_id INT NOT NULL,
  codigo VARCHAR(64) NOT NULL UNIQUE,
  numero INT NOT NULL,
  utilizado TINYINT(1) DEFAULT 0,
  utilizado_em DATETIME DEFAULT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (convidado_id) REFERENCES convidados(id) ON DELETE CASCADE,
  INDEX idx_codigo (codigo)
) ENGINE=InnoDB;
