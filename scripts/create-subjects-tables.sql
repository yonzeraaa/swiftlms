-- Criar tabela de matérias
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de relacionamento entre cursos e matérias (many-to-many)
CREATE TABLE IF NOT EXISTS course_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester INTEGER,
    credits INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, subject_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_course_subjects_course_id ON course_subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_course_subjects_subject_id ON course_subjects(subject_id);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir algumas matérias de exemplo
INSERT INTO subjects (name, description, code) VALUES
    ('Matemática Básica', 'Fundamentos de matemática incluindo álgebra e geometria', 'MAT101'),
    ('Português', 'Gramática, literatura e redação', 'POR101'),
    ('Inglês', 'Língua inglesa - conversação, gramática e vocabulário', 'ING101'),
    ('História', 'História geral e do Brasil', 'HIS101'),
    ('Geografia', 'Geografia física e humana', 'GEO101'),
    ('Física', 'Conceitos fundamentais de física', 'FIS101'),
    ('Química', 'Química geral e orgânica', 'QUI101'),
    ('Biologia', 'Biologia celular, ecologia e genética', 'BIO101'),
    ('Programação I', 'Introdução à lógica de programação', 'PRG101'),
    ('Banco de Dados', 'Fundamentos de bancos de dados relacionais', 'BD101'),
    ('Desenvolvimento Web', 'HTML, CSS e JavaScript', 'WEB101'),
    ('Algoritmos', 'Estruturas de dados e algoritmos', 'ALG101')
ON CONFLICT (code) DO NOTHING;

-- Criar view para facilitar consultas de cursos com suas matérias
CREATE OR REPLACE VIEW course_subjects_view AS
SELECT 
    cs.id,
    cs.course_id,
    c.title as course_title,
    cs.subject_id,
    s.name as subject_name,
    s.code as subject_code,
    s.description as subject_description,
    cs.semester,
    cs.credits,
    cs.is_required,
    cs.created_at
FROM course_subjects cs
JOIN courses c ON cs.course_id = c.id
JOIN subjects s ON cs.subject_id = s.id
ORDER BY c.title, cs.semester, s.name;

-- Adicionar RLS (Row Level Security) para as novas tabelas
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_subjects ENABLE ROW LEVEL SECURITY;

-- Política para subjects: todos podem ver, apenas admin pode modificar
CREATE POLICY "Subjects are viewable by everyone" ON subjects
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert subjects" ON subjects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Only admins can update subjects" ON subjects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Only admins can delete subjects" ON subjects
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Política para course_subjects: todos podem ver, apenas admin pode modificar
CREATE POLICY "Course subjects are viewable by everyone" ON course_subjects
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage course subjects" ON course_subjects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );