'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Playfair_Display, Lora } from 'next/font/google'
import type { SetupWizardState } from '@/lib/setup/types'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
})

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const BORDER = 'rgba(30,19,12,0.14)'

type StepId = 'branding' | 'integrations' | 'validation' | 'summary'

type BrandingForm = {
  institutionName: string
  logoUrl: string
  primaryColor: string
  supportEmail: string
  supportPhone: string
}

type IntegrationsForm = {
  googleClientId: string
  googleApiKey: string
  googleClientSecret: string
  googleDriveBackupFolderId: string
}

const STEPS: { id: StepId; label: string }[] = [
  { id: 'branding', label: 'Branding' },
  { id: 'integrations', label: 'Integrações' },
  { id: 'validation', label: 'Validação' },
  { id: 'summary', label: 'Resumo' },
]

// ─── SVG decorations (same design language as login) ────────────────────────

function SwiftMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M88,48 C78,37 57,25 14,27 C36,25 66,38 86,48 Z" />
      <path d="M88,48 C76,41 55,32 27,35 C46,32 68,41 86,48 Z" opacity="0.38" />
      <path d="M92,48 C102,37 123,25 166,27 C144,25 114,38 94,48 Z" />
      <path d="M92,48 C104,41 125,32 153,35 C134,32 112,41 94,48 Z" opacity="0.38" />
      <ellipse cx="90" cy="47" rx="6" ry="3.5" />
      <circle cx="90" cy="43" r="3" />
      <path d="M87,50 C84,59 79,69 73,75" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M93,50 C96,59 101,69 107,75" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function ClassicRule({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 300 14" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="7" x2="133" y2="7" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      <line x1="167" y1="7" x2="300" y2="7" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      <path d="M150,2 L155,7 L150,12 L145,7 Z" stroke="currentColor" strokeWidth="1.1" opacity="0.5" fill="none" />
      <circle cx="140" cy="7" r="1.3" fill="currentColor" opacity="0.32" />
      <circle cx="160" cy="7" r="1.3" fill="currentColor" opacity="0.32" />
    </svg>
  )
}

function CornerBracket({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 34" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2,22 L2,2 L22,2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
    </svg>
  )
}

// ─── Small UI helpers ────────────────────────────────────────────────────────

function InlineSpinner() {
  return (
    <span
      className="inline-block w-3.5 h-3.5 border-2 rounded-full animate-spin flex-shrink-0"
      style={{ borderColor: `${MUTED} transparent transparent transparent` }}
    />
  )
}

const INPUT_BASE_CLASSES =
  'w-full bg-transparent px-0 py-2.5 focus:outline-none transition-colors duration-200 placeholder:italic'

const INPUT_BASE_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-lora)',
  fontSize: '1rem',
  color: INK,
  borderBottom: `1px solid rgba(30,19,12,0.25)`,
  caretColor: ACCENT,
  WebkitBoxShadow: '0 0 0 1000px #faf6ee inset',
  WebkitTextFillColor: INK,
}

function onInputFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderBottomColor = ACCENT
}

function onInputBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderBottomColor = 'rgba(30,19,12,0.25)'
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontFamily: 'var(--font-lora)',
        color: MUTED,
        fontSize: '0.82rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        display: 'block',
        marginBottom: '0.5rem',
      }}
    >
      {children}
    </label>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-lora)',
        color: '#9a7e6a',
        fontSize: '0.78rem',
        fontStyle: 'italic',
        marginTop: '0.3rem',
      }}
    >
      {children}
    </p>
  )
}

function PrimaryButton({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="py-4 px-8 text-sm uppercase transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        fontFamily: 'var(--font-lora)',
        fontWeight: 600,
        color: loading ? MUTED : '#faf6ee',
        backgroundColor: loading ? 'rgba(30,19,12,0.5)' : INK,
        border: `1px solid ${INK}`,
        letterSpacing: '0.2em',
      }}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <InlineSpinner />
          Aguarde
        </span>
      ) : (
        children
      )}
    </button>
  )
}

