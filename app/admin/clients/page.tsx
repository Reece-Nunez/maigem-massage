import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import Link from 'next/link'
import type { Client } from '@/types/database'

type ClientWithCount = Client & {
  appointments: { count: number }[]
}

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: clientsData } = await supabase
    .from('clients')
    .select(`*, appointments:appointments(count)`)
    .order('created_at', { ascending: false })

  const clients = (clientsData || []) as ClientWithCount[]

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Clients</h1>
      <p className="text-text-muted mb-8">
        View all clients who have booked appointments.
      </p>

      <Card className="overflow-hidden">
        {clients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/20">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                    Name
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                    Email
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                    Phone
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                    Appointments
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                    Joined
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/30">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {client.first_name?.[0]}
                          {client.last_name?.[0]}
                        </div>
                        <span className="font-medium text-foreground">
                          {client.first_name} {client.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      <a
                        href={`mailto:${client.email}`}
                        className="hover:text-primary transition-colors"
                      >
                        {client.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      <a
                        href={`tel:${client.phone}`}
                        className="hover:text-primary transition-colors"
                      >
                        {client.phone}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        {client.appointments?.[0]?.count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted text-sm">
                      {format(new Date(client.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        View History
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted">
            <p>No clients yet</p>
            <p className="text-sm mt-2">
              Clients will appear here after they book their first appointment.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
