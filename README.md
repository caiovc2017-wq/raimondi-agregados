# Raimondi — Gestão de Agregados e Terceirizados

Sistema completo para controle de agregados, lançamentos de horas máquina, cargas m³, abastecimentos e financeiro.

---

## 🚀 Instalação

### Pré-requisitos
- Node.js 18+
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta no [Netlify](https://netlify.com) (gratuita, opcional — apenas para acesso web)

---

## 1️⃣ Configurar o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e cole todo o conteúdo do arquivo `supabase-schema.sql`
3. Execute o SQL — isso cria todas as tabelas, índices e políticas
4. Vá em **Settings → API** e copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`
5. Vá em **Authentication → Users** e crie seu usuário

---

## 2️⃣ Configurar o projeto

```bash
# Clone ou extraia os arquivos
cd raimondi-agregados

# Instale as dependências
npm install

# Copie o arquivo de variáveis de ambiente
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do Supabase:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3️⃣ Rodar em desenvolvimento

### Só no navegador (mais rápido para testar)
```bash
npm run dev
# Acesse http://localhost:5173
```

### Como app Electron (desktop)
```bash
npm run electron:dev
# Abre a janela do desktop automaticamente
```

---

## 4️⃣ Gerar o executável (.exe)

```bash
# Build para Windows
npm run electron:build:win
```

O arquivo `.exe` estará em `dist-electron/`. É um instalador completo que cria atalho na área de trabalho.

---

## 5️⃣ Deploy na Netlify (acesso web remoto)

### Opção A — Via interface (mais fácil)
1. Acesse [netlify.com](https://netlify.com)
2. Clique em **Add new site → Deploy manually**
3. Execute `npm run build` e arraste a pasta `dist/` para o Netlify
4. Nas configurações do site, adicione as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Opção B — Via GitHub (deploy automático)
1. Suba o projeto no GitHub
2. No Netlify: **Add new site → Import from Git**
3. Selecione o repositório
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Adicione as variáveis de ambiente
7. **Deploy!** — A partir daí, cada push atualiza automaticamente

---

## 📁 Estrutura do projeto

```
raimondi-agregados/
├── electron/
│   ├── main.js          # Processo principal do Electron
│   └── preload.js       # Bridge segura entre Electron e React
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.jsx   # Navbar, ribbon, estrutura
│   │   │   └── Layout.css   # Todos os estilos
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Cadastro.jsx
│   │       ├── Lancamentos.jsx
│   │       ├── Abastecimento.jsx
│   │       ├── Contratos.jsx
│   │       ├── Financeiro.jsx
│   │       └── Relatorios.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx  # Autenticação Supabase
│   ├── hooks/
│   │   ├── useAgregados.js
│   │   ├── useLancamentos.js
│   │   ├── useAbastecimentos.js
│   │   └── useFinanceiro.js
│   ├── lib/
│   │   └── supabase.js      # Cliente Supabase
│   ├── App.jsx
│   └── main.jsx
├── supabase-schema.sql  # SQL completo do banco
├── .env.example         # Template de variáveis
├── netlify.toml         # Config do deploy Netlify
├── vite.config.js
└── package.json
```

---

## 🗄️ Banco de dados (tabelas)

| Tabela | Descrição |
|--------|-----------|
| `agregados` | Cadastro de terceirizados |
| `equipamentos` | Equipamentos vinculados a cada agregado |
| `contratos` | Contratos e vigências |
| `lancamentos` | Horas máquina e cargas m³ |
| `abastecimentos` | Combustível com NF-e |
| `fechamentos` | Histórico de pagamentos |
| `usuarios` | Preparado para multi-usuário |

---

## 🔐 Adicionar mais usuários

1. No Supabase → **Authentication → Users → Invite user**
2. O usuário recebe um e-mail de convite
3. (Futuro) Perfis de acesso: admin, operador, visualizador — a estrutura já está preparada na tabela `usuarios`

---

## 🛠️ Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia no navegador (desenvolvimento) |
| `npm run electron:dev` | Inicia como app desktop |
| `npm run build` | Gera build para Netlify |
| `npm run electron:build:win` | Gera instalador .exe para Windows |

---

*Raimondi Artefatos de Cimento — v1.0.0*
