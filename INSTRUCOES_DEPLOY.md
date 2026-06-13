# Guia de Implantação (Vercel + Supabase)

Este documento descreve os passos necessários para implantar o sistema **NED 2026 - Controle de Evento** utilizando o **Supabase** como banco de dados e a **Vercel** para hospedagem do frontend e da API (Serverless Functions).

---

## 🚀 Passo 1: Preparar o Banco de Dados no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com/).
2. Crie um novo projeto (ex: `ned2026`).
3. No painel lateral do Supabase, clique em **SQL Editor**.
4. Clique em **New Query** (Nova consulta) e cole o conteúdo do arquivo `supabase.sql`.
5. Clique em **Run** (Executar). Isso criará as tabelas `convidados` e `entradas` com as chaves estrangeiras e índices necessários.

---

## 🔑 Passo 2: Obter as Credenciais da API do Supabase

No painel do Supabase do seu projeto:
1. Acesse **Project Settings** (Configurações do Projeto) > **API**.
2. Copie os seguintes valores:
   - **Project URL** (ex: `https://your-project.supabase.co`)
   - **service_role** API Key (Esta chave permite que as funções serverless editem o banco de dados. **Nunca** a exponha no frontend).

---

## 💻 Passo 3: Testar Localmente (Opcional)

Se você desejar rodar o projeto localmente com as Serverless Functions do Vercel antes de subir:
1. Instale globalmente o Vercel CLI caso não possua:
   ```bash
   npm install -g vercel
   ```
2. Crie um arquivo chamado `.env` na raiz do seu projeto (baseado em `.env.example`) e configure as credenciais:
   ```env
   SUPABASE_URL=https://sua-url-do-supabase.supabase.co
   SUPABASE_SERVICE_KEY=sua-chave-service-role-aqui
   ```
3. Execute o servidor de desenvolvimento local da Vercel:
   ```bash
   npm run dev
   ```
O sistema estará rodando em `http://localhost:3000`, processando requisições com a API Node.js e salvando diretamente no Supabase.

---

## 🐙 Passo 4: Criar Repositório no GitHub e Enviar o Código

1. Crie um repositório vazio no seu GitHub (ex: `ned2026`).
2. Abra o terminal na pasta do projeto e execute:
   ```bash
   git init
   git add .
   git commit -m "Migração para Vercel e Supabase"
   git branch -M main
   git remote add origin https://github.com/seu-usuario/ned2026.git
   git push -u origin main
   ```

*(Nota: O arquivo `.gitignore` já está configurado para não enviar a pasta `node_modules` nem arquivos `.env` confidenciais ao GitHub).*

---

## ⚡ Passo 5: Publicar na Vercel

1. Acesse [vercel.com](https://vercel.com/) e crie uma conta gratuita (conectando com o seu GitHub).
2. Clique em **Add New...** > **Project**.
3. Importe o repositório `ned2026` que você acabou de criar.
4. Na tela de configuração de build, expanda a seção **Environment Variables** (Variáveis de Ambiente) e adicione as seguintes variáveis:
   - Nome: `SUPABASE_URL` | Valor: *[Sua URL do Supabase]*
   - Nome: `SUPABASE_SERVICE_KEY` | Valor: *[Sua chave service_role]*
5. Clique em **Deploy**.

Pronto! Em poucos segundos a Vercel gerará o link público do seu sistema (ex: `https://ned2026.vercel.app`), com tudo funcionando perfeitamente em produção de forma 100% gratuita.
