# Configuração da Google Drive API para SwiftEDU

## Pré-requisitos
- Conta Google
- Projeto SwiftEDU configurado localmente

## Passo 1: Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Clique em "Selecionar projeto" no topo
3. Clique em "Novo Projeto"
4. Nome do projeto: `SwiftEDU`
5. Clique em "Criar"

## Passo 2: Ativar Google Drive API

1. No menu lateral, vá para "APIs e serviços" > "Biblioteca"
2. Pesquise por "Google Drive API"
3. Clique no resultado "Google Drive API"
4. Clique em "ATIVAR"

## Passo 3: Criar Credenciais OAuth 2.0

1. Vá para "APIs e serviços" > "Credenciais"
2. Clique em "+ CRIAR CREDENCIAIS"
3. Selecione "ID do cliente OAuth"
4. Se solicitado, configure a tela de consentimento OAuth:
   - Tipo de usuário: Externo
   - Nome do app: SwiftEDU
   - E-mail de suporte: seu email
   - Domínios autorizados: adicione seu domínio (se tiver)
   - E-mail do desenvolvedor: seu email
   - Clique em "Salvar e continuar"
   - Em Escopos, clique em "Adicionar ou remover escopos"
   - Procure e adicione: `https://www.googleapis.com/auth/drive.readonly`
   - Clique em "Salvar e continuar"
   - Adicione usuários de teste se necessário
   - Clique em "Salvar e continuar"

5. De volta à criação de credenciais:
   - Tipo de aplicativo: Aplicativo da Web
   - Nome: SwiftEDU Web Client
   - URIs de redirecionamento autorizados:
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3001/api/auth/callback/google`
     - `https://seudominio.com/api/auth/callback/google` (produção)
   - Clique em "CRIAR"

6. Anote o Client ID e Client Secret

## Passo 4: Criar Conta de Serviço (Alternativa Recomendada)

Para acesso sem autenticação do usuário:

1. Em "Credenciais", clique em "+ CRIAR CREDENCIAIS"
2. Selecione "Conta de serviço"
3. Nome: `swiftedu-drive-service`
4. ID: deixe o padrão
5. Clique em "Criar e continuar"
6. Função: "Leitor" (Basic > Viewer)
7. Clique em "Continuar" e depois "Concluir"
8. Clique na conta de serviço criada
9. Vá para aba "Chaves"
10. Clique em "Adicionar chave" > "Criar nova chave"
11. Tipo: JSON
12. Clique em "Criar" - o arquivo será baixado

## Passo 5: Configurar Variáveis de Ambiente

Adicione ao arquivo `.env.local`:

```env
# Para OAuth 2.0
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui

# Para Conta de Serviço
GOOGLE_SERVICE_ACCOUNT_EMAIL=swiftedu-drive-service@seu-projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Passo 6: Instalar Dependências

```bash
npm install googleapis @google-cloud/local-auth
```

## Passo 7: Implementar API Route

Crie `/app/api/import-from-drive/route.ts`:

```typescript
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

// Configurar autenticação com conta de serviço
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

async function listFolderContents(folderId: string) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
    orderBy: 'name',
  });
  
  return res.data.files || [];
}
```

## Passo 8: Compartilhar Pasta com Conta de Serviço

1. No Google Drive, vá até a pasta que deseja importar
2. Clique com botão direito > "Compartilhar"
3. Adicione o email da conta de serviço: `swiftedu-drive-service@seu-projeto.iam.gserviceaccount.com`
4. Permissão: "Leitor"
5. Clique em "Enviar"

## Troubleshooting

### Erro: "Insufficient Permission"
- Verifique se a pasta está compartilhada com a conta de serviço
- Confirme que os escopos estão corretos

### Erro: "Invalid Credentials"
- Verifique se as variáveis de ambiente estão corretas
- Confirme que a chave privada está no formato correto

### Limite de Taxa (Rate Limit)
- A API tem limite de 1000 requisições por 100 segundos
- Implemente cache e batch de requisições

## Próximos Passos

1. Testar a conexão com um endpoint simples
2. Implementar a lógica de parsing da estrutura de pastas
3. Adicionar tratamento de erros robusto
4. Implementar cache para evitar requisições desnecessárias

## Referências

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [Google Auth Library](https://github.com/googleapis/google-auth-library-nodejs)
- [Drive API Quickstart](https://developers.google.com/drive/api/v3/quickstart/nodejs)