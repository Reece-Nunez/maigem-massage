'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Setting {
  key: string
  value: string
  updated_at: string
}

interface SettingsFormProps {
  initialSettings: Setting[]
}

const SETTING_LABELS: Record<string, { label: string; description: string; type: 'text' | 'number' | 'email' | 'tel' }> = {
  business_name: {
    label: 'Business Name',
    description: 'The name displayed throughout the site',
    type: 'text',
  },
  business_email: {
    label: 'Business Email',
    description: 'Email address for notifications and contact',
    type: 'email',
  },
  business_phone: {
    label: 'Business Phone',
    description: 'Phone number displayed to clients',
    type: 'tel',
  },
  business_timezone: {
    label: 'Business Timezone',
    description: 'Timezone for all appointment scheduling',
    type: 'text',
  },
  advance_booking_days: {
    label: 'Advance Booking Days',
    description: 'How many days in advance clients can book',
    type: 'number',
  },
  buffer_time_minutes: {
    label: 'Buffer Time (minutes)',
    description: 'Time between appointments for preparation',
    type: 'number',
  },
  venmo_handle: {
    label: 'Venmo Handle',
    description: 'Your Venmo username for payments',
    type: 'text',
  },
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [settings, setSettings] = useState<Setting[]>(initialSettings)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const parseValue = (value: string): string => {
    // Remove surrounding quotes if present (from JSON stored values)
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1)
    }
    return value
  }

  const handleSave = async (key: string, value: string) => {
    setSaving(key)
    setError(null)

    try {
      // For string values, wrap in quotes to match existing format
      const settingConfig = SETTING_LABELS[key]
      const valueToSave = settingConfig?.type === 'number' ? value : `"${value}"`

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: valueToSave }),
      })

      if (!response.ok) {
        throw new Error('Failed to save setting')
      }

      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    } catch (err) {
      setError(`Failed to save ${SETTING_LABELS[key]?.label || key}`)
    } finally {
      setSaving(null)
    }
  }

  const handleChange = (key: string, value: string) => {
    setSettings(settings.map(s =>
      s.key === key ? { ...s, value } : s
    ))
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4 sm:space-y-6">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground border-b border-secondary/30 pb-2">
          Business Information
        </h2>

        {['business_name', 'business_email', 'business_phone', 'venmo_handle'].map(key => {
          const setting = settings.find(s => s.key === key)
          if (!setting) return null
          const config = SETTING_LABELS[key]
          const displayValue = parseValue(setting.value)

          return (
            <div key={key} className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  {config.label}
                </label>
                <p className="text-xs sm:text-sm text-text-muted">{config.description}</p>
              </div>
              <div className="flex gap-2">
                <Input
                  type={config.type}
                  value={displayValue}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSave(key, parseValue(settings.find(s => s.key === key)?.value || ''))}
                  disabled={saving === key}
                  variant={saved === key ? 'secondary' : 'primary'}
                  size="sm"
                  className="flex-shrink-0 px-3 sm:px-4"
                >
                  {saving === key ? '...' : saved === key ? 'Saved' : 'Save'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-4 sm:space-y-6">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground border-b border-secondary/30 pb-2">
          Booking Settings
        </h2>

        {['advance_booking_days', 'buffer_time_minutes', 'business_timezone'].map(key => {
          const setting = settings.find(s => s.key === key)
          if (!setting) return null
          const config = SETTING_LABELS[key]
          const displayValue = parseValue(setting.value)

          return (
            <div key={key} className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  {config.label}
                </label>
                <p className="text-xs sm:text-sm text-text-muted">{config.description}</p>
              </div>
              <div className="flex gap-2">
                <Input
                  type={config.type}
                  value={displayValue}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="flex-1"
                  min={config.type === 'number' ? 0 : undefined}
                />
                <Button
                  onClick={() => handleSave(key, parseValue(settings.find(s => s.key === key)?.value || ''))}
                  disabled={saving === key}
                  variant={saved === key ? 'secondary' : 'primary'}
                  size="sm"
                  className="flex-shrink-0 px-3 sm:px-4"
                >
                  {saving === key ? '...' : saved === key ? 'Saved' : 'Save'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="space-y-4 sm:space-y-6">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground border-b border-secondary/30 pb-2">
          Square Integration
        </h2>

        {['square_enabled', 'online_payment_enabled'].map(key => {
          const setting = settings.find(s => s.key === key)
          if (!setting) return null
          const isEnabled = parseValue(setting.value) === 'true'
          const label = key === 'square_enabled' ? 'Square Sync' : 'Online Payments'
          const description = key === 'square_enabled'
            ? 'Sync services, customers, and appointments with Square'
            : 'Allow clients to pay online during booking via Square'

          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  {label}
                </label>
                <p className="text-xs sm:text-sm text-text-muted">{description}</p>
              </div>
              <button
                onClick={() => {
                  const newValue = isEnabled ? 'false' : 'true'
                  handleChange(key, newValue)
                  handleSave(key, newValue)
                }}
                disabled={saving === key}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  isEnabled ? 'bg-primary' : 'bg-secondary'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
