# Template de Certificados

Documentação do sistema de template único de certificados do SwiftLMS.

## Visão Geral

O sistema de certificados utiliza um template único e reutilizável que suporta dois tipos de certificados:
- **Técnico**: Certificados de conclusão de cursos técnicos
- **Lato Sensu**: Certificados de pós-graduação

## Arquitetura

### Componentes Principais

```
├── types/certificates.ts                    # Tipos e configurações
├── app/components/certificates/
│   └── CertificateTemplate.tsx              # Componente reutilizável
├── app/student-dashboard/certificates/      # Tela do aluno
├── app/dashboard/certificates/              # Tela do admin
└── app/lib/certificate-pdf.ts               # Geração de PDF
```

### Fluxo de Geração de PDF

1. **Renderização**: O componente `CertificateTemplate` renderiza o certificado em HTML/CSS
2. **Captura**: `html2canvas` captura o HTML como imagem (scale: 2 para qualidade)
3. **Conversão**: `jsPDF` converte a imagem para PDF (A4 landscape)
4. **Download**: O PDF é baixado automaticamente

## Tipos e Configuração

### CertificateData

```typescript
interface CertificateData {
  certificate_number: string           // Número do certificado
  verification_code: string            // Código de verificação
  certificate_type: 'technical' | 'lato-sensu' | null
  course_hours: number | null
  grade?: number | null                // Aproveitamento (apenas admin)
  issued_at: string | null
  instructor_name?: string | null
  user: {
    full_name: string
  }
  course: {
    title: string
    duration_hours?: number
  }
}
```

### CertificateTemplateProps

```typescript
interface CertificateTemplateProps {
  certificate: CertificateData
  elementId: string                    // 'certificate-pdf' ou 'certificate-pdf-admin'
  showGrade?: boolean                  // true para admin, false para aluno
}
```

### Configuração por Tipo

```typescript
const CERTIFICATE_TYPE_CONFIG: Record<CertificateType, CertificateTypeConfig> = {
  technical: {
    title: 'CERTIFICADO',
    subtitle: 'DE CONCLUSÃO',
    typeLabel: 'Certificado Técnico de Conclusão',
    accentColor: '#FFD700',
    badgeColor: '#22c55e',
    iconColor: '#fbbf24'
  },
  'lato-sensu': {
    title: 'CERTIFICADO',
    subtitle: 'DE PÓS-GRADUAÇÃO LATO SENSU',
    typeLabel: 'Certificado de Pós-Graduação Lato Sensu',
    accentColor: '#FFD700',
    badgeColor: '#a855f7',
    iconColor: '#fbbf24'
  }
}
```

## Layout e Design

### Dimensões

```typescript
const CERTIFICATE_DIMENSIONS = {
  width: 1100,      // px
  height: 850,      // px
  padding: 60       // px
}
```

### Estrutura Visual

```
┌─────────────────────────────────────────┐
│  Background: gradient #001a33 → #002244 │
│  ┌───────────────────────────────────┐ │
│  │  ● Logo dourado (80x80)           │ │
│  │  CERTIFICADO (48px, dourado)      │ │
│  │  Subtítulo (18px)                 │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Certificamos que                       │
│  [NOME DO ALUNO] (28px bold)           │
│  concluiu com êxito o curso de         │
│  [TÍTULO DO CURSO] (32px bold)         │
│                                         │
│  [TIPO DE CERTIFICADO] (14px)          │
│                                         │
│  ┌──────────┬───────────────┐          │
│  │ Carga    │ Aproveitamento│          │
│  │ Horária  │ (só admin)    │          │
│  └──────────┴───────────────┘          │
│                                         │
│  Emitido em [DATA]                     │
│                                         │
│  ──────────────────────────────────    │
│  ✓ Certificado Autêntico               │
│  Nº [CERTIFICATE_NUMBER]               │
│  Código: [VERIFICATION_CODE]           │
│  ──────────────────────────────────    │
│                                         │
│  ────────────────────                  │
│  [INSTRUTOR]                           │
│  Instrutor Responsável                 │
└─────────────────────────────────────────┘
```

### Cores

| Elemento | Cor | Uso |
|----------|-----|-----|
| Background | `linear-gradient(135deg, #001a33 0%, #002244 100%)` | Fundo do certificado |
| Accent | `#FFD700` | Textos principais, logo, bordas |
| Type Label | `#FCD34D` | Tipo do certificado |
| Verification | `#00ff00` | Shield de autenticidade |
| Text Opacity | `0.6` - `0.8` | Textos secundários |

### Tipografia

- **Família**: Open Sans, sans-serif
- **Tamanhos**:
  - Título: 48px
  - Subtítulo: 18px
  - Nome do aluno: 28px
  - Título do curso: 32px
  - Tipo do certificado: 14px
  - Carga horária: 20px (label: 14px)
  - Data de emissão: 16px
  - Verificação: 12-14px
  - Assinatura: 14px (cargo: 12px)

## Uso

### Tela do Aluno

