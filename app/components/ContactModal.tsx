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
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/send-contact-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', email: '', courseInterest: '', message: '' })
        setTimeout(() => {
          onClose()
          setSubmitStatus('idle')
        }, 2000)
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Error sending contact email:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-navy-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gold-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-navy-600">
          <div>
            <h2 className="text-xl font-bold text-gold">{t('contact.title')}</h2>
            <p className="text-gold-300 text-sm mt-1">{t('contact.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gold-300 hover:text-gold transition-colors"
            aria-label={t('contact.close')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Field */}
          <div>
            <label htmlFor="contact-name" className="block text-sm font-medium text-gold-200 mb-2">
              {t('contact.name')} <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400" />
              <input
                type="text"
                id="contact-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 bg-navy-900/50 border rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all ${
                  errors.name ? 'border-red-500' : 'border-navy-600'
                }`}
                placeholder={t('contact.namePlaceholder')}
                disabled={isSubmitting}
              />
            </div>
            {errors.name && (
              <p className="text-red-400 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="contact-email" className="block text-sm font-medium text-gold-200 mb-2">
              {t('contact.email')} <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400" />
              <input
                type="email"
                id="contact-email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 bg-navy-900/50 border rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all ${
                  errors.email ? 'border-red-500' : 'border-navy-600'
                }`}
                placeholder={t('contact.emailPlaceholder')}
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Course Interest Field */}
          <div>
            <label htmlFor="contact-course" className="block text-sm font-medium text-gold-200 mb-2">
              {t('contact.courseInterest')}
            </label>
            <input
              type="text"
              id="contact-course"
              value={formData.courseInterest}
              onChange={(e) => handleInputChange('courseInterest', e.target.value)}
              className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all"
              placeholder={t('contact.courseInterestPlaceholder')}
              disabled={isSubmitting}
            />
          </div>

          {/* Message Field */}
          <div>
            <label htmlFor="contact-message" className="block text-sm font-medium text-gold-200 mb-2">
              {t('contact.message')} <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gold-400" />
              <textarea
                id="contact-message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                rows={4}
                className={`w-full pl-10 pr-4 py-3 bg-navy-900/50 border rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all resize-none ${
                  errors.message ? 'border-red-500' : 'border-navy-600'
                }`}
                placeholder={t('contact.messagePlaceholder')}
                disabled={isSubmitting}
              />
            </div>
            {errors.message && (
              <p className="text-red-400 text-xs mt-1">{errors.message}</p>
            )}
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-300 text-sm">{t('contact.success')}</p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{t('contact.error')}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              {t('contact.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              icon={!isSubmitting && <Send className="w-4 h-4" />}
              iconPosition="right"
              className="flex-1"
            >
              {isSubmitting ? t('contact.sending') : t('contact.send')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}