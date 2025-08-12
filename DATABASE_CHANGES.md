# Mudanças no banco de dados

## Exclusão completa de usuários
- Função delete_user_completely atualizada para remover TODOS os dados
- Incluída exclusão de test_answers, test_attempts e lesson_progress
- Para professores, remove associação mas mantém conteúdo criado

## Geração automática de certificados
- Triggers melhorados para recálculo automático de progresso
- Função fix_all_enrollment_progress para corrigir enrollments existentes
- Função check_and_fix_enrollment_progress para monitoramento

## Auditoria
- Nova função preview_user_deletion para visualizar dados antes da exclusão