```tsx
import { CertificateTemplate } from '@/app/components/certificates/CertificateTemplate'

// Renderização
<CertificateTemplate
  certificate={selectedCertificate}
  elementId="certificate-pdf"
  showGrade={false}
/>

// Geração do PDF
await generateCertificatePDF(
  'certificate-pdf',
  `certificado-${certificate.certificate_number}.pdf`
)
```

### Tela do Admin

```tsx
import { CertificateTemplate } from '@/app/components/certificates/CertificateTemplate'

// Renderização (com fallbacks)
<CertificateTemplate
  certificate={{
    ...selectedCertificate,
    user: {
      full_name: selectedCertificate.user?.full_name || 'Aluno'
    },
    course: {
      title: selectedCertificate.course?.title || 'Curso',
      duration_hours: selectedCertificate.course?.duration_hours
    }
  }}
  elementId="certificate-pdf-admin"
  showGrade={true}  // Exibe aproveitamento
/>

// Geração do PDF
await generateCertificatePDF(
  'certificate-pdf-admin',
  `certificado-${certificate.certificate_number}.pdf`
)
```

## Diferenças entre Aluno e Admin

| Aspecto | Aluno | Admin |
|---------|-------|-------|
| **Element ID** | `certificate-pdf` | `certificate-pdf-admin` |
| **Aproveitamento** | Não exibido | Exibido (campo `grade`) |
| **Fallbacks** | Não necessários | User e Course com fallbacks |
| **Gap Shield** | 8px | 7px |
| **Margin Bottom Shield** | 10px | 18px |
| **Border Assinatura** | 2px | 1px |

## Adicionando Novos Tipos

Para adicionar um novo tipo de certificado:

1. **Atualizar o tipo**:
```typescript
// types/certificates.ts
export type CertificateType = 'technical' | 'lato-sensu' | 'novo-tipo'
```

2. **Adicionar configuração**:
```typescript
export const CERTIFICATE_TYPE_CONFIG: Record<CertificateType, CertificateTypeConfig> = {
  // ... tipos existentes
  'novo-tipo': {
    title: 'CERTIFICADO',
    subtitle: 'SUBTÍTULO PERSONALIZADO',
    typeLabel: 'Descrição do Novo Tipo',
    accentColor: '#FFD700',      // Cor de destaque
    badgeColor: '#3b82f6',       // Cor do badge na UI
    iconColor: '#fbbf24'         // Cor do ícone
  }
}
```

3. **Atualizar schema do banco** (se necessário):
```sql
ALTER TYPE certificate_type ADD VALUE 'novo-tipo';
```

## Boas Práticas

### Manutenção

- ✅ **Sempre use o componente `CertificateTemplate`** - Não duplique o código HTML
- ✅ **Centralize estilos** - Ajustes visuais devem ser feitos no componente ou na config
- ✅ **Use tipos TypeScript** - Garante consistência dos dados
- ✅ **Teste ambos os tipos** - Técnico e Lato Sensu devem renderizar corretamente

### Geração de PDF

- ✅ **Use setTimeout antes de gerar** - Aguarda renderização (100ms)
- ✅ **Mantenha elemento oculto** - `left: '-9999px'` evita flash visual
- ✅ **Dimensões fixas** - 1100x850px garantem consistência
- ✅ **Scale 2** - html2canvas com scale 2 melhora qualidade

### Performance

- ✅ **Renderize apenas quando necessário** - Use conditional rendering
- ✅ **Evite re-renderizações** - O componente é controlado por `selectedCertificate`
- ✅ **Carregue fontes previamente** - Open Sans deve estar disponível

## Troubleshooting

### PDF não é gerado

1. Verifique se o elemento está sendo renderizado (inspecionar DOM)
2. Confirme que o `elementId` está correto
3. Verifique console para erros do html2canvas ou jsPDF
4. Aumente o timeout se necessário (atualmente 100ms)

### Layout quebrado no PDF

1. Use apenas estilos inline - html2canvas não processa CSS externo
2. Evite Tailwind no template - Use estilos inline ou objeto style
3. Confirme dimensões fixas (1100x850)
4. Verifique compatibilidade de propriedades CSS com html2canvas

### Diferenças visuais entre tipos

1. Verifique `CERTIFICATE_TYPE_CONFIG` - As cores estão corretas?
2. Confirme que `certificate_type` está sendo passado corretamente
3. Valide que o tipo existe no enum e na config

## Referências

- [html2canvas Documentation](https://html2canvas.hertzen.com/)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)
- [Open Sans Font](https://fonts.google.com/specimen/Open+Sans)

## Histórico de Mudanças

### v2.0.0 (2025-11-17)
- ✨ Criação do template único reutilizável
- ✨ Suporte para técnico e lato sensu
- ✨ Centralização de configurações em `types/certificates.ts`
- ✨ Componente `CertificateTemplate` com props tipadas
- 🔧 Substituição de blocos inline nas telas de aluno e admin
- 📝 Documentação completa do sistema
