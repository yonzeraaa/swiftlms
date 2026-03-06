'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ExternalLink, Loader2, ShieldAlert, Wand2 } from 'lucide-react'
import Button from '@/app/components/Button'
import Card from '@/app/components/Card'
import Spinner from '@/app/components/ui/Spinner'
import type { SetupWizardState } from '@/lib/setup/types'

type StepId = 'branding' | 'integrations' | 'validation' | 'summary'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'branding', label: 'Branding' },
  { id: 'integrations', label: 'Integracoes' },
  { id: 'validation', label: 'Validacao' },
  { id: 'summary', label: 'Resumo' },
]

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
  const [brandingForm, setBrandingForm] = useState({
    institutionName: '',
    logoUrl: '',
    primaryColor: '#D4AF37',
    supportEmail: '',
    supportPhone: '',
  })
  const [integrationsForm, setIntegrationsForm] = useState({
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
      const cleanUrl = `${window.location.pathname}`
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [])

  const secretConfigMap = useMemo(() => {
    const map = new Map<string, { isConfigured: boolean; maskedValue: string | null }>()
    state?.secretStatus.forEach(item => {
      map.set(item.key, {
        isConfigured: item.isConfigured,
        maskedValue: item.maskedValue,
      })
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
        const claimResponse = await fetch('/api/setup/claim', {
          method: 'POST',
          credentials: 'include',
        })
        const claimData = await claimResponse.json()
        if (!claimResponse.ok) throw new Error(claimData.error || 'Falha ao reservar setup')
        setState(claimData.state)
        setMessage('Setup reservado para o seu usuario.')
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
      setMessage(step === 'branding' ? 'Branding salvo.' : 'Integracoes salvas.')
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
      setMessage(data.validation.canComplete ? 'Validacao concluida.' : 'Validacao encontrou pendencias.')
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
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao concluir setup')

      setState(data.state)
      setValidationChecks(data.state.validation)
      setMessage('Setup concluido com sucesso.')
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <Spinner size="xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Instalacao">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            {STEPS.map(step => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  activeStep === step.id
                    ? 'border-gold-500 bg-gold-500/10 text-gold'
                    : 'border-navy-600 bg-navy-900/40 text-gold-300'
                }`}
              >
                <div className="text-sm font-medium">{step.label}</div>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-navy-600 bg-navy-900/30 p-4 text-sm text-gold-300">
            <p>Status: <span className="text-gold-100">{state?.installation.status}</span></p>
            <p>Usuario atual: <span className="text-gold-100">{currentUserEmail}</span></p>
            <p>Setup completo: <span className="text-gold-100">{isCompleted ? 'sim' : 'nao'}</span></p>
          </div>

          {message && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {claiming && (
            <div className="flex items-center gap-2 text-gold-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reservando setup inicial...
            </div>
          )}
        </div>
      </Card>

      {activeStep === 'branding' && (
        <Card title="Branding">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome da instituicao">
              <input
                value={brandingForm.institutionName}
                onChange={e => setBrandingForm(prev => ({ ...prev, institutionName: e.target.value }))}
                className="w-full rounded-lg border border-navy-600 bg-navy-900/50 px-4 py-2 text-gold-100"
              />
            </Field>
            <Field label="Cor primaria">
              <input
                value={brandingForm.primaryColor}
                onChange={e => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="w-full rounded-lg border border-navy-600 bg-navy-900/50 px-4 py-2 text-gold-100"
              />
            </Field>
            <Field label="Logo URL">
              <input
                value={brandingForm.logoUrl}
                onChange={e => setBrandingForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                className="w-full rounded-lg border border-navy-600 bg-navy-900/50 px-4 py-2 text-gold-100"
              />
            </Field>
            <Field label="Email de suporte">
              <input
                value={brandingForm.supportEmail}
                onChange={e => setBrandingForm(prev => ({ ...prev, supportEmail: e.target.value }))}
                className="w-full rounded-lg border border-navy-600 bg-navy-900/50 px-4 py-2 text-gold-100"
              />
            </Field>
            <Field label="Telefone de suporte">
              <input
                value={brandingForm.supportPhone}
                onChange={e => setBrandingForm(prev => ({ ...prev, supportPhone: e.target.value }))}
                className="w-full rounded-lg border border-navy-600 bg-navy-900/50 px-4 py-2 text-gold-100"
              />
            </Field>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => saveStep('branding')}
              disabled={saving}
              icon={saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
            >
              {saving ? 'Salvando...' : 'Salvar branding'}
            </Button>
          </div>
        </Card>
      )}

      {activeStep === 'integrations' && (
        <Card title="Integracoes">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Google Client ID">
                <input
                  value={integrationsForm.googleClientId}
                  onChange={e => setIntegrationsForm(prev => ({ ...prev, googleClientId: e.target.value }))}
                  className="w-full rounded-lg border border-navy-600 bg-navy-900/50 px-4 py-2 text-gold-100"
                />
              </Field>
              <Field label="Google API Key">
                <input
                  value={integrationsForm.googleApiKey}
                  onChange={e => setIntegrationsForm(prev => ({ ...prev, googleApiKey: e.target.value }))}
                  className="w-full rounded-lg border border-navy-600 bg-navy-900/50 px-4 py-2 text-gold-100"
                />
              </Field>
            </div>

            <div className="rounded-lg border border-navy-600 bg-navy-900/30 p-4">
              <p className="mb-3 text-sm font-medium text-gold-200">Backup / Google Drive</p>
              <div className="grid gap-4">
                <Field
                  label="Google Client Secret"
                  hint={secretConfigMap.get('backup.google_client_secret')?.isConfigured ? 'Ja configurado. Preencha apenas se quiser substituir.' : undefined}
                >
                  <input
                    type="password"
                    value={integrationsForm.googleClientSecret}
                    onChange={e => setIntegrationsForm(prev => ({ ...prev, googleClientSecret: e.target.value }))}
                    className="w-full rounded-lg border border-navy-600 bg-navy-900/50 px-4 py-2 text-gold-100"
                    placeholder={secretConfigMap.get('backup.google_client_secret')?.maskedValue || ''}
                  />
                </Field>
                <Field
                  label="Pasta de backup no Drive"
                  hint={secretConfigMap.get('backup.google_drive_backup_folder_id')?.isConfigured ? 'Ja configurado. Preencha apenas se quiser substituir.' : undefined}
                >
                  <input
                    value={integrationsForm.googleDriveBackupFolderId}
                    onChange={e => setIntegrationsForm(prev => ({ ...prev, googleDriveBackupFolderId: e.target.value }))}
                    className="w-full rounded-lg border border-navy-600 bg-navy-900/50 px-4 py-2 text-gold-100"
                    placeholder={secretConfigMap.get('backup.google_drive_backup_folder_id')?.maskedValue || ''}
                  />
                </Field>

                <div className="rounded-lg border border-navy-600 bg-navy-900/40 p-4 space-y-3">
                  <p className="text-sm font-medium text-gold-200">Conexao do backup</p>
                  <p className="text-sm text-gold-300">
                    O backup usa OAuth do seu usuario Google para gravar no seu Drive pessoal.
                  </p>
                  <p className="text-sm text-gold-300">
                    Status: <span className="text-gold-100">
                      {secretConfigMap.get('backup.google_refresh_token')?.isConfigured ? 'Conectado' : 'Nao conectado'}
                    </span>
                  </p>
                  <Button
                    variant="secondary"
                    onClick={connectBackupDrive}
                    disabled={
                      isConnectingBackupDrive ||
                      !state?.publicSettings.googleClientId ||
                      !secretConfigMap.get('backup.google_client_secret')?.isConfigured ||
                      !secretConfigMap.get('backup.google_drive_backup_folder_id')?.isConfigured
                    }
                    icon={isConnectingBackupDrive
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : <ExternalLink className="h-5 w-5" />
                    }
                  >
                    {secretConfigMap.get('backup.google_refresh_token')?.isConfigured ? 'Reconectar Google Drive' : 'Conectar Google Drive'}
                  </Button>
                  {(!secretConfigMap.get('backup.google_client_secret')?.isConfigured ||
                    !secretConfigMap.get('backup.google_drive_backup_folder_id')?.isConfigured) && (
                    <p className="text-xs text-gold-400">
                      Salve Client Secret e pasta de backup antes de conectar.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => saveStep('integrations')}
              disabled={saving}
              icon={saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
            >
              {saving ? 'Salvando...' : 'Salvar integracoes'}
            </Button>
          </div>
        </Card>
      )}

      {activeStep === 'validation' && (
        <Card title="Validacao">
          <div className="space-y-4">
            <p className="text-sm text-gold-300">
              Valida os dados obrigatorios e testa o acesso ao Google Drive de backup.
            </p>

            {validationChecks && (
              <div className="space-y-3">
                {validationChecks.checks.length > 0 && (
                  <div className="space-y-2">
                    {validationChecks.checks.map(check => (
                      <div
                        key={check.key}
                        className={`rounded-lg border p-3 text-sm ${
                          check.status === 'ok'
                            ? 'border-green-500/30 bg-green-500/10 text-green-300'
                            : 'border-red-500/30 bg-red-500/10 text-red-300'
                        }`}
                      >
                        {check.message}
                      </div>
                    ))}
                  </div>
                )}

                {validationChecks.issues.length > 0 && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                    {validationChecks.issues.map(issue => (
                      <p key={issue}>{issue}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              variant="primary"
              onClick={runValidation}
              disabled={saving}
              icon={saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldAlert className="h-5 w-5" />}
            >
              {saving ? 'Validando...' : 'Executar validacao'}
            </Button>
          </div>
        </Card>
      )}

      {activeStep === 'summary' && (
        <Card title={isCompleted ? 'Manutencao da Instalacao' : 'Resumo e conclusao'}>
          <div className="space-y-4">
            <div className="rounded-lg border border-navy-600 bg-navy-900/30 p-4">
              <p className="text-sm text-gold-300">Nome da instituicao</p>
              <p className="text-gold-100">{brandingForm.institutionName || '-'}</p>
            </div>

            <div className="rounded-lg border border-navy-600 bg-navy-900/30 p-4">
              <p className="text-sm text-gold-300">Checks de validacao</p>
              <div className="mt-3 space-y-2">
                {validationChecks?.checks.map(check => (
                  <div
                    key={check.key}
                    className={`rounded-lg border p-3 text-sm ${
                      check.status === 'ok'
                        ? 'border-green-500/30 bg-green-500/10 text-green-300'
                        : 'border-red-500/30 bg-red-500/10 text-red-300'
                    }`}
                  >
                    {check.message}
                  </div>
                ))}

                {validationChecks?.issues.length ? (
                  validationChecks.issues.map(issue => (
                    <p key={issue} className="text-sm text-red-300">{issue}</p>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-sm text-green-300">
                    <Check className="h-4 w-4" />
                    Nenhuma pendencia bloqueante.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {!isCompleted && (
                <Button
                  variant="primary"
                  onClick={handleComplete}
                  disabled={completing || !(validationChecks?.canComplete ?? false)}
                  icon={completing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                >
                  {completing ? 'Concluindo...' : 'Concluir setup'}
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={runValidation}
                disabled={saving}
                icon={<ExternalLink className="h-5 w-5" />}
              >
                Revalidar
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gold-200">{label}</label>
      {children}
      {hint && <p className="text-xs text-gold-400">{hint}</p>}
    </div>
  )
}
