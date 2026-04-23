
-- ============================================================
-- MULTI-TENANT FOUNDATION
-- ============================================================

-- 1. Adicionar role super_admin
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
