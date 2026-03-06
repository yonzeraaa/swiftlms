'use client'

import { useState, useEffect } from 'react'
import { Save, Bell, Shield, Palette, Globe, Database as DatabaseIcon, User, Key, Check, X, Camera, Phone, Mail, Settings as SettingsIcon, HardDriveDownload, ExternalLink, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import Card from '../../components/Card'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/Button'
import { Database } from '@/lib/database.types'
import { useTheme } from '../../contexts/ThemeContext'
import { useLanguage, useTranslation } from '../../contexts/LanguageContext'
import { getUserProfileData, updateUserProfile } from '@/lib/actions/admin-settings'
import type { BackupSummary } from '@/lib/backup/types'
import type { SetupWizardState } from '@/lib/setup/types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface UserSettings {
  notifications: {
    email: boolean
    courseUpdates: boolean
    newEnrollments: boolean
    systemUpdates: boolean
  }
  appearance: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    dateFormat: string
  }
  privacy: {
    profileVisibility: 'public' | 'private' | 'connections'
    showEmail: boolean
    showPhone: boolean
  }
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [versionInfo, setVersionInfo] = useState<{
    version: string
    gitHash: string
    gitDate: string
    buildDate: string
  } | null>(null)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: ''
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { t } = useTranslation()
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      courseUpdates: true,
      newEnrollments: true,
      systemUpdates: false
    },
    appearance: {
      theme: theme as 'light' | 'dark' | 'auto',
      language: language,
      dateFormat: 'DD/MM/YYYY'
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: true,
      showPhone: false
    }
  })
  const [activeTab, setActiveTab] = useState('profile')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [backupState, setBackupState] = useState<{
    status: 'idle' | 'running' | 'success' | 'error'
    lastResult: {
      backupId: string
      status: string
      driveFolderUrl: string
      tablesExported: number
      filesExported: number
      bytesUploaded: number
      completedAt: string
    } | null
    error: string | null
  }>({ status: 'idle', lastResult: null, error: null })
  const [availableBackups, setAvailableBackups] = useState<BackupSummary[]>([])
  const [backupListState, setBackupListState] = useState<{
    status: 'idle' | 'running' | 'success' | 'error'
    error: string | null
  }>({ status: 'idle', error: null })
  const [selectedBackupId, setSelectedBackupId] = useState<string>('')
  const [restoreOptions, setRestoreOptions] = useState({
    restoreDatabase: true,
    restoreStorage: true
  })
  const [restoreState, setRestoreState] = useState<{
    status: 'idle' | 'running' | 'success' | 'error'
    lastResult: {
      backupId: string
      mode: 'dry-run' | 'apply'
      validatedArtifacts: number
      restoredTables: number
      restoredFiles: number
    } | null
    error: string | null
  }>({ status: 'idle', lastResult: null, error: null })
  const [restoreModal, setRestoreModal] = useState<{
    open: boolean
    status: 'idle' | 'running' | 'success' | 'error'
    error: string | null
  }>({ open: false, status: 'idle', error: null })
  const [clearModal, setClearModal] = useState<{
    open: boolean
    password: string
    status: 'idle' | 'running' | 'success' | 'error'
    error: string | null
  }>({ open: false, password: '', status: 'idle', error: null })
  const [installationState, setInstallationState] = useState<SetupWizardState | null>(null)
  const [installationValidationState, setInstallationValidationState] = useState<{
    status: 'idle' | 'running' | 'success' | 'error'
    error: string | null
  }>({ status: 'idle', error: null })

  useEffect(() => {
    fetchUserData()
    fetchVersion()
    fetchInstallationState()
    fetchBackups()
  }, [])

  useEffect(() => {
    if (!selectedBackupId && availableBackups.length > 0) {
      setSelectedBackupId(availableBackups[0].backupId)
    }
  }, [availableBackups, selectedBackupId])

  const fetchVersion = async () => {
    try {
      const response = await fetch('/version.json')
      if (response.ok) {
        const data = await response.json()
        setVersionInfo(data)
      }
    } catch (error) {
      console.error('Error fetching version:', error)
      setVersionInfo({
        version: '1.0.0',
        gitHash: 'unknown',
        gitDate: new Date().toISOString(),
        buildDate: new Date().toISOString()
      })
    }
  }

  const fetchUserData = async () => {
    try {
      const result = await getUserProfileData()

      if (result.success && result.profile) {
        setCurrentUser(result.profile)
        setUserId(result.userId || '')
        setProfileForm({
          full_name: result.profile.full_name || '',
          email: result.profile.email,
          phone: result.profile.phone || '',
          bio: result.profile.bio || ''
        })
      } else {
        console.error('Error fetching user data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInstallationState = async () => {
    try {
      const response = await fetch('/api/setup/status', { credentials: 'include' })
      const data = await response.json()
      if (response.ok) {
        setInstallationState(data.state)
      }
    } catch (error) {
      console.error('Error fetching installation state:', error)
    }
  }

  const fetchBackups = async () => {
    setBackupListState({ status: 'running', error: null })
    try {
      const response = await fetch('/api/admin/backup/restore', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao carregar backups')
      setAvailableBackups(data.backups || [])
      setBackupListState({ status: 'success', error: null })
    } catch (error: any) {
      setBackupListState({ status: 'error', error: error.message })
    }
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    const truncated = numbers.slice(0, 11)
    
    if (truncated.length <= 2) {
      return truncated
    } else if (truncated.length <= 7) {
      return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`
    } else if (truncated.length <= 10) {
      return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 6)}-${truncated.slice(6)}`
    } else {
      return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 7)}-${truncated.slice(7)}`
    }
  }

  const handleProfileSave = async () => {
    if (!currentUser || !userId) return
    setSaving(true)
    setMessage(null)

    try {
      const result = await updateUserProfile({
        userId,
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        bio: profileForm.bio
      })

      if (result.success) {
        setMessage({ type: 'success', text: t('settings.profileUpdated') })

        // Update local state
        setCurrentUser({
          ...currentUser,
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          bio: profileForm.bio
        })
      } else {
        setMessage({ type: 'error', text: result.error || t('settings.error') + ' ' + t('settings.profile').toLowerCase() })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t('settings.error') + ' ' + t('settings.profile').toLowerCase() })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: t('settings.passwordsDontMatch') })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: t('settings.passwordTooShort') })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: passwordForm.newPassword })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: t('settings.passwordChanged') })
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        setMessage({ type: 'error', text: result.error || t('settings.error') + ' ' + t('settings.password').toLowerCase() })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t('settings.error') + ' ' + t('settings.password').toLowerCase() })
    } finally {
      setSaving(false)
    }
  }

  const handleSettingsSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // In a real app, you would save these settings to a user_settings table
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage({ type: 'success', text: t('settings.title') + ' ' + t('settings.success') })
    } catch {
      setMessage({ type: 'error', text: t('settings.error') + ' ' + t('settings.title').toLowerCase() })
    } finally {
      setSaving(false)
    }
  }

  const handleClearData = async () => {
    setClearModal(prev => ({ ...prev, status: 'running', error: null }))
    try {
      const response = await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: clearModal.password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao limpar dados')
      setClearModal(prev => ({ ...prev, status: 'success', error: null }))
    } catch (error: any) {
      setClearModal(prev => ({ ...prev, status: 'error', error: error.message }))
    }
  }

  const handleBackup = async () => {
    setBackupState({ status: 'running', lastResult: null, error: null })
    try {
      const response = await fetch('/api/admin/backup', { method: 'POST', credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao executar backup')
      setBackupState({ status: 'success', lastResult: data, error: null })
      await fetchBackups()
    } catch (error: any) {
      setBackupState({ status: 'error', lastResult: null, error: error.message })
    }
  }

  const handleBackupValidation = async () => {
    if (!selectedBackupId) return

    setRestoreState({ status: 'running', lastResult: null, error: null })
    try {
      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          backupId: selectedBackupId,
          apply: false,
          restoreDatabase: restoreOptions.restoreDatabase,
          restoreStorage: restoreOptions.restoreStorage,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao validar backup')
      setRestoreState({ status: 'success', lastResult: data, error: null })
    } catch (error: any) {
      setRestoreState({ status: 'error', lastResult: null, error: error.message })
    }
  }

  const handleBackupRestore = async () => {
    if (!selectedBackupId) return

    setRestoreModal(prev => ({ ...prev, status: 'running', error: null }))
    try {
      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          backupId: selectedBackupId,
          apply: true,
          restoreDatabase: restoreOptions.restoreDatabase,
          restoreStorage: restoreOptions.restoreStorage,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao restaurar backup')
      setRestoreState({ status: 'success', lastResult: data, error: null })
      setRestoreModal({ open: false, status: 'success', error: null })
    } catch (error: any) {
      setRestoreModal({ open: true, status: 'error', error: error.message })
      setRestoreState({ status: 'error', lastResult: null, error: error.message })
    }
  }

  const handleInstallationValidation = async () => {
    setInstallationValidationState({ status: 'running', error: null })
    try {
      const response = await fetch('/api/setup/validate', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao validar instalação')
      await fetchInstallationState()
      setInstallationValidationState({ status: 'success', error: null })
    } catch (error: any) {
      setInstallationValidationState({ status: 'error', error: error.message })
    }
  }

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: User },
    { id: 'password', label: t('settings.password'), icon: Key },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    { id: 'privacy', label: t('settings.privacy'), icon: Shield },
    { id: 'backup', label: 'Backup', icon: HardDriveDownload },
    { id: 'installation', label: 'Instalação', icon: DatabaseIcon }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold flex items-center gap-2">
          <SettingsIcon className="w-8 h-8 text-gold-400" />
          {t('settings.title')}
        </h1>
        <p className="text-gold-300 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-gold-500/20 text-gold border border-gold-500/30'
                  : 'text-gold-300 hover:bg-navy-700/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card title={t('settings.profileInfo')}>
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gold-500/20 flex items-center justify-center text-gold">
                  <User className="w-12 h-12" />
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-gold-500 rounded-full text-navy-900 hover:bg-gold-600 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gold">{currentUser?.full_name || t('settings.noName')}</h3>
                <p className="text-gold-300">{currentUser?.role === 'admin' ? t('settings.administrator') : currentUser?.role === 'instructor' ? t('settings.instructor') : t('settings.student')}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('settings.fullName')}
                </label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('settings.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                  <input
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="w-full pl-10 pr-4 py-2 bg-navy-900/30 border border-navy-600 rounded-lg text-gold-300 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gold-300 mt-1">{t('settings.emailCannotChange')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('settings.phone')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: formatPhone(e.target.value) })}
                    placeholder="(21) 98765-4321"
                    maxLength={15}
                    className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('settings.bio')}
                </label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  rows={4}
                  placeholder={t('settings.bioPlaceholder')}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleProfileSave}
                disabled={saving}
                icon={<Save className="w-5 h-5 flex-shrink-0" />}
              >
                {saving ? t('settings.saving') : t('settings.saveChanges')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <Card title={t('settings.changePassword')}>
          <div className="max-w-md space-y-6">
            <div>
              <label className="block text-sm font-medium text-gold-200 mb-2">
                Senha Atual
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-200 mb-2">
                Nova Senha
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
              <p className="text-xs text-gold-300 mt-1">Mínimo 6 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-200 mb-2">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handlePasswordChange}
                disabled={saving}
                icon={<Key className="w-5 h-5 flex-shrink-0" />}
              >
                {saving ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card title="Preferências de Notificação">
          <div className="space-y-4">
            {Object.entries({
              email: { label: 'Notificações por Email', description: 'Receber notificações importantes por email' },
              courseUpdates: { label: 'Atualizações de Cursos', description: 'Notificar sobre mudanças nos cursos matriculados' },
              newEnrollments: { label: 'Novas Matrículas', description: 'Notificar quando alunos se matriculam em seus cursos' },
              systemUpdates: { label: 'Atualizações do Sistema', description: 'Notificar sobre manutenções e novidades' }
            }).map(([key, info]) => (
              <label key={key} className="flex items-center justify-between p-4 bg-navy-900/30 rounded-lg cursor-pointer hover:bg-navy-700/30">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gold-400" />
                  <div>
                    <p className="text-gold-200 font-medium">{info.label}</p>
                    <p className="text-gold-400 text-sm">{info.description}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications[key as keyof typeof settings.notifications]}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, [key]: e.target.checked }
                  })}
                  className="w-4 h-4 text-gold-500 bg-navy-900 border-navy-600 rounded focus:ring-gold-500"
                />
              </label>
            ))}

            <div className="flex justify-end pt-4">
              <Button
                variant="primary"
                onClick={handleSettingsSave}
                disabled={saving}
                icon={<Save className="w-5 h-5 flex-shrink-0" />}
              >
                {saving ? 'Salvando...' : 'Salvar Preferências'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <Card title="Aparência">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gold-200 mb-3">
                Tema
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'auto'] as const).map((themeOption) => (
                  <button
                    key={themeOption}
                    onClick={() => {
                      setSettings({
                        ...settings,
                        appearance: { ...settings.appearance, theme: themeOption }
                      })
                      setTheme(themeOption)
                    }}
                    className={`p-4 rounded-lg border transition-all ${
                      settings.appearance.theme === themeOption
                        ? 'border-gold-500 bg-gold-500/10'
                        : 'border-navy-600 hover:border-gold-500/50'
                    }`}
                  >
                    <Palette className={`w-6 h-6 mx-auto mb-2 ${
                      settings.appearance.theme === themeOption ? 'text-gold' : 'text-gold-400'
                    }`} />
                    <p className={`text-sm ${
                      settings.appearance.theme === themeOption ? 'text-gold' : 'text-gold-300'
                    }`}>
                      {themeOption === 'light' ? 'Claro' : themeOption === 'dark' ? 'Escuro' : 'Automático'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-200 mb-2">
                Idioma
              </label>
              <select
                value={settings.appearance.language}
                onChange={(e) => {
                  const newLanguage = e.target.value as any
                  setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, language: newLanguage }
                  })
                  setLanguage(newLanguage)
                }}
                className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-200 mb-2">
                Formato de Data
              </label>
              <select
                value={settings.appearance.dateFormat}
                onChange={(e) => setSettings({
                  ...settings,
                  appearance: { ...settings.appearance, dateFormat: e.target.value }
                })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              >
                <option value="DD/MM/YYYY">DD/MM/AAAA</option>
                <option value="MM/DD/YYYY">MM/DD/AAAA</option>
                <option value="YYYY-MM-DD">AAAA-MM-DD</option>
              </select>
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleSettingsSave}
                disabled={saving}
                icon={<Save className="w-5 h-5 flex-shrink-0" />}
              >
                {saving ? 'Salvando...' : 'Salvar Aparência'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <Card title="Privacidade">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gold-200 mb-2">
                Visibilidade do Perfil
              </label>
              <select
                value={settings.privacy.profileVisibility}
                onChange={(e) => setSettings({
                  ...settings,
                  privacy: { ...settings.privacy, profileVisibility: e.target.value as any }
                })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              >
                <option value="public">Público - Todos podem ver</option>
                <option value="connections">Conexões - Apenas contatos</option>
                <option value="private">Privado - Apenas você</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 bg-navy-900/30 rounded-lg cursor-pointer hover:bg-navy-700/30">
                <div>
                  <p className="text-gold-200 font-medium">Mostrar Email no Perfil</p>
                  <p className="text-gold-400 text-sm">Permitir que outros vejam seu email</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.privacy.showEmail}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: { ...settings.privacy, showEmail: e.target.checked }
                  })}
                  className="w-4 h-4 text-gold-500 bg-navy-900 border-navy-600 rounded focus:ring-gold-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-navy-900/30 rounded-lg cursor-pointer hover:bg-navy-700/30">
                <div>
                  <p className="text-gold-200 font-medium">Mostrar Telefone no Perfil</p>
                  <p className="text-gold-400 text-sm">Permitir que outros vejam seu telefone</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.privacy.showPhone}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: { ...settings.privacy, showPhone: e.target.checked }
                  })}
                  className="w-4 h-4 text-gold-500 bg-navy-900 border-navy-600 rounded focus:ring-gold-500"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleSettingsSave}
                disabled={saving}
                icon={<Save className="w-5 h-5 flex-shrink-0" />}
              >
                {saving ? 'Salvando...' : 'Salvar Privacidade'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <Card title="Backup para Google Drive">
          <div className="space-y-6">
            <p className="text-gold-300 text-sm">
              Exporta dados dos alunos, estrutura acadêmica, provas e templates em artefatos
              criptografados para uma pasta datada no Google Drive.
            </p>

            {/* Status feedback */}
            {backupState.status === 'success' && backupState.lastResult && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-green-400 font-medium">
                  <Check className="w-5 h-5" />
                  Backup concluído: {backupState.lastResult.backupId}
                </div>
                <div className="text-gold-300 text-sm">
                  <p>Status: <span className="text-gold-100">{backupState.lastResult.status}</span></p>
                  <p>Tabelas exportadas: <span className="text-gold-100">{backupState.lastResult.tablesExported}</span></p>
                  <p>Arquivos exportados: <span className="text-gold-100">{backupState.lastResult.filesExported}</span></p>
                  <p>Bytes enviados: <span className="text-gold-100">{backupState.lastResult.bytesUploaded}</span></p>
                  <p>Concluído em: <span className="text-gold-100">{new Date(backupState.lastResult.completedAt).toLocaleString('pt-BR')}</span></p>
                </div>
                <a
                  href={backupState.lastResult.driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-gold hover:underline"
                >
                  Abrir pasta no Drive <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {backupState.status === 'error' && (
              <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{backupState.error}</span>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button
                variant="primary"
                onClick={handleBackup}
                disabled={backupState.status === 'running'}
                icon={backupState.status === 'running'
                  ? <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
                  : <HardDriveDownload className="w-5 h-5 flex-shrink-0" />
                }
              >
                {backupState.status === 'running' ? 'Executando backup...' : 'Executar Backup Agora'}
              </Button>
            </div>

            <div className="rounded-lg border border-navy-600 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-gold-200 font-medium">Restauração pela interface</p>
                  <p className="text-gold-400 text-sm">
                    Primeiro valide o backup. Depois aplique a restauração real.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={fetchBackups}
                  disabled={backupListState.status === 'running'}
                  icon={backupListState.status === 'running'
                    ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                    : <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  }
                >
                  {backupListState.status === 'running' ? 'Atualizando...' : 'Atualizar Lista'}
                </Button>
              </div>

              {backupListState.status === 'error' && backupListState.error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {backupListState.error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  Backup disponível
                </label>
                <select
                  value={selectedBackupId}
                  onChange={(e) => setSelectedBackupId(e.target.value)}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                >
                  {availableBackups.length === 0 && (
                    <option value="">Nenhum backup encontrado</option>
                  )}
                  {availableBackups.map(backup => (
                    <option key={backup.backupId} value={backup.backupId}>
                      {backup.backupId} • {backup.status} • {backup.completedAt ? new Date(backup.completedAt).toLocaleString('pt-BR') : 'sem conclusão'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBackupId && (
                <div className="rounded-lg bg-navy-900/30 p-4 text-sm text-gold-300 space-y-1">
                  {availableBackups
                    .filter(backup => backup.backupId === selectedBackupId)
                    .map(backup => (
                      <div key={backup.backupId}>
                        <p>Status: <span className="text-gold-100">{backup.status}</span></p>
                        <p>Tabelas: <span className="text-gold-100">{backup.tablesExported}</span></p>
                        <p>Arquivos: <span className="text-gold-100">{backup.filesExported}</span></p>
                        <a
                          href={backup.driveFolderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-gold hover:underline mt-1"
                        >
                          Abrir pasta no Drive <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-4 bg-navy-900/30 rounded-lg cursor-pointer hover:bg-navy-700/30">
                  <div>
                    <p className="text-gold-200 font-medium">Restaurar banco</p>
                    <p className="text-gold-400 text-sm">Tabelas acadêmicas e perfis.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={restoreOptions.restoreDatabase}
                    onChange={(e) => setRestoreOptions(prev => ({ ...prev, restoreDatabase: e.target.checked }))}
                    className="w-4 h-4 text-gold-500 bg-navy-900 border-navy-600 rounded focus:ring-gold-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-navy-900/30 rounded-lg cursor-pointer hover:bg-navy-700/30">
                  <div>
                    <p className="text-gold-200 font-medium">Restaurar arquivos</p>
                    <p className="text-gold-400 text-sm">Buckets `certificados` e `avatars`.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={restoreOptions.restoreStorage}
                    onChange={(e) => setRestoreOptions(prev => ({ ...prev, restoreStorage: e.target.checked }))}
                    className="w-4 h-4 text-gold-500 bg-navy-900 border-navy-600 rounded focus:ring-gold-500"
                  />
                </label>
              </div>

              {restoreState.status === 'success' && restoreState.lastResult && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300 space-y-1">
                  <p>Backup: {restoreState.lastResult.backupId}</p>
                  <p>Modo: {restoreState.lastResult.mode === 'dry-run' ? 'validação' : 'restauração real'}</p>
                  <p>Artefatos validados: {restoreState.lastResult.validatedArtifacts}</p>
                  <p>Tabelas restauradas: {restoreState.lastResult.restoredTables}</p>
                  <p>Arquivos restaurados: {restoreState.lastResult.restoredFiles}</p>
                </div>
              )}

              {restoreState.status === 'error' && restoreState.error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {restoreState.error}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={handleBackupValidation}
                  disabled={
                    !selectedBackupId ||
                    restoreState.status === 'running' ||
                    (!restoreOptions.restoreDatabase && !restoreOptions.restoreStorage)
                  }
                  icon={restoreState.status === 'running'
                    ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                    : <Check className="w-4 h-4 flex-shrink-0" />
                  }
                >
                  {restoreState.status === 'running' ? 'Validando...' : 'Validar Backup'}
                </Button>

                <Button
                  variant="danger"
                  onClick={() => setRestoreModal({ open: true, status: 'idle', error: null })}
                  disabled={
                    !selectedBackupId ||
                    !(restoreState.lastResult?.backupId === selectedBackupId && restoreState.lastResult.mode === 'dry-run') ||
                    (!restoreOptions.restoreDatabase && !restoreOptions.restoreStorage)
                  }
                  icon={<AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                >
                  Restaurar Backup
                </Button>
              </div>
            </div>

            <div className="p-4 bg-navy-900/30 rounded-lg space-y-1 text-sm text-gold-400">
              <p className="font-medium text-gold-200">Sobre o backup automático (cron)</p>
              <p>O deploy agora usa Vercel Cron para backup diário e validação semanal do último backup.</p>
              <code className="block mt-2 text-xs bg-navy-900/60 p-2 rounded text-gold-300 font-mono">
                0 5 * * * → /api/admin/backup
              </code>
              <code className="block mt-2 text-xs bg-navy-900/60 p-2 rounded text-gold-300 font-mono">
                0 6 * * 0 → /api/admin/backup/validate
              </code>
              <p className="mt-2">As rotinas usam segredo dedicado via header Authorization.</p>
            </div>

            {/* Danger zone */}
            <div className="border border-red-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-medium">
                <AlertTriangle className="w-5 h-5" />
                Zona de Perigo
              </div>
              <p className="text-gold-400 text-sm">
                Remove banco operacional, arquivos e perfis não-admin. A instalação e os acessos
                de administrador são preservados. Esta ação não pode ser desfeita.
              </p>
              <Button
                variant="danger"
                onClick={() => setClearModal({ open: true, password: '', status: 'idle', error: null })}
                icon={<Trash2 className="w-5 h-5 flex-shrink-0" />}
              >
                Limpar Todos os Dados
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'installation' && (
        <Card title="Configuração da Instalação">
          <div className="space-y-6">
            <div className="rounded-lg border border-navy-600 bg-navy-900/30 p-4 text-sm text-gold-300 space-y-2">
              <p>Status: <span className="text-gold-100">{installationState?.installation.status || 'indisponível'}</span></p>
              <p>Setup completo: <span className="text-gold-100">{installationState?.installation.isSetupComplete ? 'Sim' : 'Não'}</span></p>
              <p>Etapa atual: <span className="text-gold-100">{installationState?.installation.currentStep || '-'}</span></p>
              <p>Pendências: <span className="text-gold-100">{installationState?.validation.issues.length || 0}</span></p>
            </div>

            {installationState?.validation.checks?.length ? (
              <div className="space-y-2">
                {installationState.validation.checks.map(check => (
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
            ) : null}

            {installationState?.validation.issues && installationState.validation.issues.length > 0 && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 space-y-1">
                {installationState.validation.issues.map(issue => (
                  <p key={issue}>{issue}</p>
                ))}
              </div>
            )}

            {installationValidationState.status === 'error' && installationValidationState.error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {installationValidationState.error}
              </div>
            )}

            {installationValidationState.status === 'success' && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
                Integrações revalidadas.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={handleInstallationValidation}
                disabled={installationValidationState.status === 'running'}
                icon={installationValidationState.status === 'running'
                  ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                  : <Check className="w-4 h-4 flex-shrink-0" />
                }
              >
                {installationValidationState.status === 'running' ? 'Validando...' : 'Revalidar Integrações'}
              </Button>

              <a
                href="/setup"
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-navy-950 font-medium hover:bg-gold-300 transition-colors"
              >
                Abrir Setup
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </Card>
      )}

      {/* Restore confirmation modal */}
      {restoreModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-navy-800 border border-red-500/30 rounded-xl p-6 w-full max-w-lg mx-4 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h2 className="text-lg font-semibold">Confirmar restauração</h2>
            </div>

            <div className="text-sm text-gold-300 space-y-2">
              <p>
                Você vai aplicar o backup <span className="text-gold-100 font-medium">{selectedBackupId}</span>.
              </p>
              <p>Use isso apenas em ambiente isolado ou após validar impacto no banco atual.</p>
            </div>

            <div className="rounded-lg bg-navy-900/40 p-4 text-sm text-gold-300 space-y-1">
              <p>Banco: <span className="text-gold-100">{restoreOptions.restoreDatabase ? 'sim' : 'não'}</span></p>
              <p>Arquivos: <span className="text-gold-100">{restoreOptions.restoreStorage ? 'sim' : 'não'}</span></p>
            </div>

            {restoreModal.error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{restoreModal.error}</span>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => setRestoreModal({ open: false, status: 'idle', error: null })}
                disabled={restoreModal.status === 'running'}
                className="px-4 py-2 text-gold-300 hover:text-gold-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <Button
                variant="danger"
                onClick={handleBackupRestore}
                disabled={restoreModal.status === 'running'}
                icon={restoreModal.status === 'running'
                  ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                  : <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                }
              >
                {restoreModal.status === 'running' ? 'Restaurando...' : 'Confirmar Restauração'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear data confirmation modal */}
      {clearModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-navy-800 border border-red-500/30 rounded-xl p-6 w-full max-w-md mx-4 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h2 className="text-lg font-semibold">Confirmar limpeza de dados</h2>
            </div>

            <p className="text-gold-300 text-sm">
              O sistema vai remover banco operacional, storage e usuários não-admin. Digite sua
              senha de administrador para confirmar.
            </p>

            {clearModal.status === 'success' ? (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                <Check className="w-5 h-5" />
                Limpeza completa concluída.
              </div>
            ) : (
              <>
                {clearModal.error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    <X className="w-4 h-4 flex-shrink-0" />
                    {clearModal.error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    Senha do administrador
                  </label>
                  <input
                    type="password"
                    value={clearModal.password}
                    onChange={e => setClearModal(prev => ({ ...prev, password: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && clearModal.password && handleClearData()}
                    autoFocus
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-1">
                  <button
                    onClick={() => setClearModal({ open: false, password: '', status: 'idle', error: null })}
                    className="px-4 py-2 text-gold-300 hover:text-gold-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <Button
                    variant="danger"
                    onClick={handleClearData}
                    disabled={!clearModal.password || clearModal.status === 'running'}
                    icon={clearModal.status === 'running'
                      ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                      : <Trash2 className="w-4 h-4 flex-shrink-0" />
                    }
                  >
                    {clearModal.status === 'running' ? 'Removendo...' : 'Confirmar e Limpar'}
                  </Button>
                </div>
              </>
            )}

            {clearModal.status === 'success' && (
              <div className="flex justify-end">
                <button
                  onClick={() => setClearModal({ open: false, password: '', status: 'idle', error: null })}
                  className="px-4 py-2 text-gold-300 hover:text-gold-100 transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* System Info */}
      <Card title={t('settings.systemInfo')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-navy-900/30 rounded-lg">
            <Globe className="w-5 h-5 text-gold-400" />
            <div>
              <p className="text-gold-400 text-sm">{t('settings.version')}</p>
              <p className="text-gold-200 font-mono text-xs">
                {versionInfo?.version || '1.0.0'}
              </p>
              {versionInfo?.gitHash && versionInfo.gitHash !== 'unknown' && (
                <p className="text-gold-300/50 text-xs mt-0.5">
                  {versionInfo.gitHash}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-navy-900/30 rounded-lg">
            <DatabaseIcon className="w-5 h-5 text-gold-400" />
            <div>
              <p className="text-gold-400 text-sm">{t('settings.database')}</p>
              <p className="text-gold-200">Supabase</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-navy-900/30 rounded-lg">
            <Shield className="w-5 h-5 text-gold-400" />
            <div>
              <p className="text-gold-400 text-sm">{t('settings.lastUpdate')}</p>
              <p className="text-gold-200 text-xs">
                {versionInfo?.gitDate
                  ? new Date(versionInfo.gitDate).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })
                  : new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
