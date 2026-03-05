-- Integração WhatsApp Evolution API
-- Adiciona coluna para rastrear envio de demandas ao grupo

ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;
