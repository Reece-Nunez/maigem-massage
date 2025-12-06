-- MaiGem Massage Booking System Schema
-- Run this in Supabase SQL Editor

-- Services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price_cents INTEGER,
  price_display VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly availability
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day_of_week)
);

-- Blocked times (vacations, breaks, etc)
CREATE TABLE blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason VARCHAR(255),
  is_all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  client_notes TEXT,
  admin_notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  confirmation_sent BOOLEAN DEFAULT false,
  cancellation_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users (simple table to identify admins)
CREATE TABLE admin_users (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin settings (key-value store)
CREATE TABLE admin_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_appointments_datetime ON appointments(start_datetime);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_blocked_times_datetime ON blocked_times(start_datetime, end_datetime);

-- Insert default services (MaiGem's actual services)
INSERT INTO services (name, description, duration_minutes, price_cents, price_display, sort_order) VALUES
('Back Massage', '30 minutes of pure back bliss! Unwind with a focused back rub, expert hands kneading away tension. Quick, effective relaxation for your busy day.', 30, NULL, 'Price Varies', 1),
('Full Body', 'A 60-minute massage usually consists of full body unless otherwise specified. Perfect for overall relaxation and stress relief.', 60, 8000, '$80', 2),
('Full Body Extended', 'Indulge in bliss with a 90-minute massage, easing tension and promoting relaxation. Expert hands, soothing oils, and tranquility await you.', 90, 11000, '$110', 3),
('Ultimate Relaxation', 'Experience the epitome of relaxation with a 2-hour massage. Targeting each muscle with detailed bodywork, it soothes tension and restores balance for profound well-being.', 120, 15000, '$150', 4);

-- Insert default admin settings
INSERT INTO admin_settings (key, value) VALUES
('buffer_time_minutes', '15'),
('advance_booking_days', '60'),
('business_timezone', '"America/Chicago"'),
('business_name', '"MaiGem Massage"'),
('business_email', '"maigemmassage@example.com"'),
('business_phone', '"+15803049861"'),
('venmo_handle', '"@lenaecrys"');

-- Insert default availability (Tuesday-Saturday, 9am-5pm)
INSERT INTO availability (day_of_week, start_time, end_time, is_active) VALUES
(0, '09:00', '17:00', false),  -- Sunday - closed
(1, '09:00', '17:00', false),  -- Monday - closed
(2, '09:00', '17:00', true),   -- Tuesday
(3, '09:00', '17:00', true),   -- Wednesday
(4, '09:00', '17:00', true),   -- Thursday
(5, '09:00', '17:00', true),   -- Friday
(6, '09:00', '17:00', true);   -- Saturday

-- Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Services: Everyone can read active services
CREATE POLICY "Anyone can view active services" ON services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage services" ON services
  FOR ALL USING (
    auth.uid() IN (SELECT auth_user_id FROM admin_users)
  );

-- Availability: Everyone can read
CREATE POLICY "Anyone can view availability" ON availability
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage availability" ON availability
  FOR ALL USING (
    auth.uid() IN (SELECT auth_user_id FROM admin_users)
  );

-- Blocked times: Everyone can read (for availability calculation)
CREATE POLICY "Anyone can view blocked times" ON blocked_times
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage blocked times" ON blocked_times
  FOR ALL USING (
    auth.uid() IN (SELECT auth_user_id FROM admin_users)
  );

-- Clients: Admins can see all, clients can see their own
CREATE POLICY "Admins can view all clients" ON clients
  FOR SELECT USING (
    auth.uid() IN (SELECT auth_user_id FROM admin_users)
  );

CREATE POLICY "Clients can view own profile" ON clients
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Anyone can create client" ON clients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update clients" ON clients
  FOR UPDATE USING (
    auth.uid() IN (SELECT auth_user_id FROM admin_users)
  );

CREATE POLICY "Clients can update own profile" ON clients
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Appointments: Admins see all, clients see their own
CREATE POLICY "Admins can view all appointments" ON appointments
  FOR SELECT USING (
    auth.uid() IN (SELECT auth_user_id FROM admin_users)
  );

CREATE POLICY "Clients can view own appointments" ON appointments
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Anyone can create appointment" ON appointments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update appointments" ON appointments
  FOR ALL USING (
    auth.uid() IN (SELECT auth_user_id FROM admin_users)
  );

-- Admin users: Only admins can see
CREATE POLICY "Admins can view admin users" ON admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT auth_user_id FROM admin_users)
  );

-- Admin settings: Everyone can read, admins can write
CREATE POLICY "Anyone can view settings" ON admin_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON admin_settings
  FOR ALL USING (
    auth.uid() IN (SELECT auth_user_id FROM admin_users)
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