function SecondaryButton({
  onClick,
  disabled,
  loading,
  children,
  icon,
}: {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="py-3.5 px-6 text-sm uppercase transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
      style={{
        fontFamily: 'var(--font-lora)',
        fontWeight: 600,
        color: INK,
        backgroundColor: 'transparent',
        border: `1px solid rgba(30,19,12,0.3)`,
        letterSpacing: '0.15em',
      }}
    >
      {loading ? <InlineSpinner /> : icon}
      {children}
    </button>
  )
}

// ─── Step components ─────────────────────────────────────────────────────────

function BrandingStep({
  form,
  onChange,
  saving,
  onSave,
}: {
  form: BrandingForm
  onChange: React.Dispatch<React.SetStateAction<BrandingForm>>
  saving: boolean
  onSave: () => void
}) {
  return (
    <div className="space-y-7 pt-2">
      <div>
        <FieldLabel>Nome da instituição</FieldLabel>
        <input
          value={form.institutionName}
          onChange={e => onChange(prev => ({ ...prev, institutionName: e.target.value }))}
          className={INPUT_BASE_CLASSES}
          style={INPUT_BASE_STYLE}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
        <div>
          <FieldLabel>Email de suporte</FieldLabel>
          <input
            type="email"
            value={form.supportEmail}
            onChange={e => onChange(prev => ({ ...prev, supportEmail: e.target.value }))}
            className={INPUT_BASE_CLASSES}
            style={INPUT_BASE_STYLE}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>
        <div>
          <FieldLabel>Telefone de suporte</FieldLabel>
          <input
            value={form.supportPhone}
            onChange={e => onChange(prev => ({ ...prev, supportPhone: e.target.value }))}
            className={INPUT_BASE_CLASSES}
            style={INPUT_BASE_STYLE}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
        <div>
          <FieldLabel>Logo URL</FieldLabel>
          <input
            value={form.logoUrl}
            onChange={e => onChange(prev => ({ ...prev, logoUrl: e.target.value }))}
            className={INPUT_BASE_CLASSES}
            style={INPUT_BASE_STYLE}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>
        <div>
          <FieldLabel>Cor primária</FieldLabel>
          <input
            value={form.primaryColor}
            onChange={e => onChange(prev => ({ ...prev, primaryColor: e.target.value }))}
            className={INPUT_BASE_CLASSES}
            style={INPUT_BASE_STYLE}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <PrimaryButton onClick={onSave} loading={saving}>
          Salvar branding
        </PrimaryButton>
      </div>
    </div>
  )
}

