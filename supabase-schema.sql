-- ============================================================
-- SCHEMA: Raimondi - Gestão de Agregados e Terceirizados
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA: usuarios (preparado para multi-usuário)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'operador' CHECK (perfil IN ('admin', 'operador', 'visualizador')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: agregados (cadastro de terceirizados)
-- ============================================================
CREATE TABLE IF NOT EXISTS agregados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  telefone TEXT,
  chave_pix TEXT,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: equipamentos (vinculados a agregados)
-- ============================================================
CREATE TABLE IF NOT EXISTS equipamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agregado_id UUID NOT NULL REFERENCES agregados(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  placa TEXT,
  capacidade TEXT,
  modo_lancamento TEXT NOT NULL CHECK (modo_lancamento IN ('hora_maquina', 'carga_m3')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: contratos
-- ============================================================
CREATE TABLE IF NOT EXISTS contratos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT NOT NULL UNIQUE,
  agregado_id UUID NOT NULL REFERENCES agregados(id) ON DELETE RESTRICT,
  objeto TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_vigencia DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado', 'suspenso')),
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: lancamentos (horas máquina e cargas m³)
-- ============================================================
CREATE TABLE IF NOT EXISTS lancamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requisicao TEXT NOT NULL,
  agregado_id UUID NOT NULL REFERENCES agregados(id) ON DELETE RESTRICT,
  equipamento_id UUID NOT NULL REFERENCES equipamentos(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('hora_maquina', 'carga_m3')),
  quantidade NUMERIC(10,2) NOT NULL CHECK (quantidade > 0),
  valor_unitario NUMERIC(10,2),
  valor_total NUMERIC(10,2),
  data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
  status_pagamento TEXT NOT NULL DEFAULT 'em_aberto' CHECK (status_pagamento IN ('em_aberto', 'pago', 'permuta')),
  is_permuta BOOLEAN DEFAULT false,
  descricao_permuta TEXT,
  observacoes TEXT,
  fechamento_id UUID, -- preenchido ao fechar pagamento
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: abastecimentos
-- ============================================================
CREATE TABLE IF NOT EXISTS abastecimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agregado_id UUID NOT NULL REFERENCES agregados(id) ON DELETE RESTRICT,
  equipamento_id UUID NOT NULL REFERENCES equipamentos(id) ON DELETE RESTRICT,
  tipo_combustivel TEXT NOT NULL CHECK (tipo_combustivel IN ('diesel_s10', 'diesel_s500', 'gasolina', 'etanol', 'arla32')),
  litros NUMERIC(10,2) NOT NULL CHECK (litros > 0),
  preco_por_litro NUMERIC(10,4) NOT NULL CHECK (preco_por_litro > 0),
  valor_total NUMERIC(10,2) NOT NULL,
  posto TEXT,
  nfe TEXT,
  descontar_fechamento BOOLEAN DEFAULT true,
  data_abastecimento DATE NOT NULL DEFAULT CURRENT_DATE,
  fechamento_id UUID, -- preenchido ao fechar pagamento
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: fechamentos (registro de pagamentos)
-- ============================================================
CREATE TABLE IF NOT EXISTS fechamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agregado_id UUID NOT NULL REFERENCES agregados(id) ON DELETE RESTRICT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  data_pagamento DATE NOT NULL,
  valor_bruto NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_desconto_combustivel NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_liquido NUMERIC(10,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'permuta')),
  descricao_permuta TEXT,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FOREIGN KEY: lancamentos -> fechamentos
-- ============================================================
ALTER TABLE lancamentos
  ADD CONSTRAINT fk_lancamentos_fechamento
  FOREIGN KEY (fechamento_id) REFERENCES fechamentos(id) ON DELETE SET NULL;

ALTER TABLE abastecimentos
  ADD CONSTRAINT fk_abastecimentos_fechamento
  FOREIGN KEY (fechamento_id) REFERENCES fechamentos(id) ON DELETE SET NULL;

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lancamentos_agregado ON lancamentos(agregado_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos(data_lancamento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON lancamentos(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_requisicao ON lancamentos(requisicao);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_agregado ON abastecimentos(agregado_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_data ON abastecimentos(data_abastecimento);
CREATE INDEX IF NOT EXISTS idx_equipamentos_agregado ON equipamentos(agregado_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_agregado ON fechamentos(agregado_id);

-- ============================================================
-- ROW LEVEL SECURITY (preparado para multi-usuário)
-- ============================================================
ALTER TABLE agregados ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE abastecimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fechamentos ENABLE ROW LEVEL SECURITY;

-- Por enquanto: usuário autenticado acessa tudo
-- Quando implementar multi-usuário, refinar estas políticas
CREATE POLICY "Acesso total para autenticados" ON agregados FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso total para autenticados" ON equipamentos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso total para autenticados" ON contratos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso total para autenticados" ON lancamentos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso total para autenticados" ON abastecimentos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso total para autenticados" ON fechamentos FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- FUNÇÃO: atualiza campo updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agregados_updated BEFORE UPDATE ON agregados FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_equipamentos_updated BEFORE UPDATE ON equipamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contratos_updated BEFORE UPDATE ON contratos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lancamentos_updated BEFORE UPDATE ON lancamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_abastecimentos_updated BEFORE UPDATE ON abastecimentos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DADOS DE EXEMPLO (opcional - delete se não quiser)
-- ============================================================
-- INSERT INTO agregados (nome, cpf_cnpj, telefone, chave_pix, banco, agencia, conta) VALUES
--   ('João Silva', '123.456.789-00', '(47) 99901-2345', '123.456.789-00', 'Banco do Brasil', '1234-5', '56789-0'),
--   ('Trans. ABC Ltda', '12.345.678/0001-00', '(47) 99902-3456', '12345678000100', 'Bradesco', '5678-9', '12345-6');

SELECT 'Schema criado com sucesso! ✅' as resultado;
