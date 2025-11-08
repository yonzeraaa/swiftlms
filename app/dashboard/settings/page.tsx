'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Save, Bell, Shield, Palette, Globe, Database as DatabaseIcon, User, Key, Check, X, Camera, Phone, Mail, Settings as SettingsIcon } from 'lucide-react'
import Card from '../../components/Card'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useTheme } from '../../contexts/ThemeContext'
import { useLanguage, useTranslation } from '../../contexts/LanguageContext'

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
  const supabase = createClient()

  useEffect(() => {
    fetchUserData()
    fetchVersion()
  }, [])

  const fetchVersion = async () => {
    try {
      const response = await fetch('/version.json')
      if (response.ok) {
        const data = await response.json()
        setVersionInfo(data)
      }
    } catch (error) {
      console.error('Error fetching version:', error)
      // Fallback para versão padrão
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setCurrentUser(profile)
        setProfileForm({
          full_name: profile.full_name || '',
          email: profile.email,
          phone: profile.phone || '',
          bio: profile.bio || ''
        })
      }

      // In a real app, you would fetch user settings from a settings table
      // For now, we'll use default values
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
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
    if (!currentUser) return
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          bio: profileForm.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)

      if (error) throw error

      setMessage({ type: 'success', text: t('settings.profileUpdated') })
      
      // Update local state
      setCurrentUser({
        ...currentUser,
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        bio: profileForm.bio
      })
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
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      setMessage({ type: 'success', text: t('settings.passwordChanged') })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
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
    } catch (error) {
      setMessage({ type: 'error', text: t('settings.error') + ' ' + t('settings.title').toLowerCase() })
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: User },
    { id: 'password', label: t('settings.password'), icon: Key },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    { id: 'privacy', label: t('settings.privacy'), icon: Shield }
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
