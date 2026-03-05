-- Adiciona company_id e project_name na tabela tasks para demandas avulsas
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_name TEXT;
