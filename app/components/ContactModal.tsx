'use client'

import { useState } from 'react'
import { X, Mail, User, MessageSquare, Send } from 'lucide-react'
import { useTranslation } from '../contexts/LanguageContext'
import Button from './Button'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    courseInterest: '',
    message: ''
  })
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('validation.required')
    }

    if (!formData.email.trim()) {
      newErrors.email = t('validation.required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.email')
    }

    if (!formData.message.trim()) {
      newErrors.message = t('validation.required')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    // Generate mailto link with form data
    const subject = `Contato via SwiftEDU - ${formData.name}`
    const body = `Nome: ${formData.name}
Email: ${formData.email}${formData.courseInterest ? `
Interesse em Curso: ${formData.courseInterest}` : ''}

Mensagem:
${formData.message}

---
Esta mensagem foi enviada através do formulário de contato do sistema SwiftEDU.`

    // Encode the email content for URL
    const mailtoLink = `mailto:iqmasetti@masetti.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    
    // Open email client
    window.open(mailtoLink, '_blank')
    
    // Show success message and close modal
    setSubmitStatus('success')
    setFormData({ name: '', email: '', courseInterest: '', message: '' })
    setTimeout(() => {
      onClose()
      setSubmitStatus('idle')
    }, 2000)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('contact.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('contact.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label={t('contact.close')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Field */}
          <div>
            <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('contact.name')} <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                id="contact-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  errors.name ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-slate-700'
                }`}
                placeholder={t('contact.namePlaceholder')}
disabled={false}
              />
            </div>
            {errors.name && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('contact.email')} <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="email"
                id="contact-email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  errors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-slate-700'
                }`}
                placeholder={t('contact.emailPlaceholder')}
disabled={false}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Course Interest Field */}
          <div>
            <label htmlFor="contact-course" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('contact.courseInterest')}
            </label>
            <input
              type="text"
              id="contact-course"
              value={formData.courseInterest}
              onChange={(e) => handleInputChange('courseInterest', e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder={t('contact.courseInterestPlaceholder')}
              disabled={false}
            />
          </div>

          {/* Message Field */}
          <div>
            <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('contact.message')} <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <div className="relative group">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <textarea
                id="contact-message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                rows={4}
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none ${
                  errors.message ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-slate-700'
                }`}
                placeholder={t('contact.messagePlaceholder')}
disabled={false}
              />
            </div>
            {errors.message && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.message}</p>
            )}
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-lg">
              <p className="text-green-700 dark:text-green-300 text-sm">{t('contact.success')}</p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg">
              <p className="text-red-700 dark:text-red-400 text-sm">{t('contact.error')}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={false}
              className="flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('contact.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Send className="w-4 h-4" />}
              iconPosition="right"
              className="flex-1 !bg-indigo-600 !hover:bg-indigo-700 !text-white !border-transparent"
            >
              {t('contact.send')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}