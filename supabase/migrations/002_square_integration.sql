-- Add Square reference columns to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS square_customer_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_clients_square_customer_id ON clients(square_customer_id);

-- Add Square reference columns and payment fields to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS square_booking_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS square_payment_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'pay_at_appointment'
    CHECK (payment_method IN ('pay_at_appointment', 'pay_online')),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed'));

CREATE INDEX IF NOT EXISTS idx_appointments_square_booking_id ON appointments(square_booking_id);

-- Add Square settings to admin_settings
INSERT INTO admin_settings (key, value) VALUES
  ('square_enabled', 'true'),
  ('online_payment_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