function IntegrationsStep({
  form,
  onChange,
  saving,
  isConnectingBackupDrive,
  secretConfigMap,
  publicGoogleClientId,
  onSave,
  onConnectBackupDrive,
}: {
  form: IntegrationsForm
  onChange: React.Dispatch<React.SetStateAction<IntegrationsForm>>
  saving: boolean
  isConnectingBackupDrive: boolean
  secretConfigMap: Map<string, { isConfigured: boolean; maskedValue: string | null }>
  publicGoogleClientId: string | undefined
  onSave: () => void
  onConnectBackupDrive: () => void
}) {
  const clientSecretStatus = secretConfigMap.get('backup.google_client_secret')
  const folderStatus = secretConfigMap.get('backup.google_drive_backup_folder_id')
  const refreshTokenStatus = secretConfigMap.get('backup.google_refresh_token')

  const canConnectDrive =
    !isConnectingBackupDrive &&
    !!publicGoogleClientId &&
    clientSecretStatus?.isConfigured &&
    folderStatus?.isConfigured

  const isDriveConnected = refreshTokenStatus?.isConfigured

  return (
    <div className="space-y-7 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
        <div>
          <FieldLabel>Google Client ID</FieldLabel>
          <input
            value={form.googleClientId}
            onChange={e => onChange(prev => ({ ...prev, googleClientId: e.target.value }))}
            className={INPUT_BASE_CLASSES}
            style={INPUT_BASE_STYLE}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>
        <div>
          <FieldLabel>Google API Key</FieldLabel>
          <input
            value={form.googleApiKey}
            onChange={e => onChange(prev => ({ ...prev, googleApiKey: e.target.value }))}
            className={INPUT_BASE_CLASSES}
            style={INPUT_BASE_STYLE}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>
      </div>

      {/* Backup / Google Drive subsection */}
      <div>
        <ClassicRule className="w-full mb-5" style={{ color: INK } as React.CSSProperties} />
        <p
          className="mb-5"
          style={{
            fontFamily: 'var(--font-lora)',
            color: MUTED,
            fontSize: '0.82rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Backup · Google Drive
        </p>

        <div className="space-y-7">
          <div>
            <FieldLabel>Google Client Secret</FieldLabel>
            <input
              type="password"
              value={form.googleClientSecret}
              onChange={e => onChange(prev => ({ ...prev, googleClientSecret: e.target.value }))}
              placeholder={clientSecretStatus?.maskedValue || ''}
              className={INPUT_BASE_CLASSES}
              style={INPUT_BASE_STYLE}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
            />
            {clientSecretStatus?.isConfigured && (
              <FieldHint>Já configurado. Preencha apenas se quiser substituir.</FieldHint>
            )}
          </div>

          <div>
            <FieldLabel>Pasta de backup no Drive</FieldLabel>
            <input
              value={form.googleDriveBackupFolderId}
              onChange={e => onChange(prev => ({ ...prev, googleDriveBackupFolderId: e.target.value }))}
              placeholder={folderStatus?.maskedValue || ''}
              className={INPUT_BASE_CLASSES}
              style={INPUT_BASE_STYLE}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
            />
            {folderStatus?.isConfigured && (
              <FieldHint>Já configurado. Preencha apenas se quiser substituir.</FieldHint>
            )}
          </div>

          {/* OAuth connection */}
          <div
            className="py-4"
            style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}
          >
            <p
              className="mb-1"
              style={{ fontFamily: 'var(--font-lora)', color: MUTED, fontSize: '0.9rem', lineHeight: 1.6 }}
            >
              O backup usa OAuth do seu usuário Google para gravar no seu Drive pessoal.
            </p>
            <p
              className="mb-4"
              style={{ fontFamily: 'var(--font-lora)', color: MUTED, fontSize: '0.9rem' }}
            >
              Conexão:{' '}
              <span style={{ color: isDriveConnected ? ACCENT : INK, fontWeight: 600 }}>
                {isDriveConnected ? 'Conectado' : 'Não conectado'}
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <SecondaryButton
                onClick={onConnectBackupDrive}
                disabled={!canConnectDrive}
                loading={isConnectingBackupDrive}
                icon={<ExternalLink size={14} />}
              >
                {isDriveConnected ? 'Reconectar Google Drive' : 'Conectar Google Drive'}
              </SecondaryButton>

              {!canConnectDrive && !isConnectingBackupDrive && (
                <p
                  style={{
                    fontFamily: 'var(--font-lora)',
                    color: MUTED,
                    fontSize: '0.8rem',
                    fontStyle: 'italic',
                    opacity: 0.75,
                  }}
                >
                  Salve Client Secret e pasta de backup antes de conectar.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <PrimaryButton onClick={onSave} loading={saving}>
          Salvar integrações
        </PrimaryButton>
      </div>
    </div>
  )
}

function ValidationStep({
  validationChecks,
  saving,
  onRunValidation,
}: {
  validationChecks: SetupWizardState['validation'] | null
  saving: boolean
  onRunValidation: () => void
}) {
  return (
    <div className="space-y-6 pt-2">
      <p
        style={{
          fontFamily: 'var(--font-lora)',
          color: MUTED,
          fontSize: '1rem',
          lineHeight: 1.7,
          fontStyle: 'italic',
        }}
      >
        Valida os dados obrigatórios e testa o acesso ao Google Drive de backup.
      </p>

      {validationChecks && (
        <div className="space-y-2">
          {validationChecks.checks.map(check => (
            <div
              key={check.key}
              className="flex items-start gap-3 py-2"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <span
                style={{
                  color: check.status === 'ok' ? '#5a7a5a' : '#8b2525',
                  fontSize: '0.9rem',
                  marginTop: '0.05rem',
                  flexShrink: 0,
                }}
              >
                {check.status === 'ok' ? '✓' : '✗'}
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-lora)',
                  color: check.status === 'ok' ? '#5a7a5a' : '#8b2525',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                }}
              >
                {check.message}
              </p>
            </div>
          ))}

          {validationChecks.issues.map(issue => (
            <p
              key={issue}
              style={{
                fontFamily: 'var(--font-lora)',
                color: '#8b2525',
                fontSize: '0.9rem',
                fontStyle: 'italic',
              }}
            >
              {issue}
            </p>
          ))}
        </div>
      )}

      <div className="pt-2">
        <PrimaryButton onClick={onRunValidation} loading={saving}>
          Executar validação
        </PrimaryButton>
      </div>
    </div>
  )
}

