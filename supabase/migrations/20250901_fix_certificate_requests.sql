-- Verificar e criar tabela certificate_requests se não existir
CREATE TABLE IF NOT EXISTS certificate_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  total_lessons INTEGER DEFAULT 0,
  completed_lessons INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  request_date TIMESTAMPTZ DEFAULT NOW(),
  approved_date TIMESTAMPTZ,
  rejected_date TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id)
);

-- Adicionar índices
CREATE INDEX IF NOT EXISTS idx_certificate_requests_user_id ON certificate_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_certificate_requests_course_id ON certificate_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_certificate_requests_status ON certificate_requests(status);
CREATE INDEX IF NOT EXISTS idx_certificate_requests_enrollment_id ON certificate_requests(enrollment_id);

-- Habilitar RLS
ALTER TABLE certificate_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Users can view their own certificate requests" ON certificate_requests;
CREATE POLICY "Users can view their own certificate requests" ON certificate_requests
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own certificate requests" ON certificate_requests;
CREATE POLICY "Users can create their own certificate requests" ON certificate_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all certificate requests" ON certificate_requests;
CREATE POLICY "Admins can view all certificate requests" ON certificate_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "Admins can update certificate requests" ON certificate_requests;
CREATE POLICY "Admins can update certificate requests" ON certificate_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'teacher')
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_certificate_requests_updated_at ON certificate_requests;
CREATE TRIGGER update_certificate_requests_updated_at
  BEFORE UPDATE ON certificate_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();