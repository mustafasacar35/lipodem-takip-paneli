-- ==========================================
-- SUPABASE: SADECE EKSİK SÜTUNLARI EKLE
-- ==========================================
-- Eğer messages tablosu zaten varsa sadece eksik sütunları ekler
-- Hata vermeden güvenle çalıştırabilirsiniz

-- 1. MESSAGES TABLOSU - Eksik Sütunları Ekle
DO $$ 
BEGIN
    -- sender_admin sütunu (hangi admin gönderdi)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'sender_admin'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_admin VARCHAR(100) DEFAULT NULL;
        CREATE INDEX IF NOT EXISTS idx_messages_sender_admin ON messages(sender_admin);
        RAISE NOTICE '✅ sender_admin sütunu eklendi';
    ELSE
        RAISE NOTICE '⏭️ sender_admin zaten mevcut';
    END IF;

    -- deleted_for_admin sütunu (benden sil)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'deleted_for_admin'
    ) THEN
        ALTER TABLE messages ADD COLUMN deleted_for_admin BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_messages_deleted_admin ON messages(deleted_for_admin);
        RAISE NOTICE '✅ deleted_for_admin sütunu eklendi';
    ELSE
        RAISE NOTICE '⏭️ deleted_for_admin zaten mevcut';
    END IF;

    -- deleted_for_patient sütunu (hasta için sil)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'deleted_for_patient'
    ) THEN
        ALTER TABLE messages ADD COLUMN deleted_for_patient BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_messages_deleted_patient ON messages(deleted_for_patient);
        RAISE NOTICE '✅ deleted_for_patient sütunu eklendi';
    ELSE
        RAISE NOTICE '⏭️ deleted_for_patient zaten mevcut';
    END IF;
END $$;

-- 2. PATIENTS TABLOSU - Oluştur veya Güncelle
CREATE TABLE IF NOT EXISTS patients (
    id BIGSERIAL PRIMARY KEY,
    patient_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients Index'leri
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_last_seen ON patients(last_seen);

-- 3. RLS POLİTİKALARI

-- Messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON messages;
CREATE POLICY "Allow all operations" 
ON messages FOR ALL 
USING (true)
WITH CHECK (true);

-- Patients RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for all" ON patients;
CREATE POLICY "Allow read for all" 
ON patients FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow update for all" ON patients;
CREATE POLICY "Allow update for all" 
ON patients FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Allow insert for all" ON patients;
CREATE POLICY "Allow insert for all" 
ON patients FOR INSERT 
WITH CHECK (true);

-- ==========================================
-- TAMAMLANDI! ✅
-- ==========================================
-- Bu SQL dosyası:
-- ✅ Hata vermeden çalışır
-- ✅ Mevcut tabloları bozmaz
-- ✅ Sadece eksik sütunları ekler
-- ✅ Index'leri ve RLS'i günceller
-- ==========================================