function SummaryStep({
  institutionName,
  validationChecks,
  isCompleted,
  completing,
  saving,
  onComplete,
  onRevalidate,
}: {
  institutionName: string
  validationChecks: SetupWizardState['validation'] | null
  isCompleted: boolean
  completing: boolean
  saving: boolean
  onComplete: () => void
  onRevalidate: () => void
}) {
  return (
    <div className="space-y-6 pt-2">
      {/* Institution name */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: '1rem' }}>
        <p
          style={{
            fontFamily: 'var(--font-lora)',
            color: MUTED,
            fontSize: '0.82rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '0.3rem',
          }}
        >
          Instituição
        </p>
        <p style={{ fontFamily: 'var(--font-lora)', color: INK, fontSize: '1.05rem' }}>
          {institutionName || '—'}
        </p>
      </div>

      {/* Validation checks */}
      {validationChecks && (
        <div>
          <p
            style={{
              fontFamily: 'var(--font-lora)',
              color: MUTED,
              fontSize: '0.82rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '0.75rem',
            }}
          >
            Checks de validação
          </p>

          <div className="space-y-2">
            {validationChecks.checks.map(check => (
              <div
                key={check.key}
                className="flex items-start gap-3 py-2"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <span
                  style={{
                    color: check.status === 'ok' ? '#5a7a5a' : '#8b2525',
                    fontSize: '0.9rem',
                    flexShrink: 0,
                  }}
                >
                  {check.status === 'ok' ? '✓' : '✗'}
                </span>
                <p
                  style={{
                    fontFamily: 'var(--font-lora)',
                    color: check.status === 'ok' ? '#5a7a5a' : '#8b2525',
                    fontSize: '0.92rem',
                    lineHeight: 1.5,
                  }}
                >
                  {check.message}
                </p>
              </div>
            ))}

            {validationChecks.issues.length > 0 ? (
              validationChecks.issues.map(issue => (
                <p
                  key={issue}
                  style={{
                    fontFamily: 'var(--font-lora)',
                    color: '#8b2525',
                    fontSize: '0.9rem',
                    fontStyle: 'italic',
                  }}
                >
                  {issue}
                </p>
              ))
            ) : (
              <div
                className="flex items-center gap-2 pt-1"
                style={{ fontFamily: 'var(--font-lora)', color: '#5a7a5a', fontSize: '0.92rem' }}
              >
                <Check size={14} />
                Nenhuma pendência bloqueante.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 pt-2">
        {!isCompleted && (
          <PrimaryButton
            onClick={onComplete}
            loading={completing}
            disabled={!(validationChecks?.canComplete ?? false)}
          >
            Concluir setup
          </PrimaryButton>
        )}

        <SecondaryButton onClick={onRevalidate} loading={saving}>
          Revalidar
        </SecondaryButton>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  currentUserEmail: string
}

export default function SetupWizardClient({ currentUserEmail }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [state, setState] = useState<SetupWizardState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [brandingForm, setBrandingForm] = useState<BrandingForm>({
    institutionName: '',
    logoUrl: '',
    primaryColor: '#D4AF37',
    supportEmail: '',
    supportPhone: '',
  })
  const [integrationsForm, setIntegrationsForm] = useState<IntegrationsForm>({
    googleClientId: '',
    googleApiKey: '',
    googleClientSecret: '',
    googleDriveBackupFolderId: '',
  })
  const [isConnectingBackupDrive, setIsConnectingBackupDrive] = useState(false)
  const [activeStep, setActiveStep] = useState<StepId>('branding')
  const [validationChecks, setValidationChecks] = useState<SetupWizardState['validation'] | null>(null)

  const isCompleted = state?.installation.isSetupComplete === true

  useEffect(() => {
    loadState()
  }, [])

  useEffect(() => {
    if (!state) return

    setBrandingForm({
      institutionName: state.publicSettings.institutionName || '',
      logoUrl: state.publicSettings.logoUrl || '',
      primaryColor: state.publicSettings.primaryColor || '#D4AF37',
      supportEmail: state.publicSettings.supportEmail || '',
      supportPhone: state.publicSettings.supportPhone || '',
    })
    setIntegrationsForm(prev => ({
      ...prev,
      googleClientId: state.publicSettings.googleClientId || '',
      googleApiKey: state.publicSettings.googleApiKey || '',
      googleClientSecret: '',
      googleDriveBackupFolderId: '',
    }))
    setValidationChecks(state.validation)
    if (state.installation.currentStep === 'completed') {
      setActiveStep('summary')
    }
  }, [state])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const backupDrive = params.get('backupDrive')
    const callbackMessage = params.get('message')

    if (backupDrive === 'connected') {
      setMessage('Google Drive do backup conectado com sucesso.')
      loadState()
    }

    if (backupDrive === 'error') {
      setError(callbackMessage || 'Falha ao conectar o Google Drive do backup.')
    }

    if (backupDrive) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const secretConfigMap = useMemo(() => {
    const map = new Map<string, { isConfigured: boolean; maskedValue: string | null }>()
    state?.secretStatus.forEach(item => {
      map.set(item.key, { isConfigured: item.isConfigured, maskedValue: item.maskedValue })
    })
    return map
  }, [state])

  async function loadState() {
    setLoading(true)
    setError(null)

    try {
      const statusResponse = await fetch('/api/setup/status', { credentials: 'include' })
      const statusData = await statusResponse.json()
      if (!statusResponse.ok) throw new Error(statusData.error || 'Falha ao carregar setup')

      if (!statusData.state.installation.isSetupComplete && !statusData.state.installation.claimedBy) {
        setClaiming(true)
        const claimResponse = await fetch('/api/setup/claim', { method: 'POST', credentials: 'include' })
        const claimData = await claimResponse.json()
        if (!claimResponse.ok) throw new Error(claimData.error || 'Falha ao reservar setup')
        setState(claimData.state)
        setMessage('Setup reservado para o seu usuário.')
      } else {
        setState(statusData.state)
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar setup')
    } finally {
      setClaiming(false)
      setLoading(false)
    }
  }

  async function saveStep(step: 'branding' | 'integrations') {
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const payload = step === 'branding' ? brandingForm : integrationsPayload()
      const response = await fetch('/api/setup/save', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, payload }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao salvar etapa')

      setState(data.state)
      setMessage(step === 'branding' ? 'Branding salvo.' : 'Integrações salvas.')
      setActiveStep(step === 'branding' ? 'integrations' : 'validation')
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar setup')
    } finally {
      setSaving(false)
    }
  }

  async function runValidation() {
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/setup/validate', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao validar setup')

      setValidationChecks(data.validation)
      setMessage(data.validation.canComplete ? 'Validação concluída.' : 'Validação encontrou pendências.')
      setActiveStep('summary')
      await loadState()
    } catch (err: any) {
      setError(err.message || 'Falha ao validar setup')
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    setCompleting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/setup/complete', { method: 'POST', credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao concluir setup')

      setState(data.state)
      setValidationChecks(data.state.validation)
      setMessage('Setup concluído com sucesso.')
    } catch (err: any) {
      setError(err.message || 'Falha ao concluir setup')
    } finally {
      setCompleting(false)
    }
  }

  async function connectBackupDrive() {
    setIsConnectingBackupDrive(true)
    setError(null)
    setMessage(null)
    window.location.href = '/api/setup/backup-drive/connect'
  }

  function integrationsPayload() {
    return {
      googleClientId: integrationsForm.googleClientId,
      googleApiKey: integrationsForm.googleApiKey,
      googleClientSecret: integrationsForm.googleClientSecret,
      googleDriveBackupFolderId: integrationsForm.googleDriveBackupFolderId,
    }
  }

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className={`min-h-screen w-full flex items-center justify-center ${playfair.variable} ${lora.variable}`}
        style={{ backgroundColor: '#f0e6d2' }}
      >
        <div className="flex flex-col items-center gap-6">
          <div style={{ color: ACCENT }}>
            <SwiftMark className="w-24" />
          </div>
          <span
            className="inline-block w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: `${ACCENT} transparent transparent transparent` }}
          />
        </div>
      </div>
    )
  }

  // ─── Main layout ───────────────────────────────────────────────────────────

  return (
    <div
      className={`w-full flex items-start relative ${playfair.variable} ${lora.variable}`}
      style={{ minHeight: '100vh', backgroundColor: '#f0e6d2' }}
    >
      {/* Noise texture overlay — fixed so it covers the full viewport regardless of page height */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: 0.04,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' fill='%231e130c'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Left brand panel — sticky so it stays fixed while the right panel scrolls */}
      <motion.div
        className="hidden lg:flex sticky top-0 h-screen flex-col justify-center items-center gap-10 w-2/5 px-14 xl:px-20 relative flex-shrink-0 overflow-hidden"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-5" style={{ width: '8.5rem', color: ACCENT }}>
            <SwiftMark />
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-playfair)',
              color: INK,
              fontSize: 'clamp(4rem, 5.5vw, 6.5rem)',
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
            }}
          >
            Swift
          </h1>
          <h1
            className="mb-8"
            style={{
              fontFamily: 'var(--font-playfair)',
              color: ACCENT,
              fontSize: 'clamp(3rem, 4.5vw, 5.5rem)',
              fontWeight: 400,
              fontStyle: 'italic',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
            }}
          >
            Edu.
          </h1>

          <ClassicRule className="w-full max-w-xs mb-8" style={{ color: INK } as React.CSSProperties} />

          <p
            className="mb-3 max-w-sm"
            style={{
              fontFamily: 'var(--font-lora)',
              color: INK,
              fontSize: '1.1rem',
              lineHeight: 1.75,
            }}
          >
            Configuração inicial da plataforma.
          </p>
          <p
            className="max-w-sm"
            style={{
              fontFamily: 'var(--font-lora)',
              color: MUTED,
              fontSize: '1rem',
              fontStyle: 'italic',
              lineHeight: 1.7,
            }}
          >
            Configure branding, integrações e validação para colocar a instância em operação.
          </p>
        </div>

        {/* Step progress indicator */}
        <div className="w-full max-w-xs">
          <ClassicRule className="w-full mb-6" style={{ color: INK } as React.CSSProperties} />
          <div className="space-y-3">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className="flex items-center gap-3 w-full text-left transition-opacity hover:opacity-100"
                style={{ opacity: activeStep === step.id ? 1 : 0.55 }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-lora)',
                    color: ACCENT,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    minWidth: '1.5rem',
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-lora)',
                    color: activeStep === step.id ? INK : MUTED,
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  {step.label}
                </span>
                {activeStep === step.id && (
                  <div className="flex-1 h-px" style={{ backgroundColor: ACCENT, opacity: 0.4 }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Vertical separator — sticky to match the left panel */}
      <div
        className="hidden lg:block sticky top-0 h-screen flex-shrink-0 w-px"
        style={{ backgroundColor: BORDER }}
      />

      {/* Right form panel — natural scroll, min-h-screen to give sticky elements room */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-8 py-8 min-h-screen">
        <motion.div
          className="w-full max-w-[640px] my-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.9, ease: 'easeOut' }}
        >
          <div
            className="relative px-8 sm:px-12 py-10"
            style={{
              backgroundColor: '#faf6ee',
              border: `1px solid ${BORDER}`,
              boxShadow: '0 2px 24px rgba(30,19,12,0.08)',
            }}
          >
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-9 h-9" style={{ color: ACCENT }}>
              <CornerBracket />
            </div>
            <div className="absolute top-0 right-0 w-9 h-9" style={{ color: ACCENT, transform: 'scaleX(-1)' }}>
              <CornerBracket />
            </div>
            <div className="absolute bottom-0 left-0 w-9 h-9" style={{ color: ACCENT, transform: 'scaleY(-1)' }}>
              <CornerBracket />
            </div>
            <div className="absolute bottom-0 right-0 w-9 h-9" style={{ color: ACCENT, transform: 'scale(-1)' }}>
              <CornerBracket />
            </div>

            {/* Mobile logo */}
            <div className="flex justify-center mb-5 lg:hidden" style={{ color: ACCENT }}>
              <SwiftMark className="w-20" />
            </div>

            {/* Card heading */}
            <div className="text-center mb-1">
              <h2
                style={{
                  fontFamily: 'var(--font-playfair)',
                  color: INK,
                  fontSize: '2rem',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                }}
              >
                {isCompleted ? 'Manutenção da Instalação' : 'Configuração Inicial'}
              </h2>
            </div>

            <ClassicRule className="w-full my-5" style={{ color: INK } as React.CSSProperties} />

            {/* Step tabs */}
            <div className="flex overflow-x-auto mb-4">
              {STEPS.map(step => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className="flex-1 py-3 text-center transition-all min-w-[80px]"
                  style={{
                    fontFamily: 'var(--font-lora)',
                    fontSize: '0.82rem',
                    fontWeight: activeStep === step.id ? 600 : 400,
                    color: activeStep === step.id ? INK : MUTED,
                    borderBottom:
                      activeStep === step.id
                        ? `1.5px solid ${ACCENT}`
                        : `1px solid ${BORDER}`,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    background: 'transparent',
                  }}
                >
                  {step.label}
                </button>
              ))}
            </div>

            {/* Status bar */}
            <div
              className="mb-5 px-4 py-2.5"
              style={{ borderLeft: `2px solid ${ACCENT}` }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-lora)',
                  color: MUTED,
                  fontSize: '0.82rem',
                  lineHeight: 1.7,
                }}
              >
                Usuário: <span style={{ color: INK }}>{currentUserEmail}</span>
                {'  ·  '}
                Status: <span style={{ color: INK }}>{state?.installation.status}</span>
                {'  ·  '}
                Completo: <span style={{ color: INK }}>{isCompleted ? 'Sim' : 'Não'}</span>
              </p>
            </div>

            {/* Feedback messages */}
            <div className="min-h-5 mb-2 text-center">
              <AnimatePresence>
                {message && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      fontFamily: 'var(--font-lora)',
                      color: ACCENT,
                      fontSize: '0.95rem',
                      fontStyle: 'italic',
                    }}
                  >
                    {message}
                  </motion.p>
                )}
                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      fontFamily: 'var(--font-lora)',
                      color: '#8b2525',
                      fontSize: '0.95rem',
                      fontStyle: 'italic',
                    }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Claiming indicator */}
            {claiming && (
              <div
                className="flex items-center gap-2 mb-4"
                style={{ fontFamily: 'var(--font-lora)', color: MUTED, fontSize: '0.9rem', fontStyle: 'italic' }}
              >
                <InlineSpinner />
                Reservando setup inicial...
              </div>
            )}

            {/* Active step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {activeStep === 'branding' && (
                  <BrandingStep
                    form={brandingForm}
                    onChange={setBrandingForm}
                    saving={saving}
                    onSave={() => saveStep('branding')}
                  />
                )}

                {activeStep === 'integrations' && (
                  <IntegrationsStep
                    form={integrationsForm}
                    onChange={setIntegrationsForm}
                    saving={saving}
                    isConnectingBackupDrive={isConnectingBackupDrive}
                    secretConfigMap={secretConfigMap}
                    publicGoogleClientId={state?.publicSettings.googleClientId}
                    onSave={() => saveStep('integrations')}
                    onConnectBackupDrive={connectBackupDrive}
                  />
                )}

                {activeStep === 'validation' && (
                  <ValidationStep
                    validationChecks={validationChecks}
                    saving={saving}
                    onRunValidation={runValidation}
                  />
                )}

                {activeStep === 'summary' && (
                  <SummaryStep
                    institutionName={brandingForm.institutionName}
                    validationChecks={validationChecks}
                    isCompleted={isCompleted}
                    completing={completing}
                    saving={saving}
                    onComplete={handleComplete}
                    onRevalidate={runValidation}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
