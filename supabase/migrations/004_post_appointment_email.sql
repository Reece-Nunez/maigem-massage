-- Track which appointments have already received the post-appointment
-- thank-you / review-request email so the cron job doesn't double-send.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS post_appointment_email_sent BOOLEAN NOT NULL DEFAULT false;

-- Partial index over only the rows the cron actually scans (unsent)
CREATE INDEX IF NOT EXISTS idx_appointments_post_email_pending
  ON appointments(end_datetime, post_appointment_email_sent)
  WHERE post_appointment_email_sent = false;
