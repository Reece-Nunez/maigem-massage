import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('admin_settings')
    .select('*')
    .order('key')

  // Transform settings to ensure value is a string for the form
  const formattedSettings = (settings || []).map(s => ({
    key: s.key,
    value: String(s.value ?? ''),
    updated_at: s.updated_at,
  }))

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
      <p className="text-text-muted mb-8">
        Configure your business information and booking preferences.
      </p>

      <Card className="p-6">
        <SettingsForm initialSettings={formattedSettings} />
      </Card>
    </div>
  )
}
