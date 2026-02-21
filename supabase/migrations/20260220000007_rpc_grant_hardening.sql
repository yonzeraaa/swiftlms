-- ============================================================================
-- Hardening de GRANT/REVOKE em RPCs sensíveis de certificados
-- ============================================================================
-- Problema: funções SECURITY DEFINER herdavam EXECUTE para PUBLIC por padrão,
-- o que significa que qualquer usuário (incluindo anon) poderia chamar as RPCs
-- de mutação. Mesmo com a verificação interna de role, a chamada chegava ao
-- PL/pgSQL. Este migration revoga esse acesso no nível do banco.
-- ============================================================================

-- Revogar acesso público irrestrito (padrão do PostgreSQL ao criar funções)
REVOKE EXECUTE ON FUNCTION approve_certificate_request(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reject_certificate_request(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION manually_generate_certificate(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION certificate_anomaly_report() FROM PUBLIC;

-- Conceder apenas a usuários autenticados e service_role
-- (o service_role já herda via superuser, mas explicitamos por clareza)
GRANT EXECUTE ON FUNCTION approve_certificate_request(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_certificate_request(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION manually_generate_certificate(uuid) TO authenticated;
-- certificate_anomaly_report já tem GRANT TO authenticated da migration 006;
-- reafirmamos aqui após o REVOKE FROM PUBLIC para garantir a ordem.
GRANT EXECUTE ON FUNCTION certificate_anomaly_report() TO authenticated;

-- Funções chamadas por alunos autenticados: manter acesso, mas nunca para anon
REVOKE EXECUTE ON FUNCTION create_certificate_request(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION create_certificate_request(uuid) TO authenticated;
