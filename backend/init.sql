-- ==============================================================================
-- UrbanSalon Core Database Schema Initialization Migration
-- Extensions: uuid-ossp (ID Generation), pgvector (AI Embedding Queries)
-- ==============================================================================

-- 1. CLEANUP & EXTENSION INITIALIZATION
-- Drop existing tables during local resets to prevent dependency lock conflicts
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS salon_services CASCADE;
DROP TABLE IF EXISTS salons CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;

-- Enable core required system extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgvector;

-- 2. CUSTOM DATA TYPES ENUMS
CREATE TYPE user_role AS ENUM ('customer', 'salon_owner', 'staff', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- 3. SCHEMA ARCHITECTURE DEFINITION

-- Users Table (Supports passwordless OAuth and flexible unstructured JSON preferences)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255), -- Nullable column to accommodate passwordless Google OAuth paths
    role user_role DEFAULT 'customer',
    style_profile JSONB DEFAULT '{}'::jsonb, -- Custom properties: faceShape, hairType, skinTone
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Salons Table
CREATE TABLE salons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    operating_hours_open TIME NOT NULL,
    operating_hours_close TIME NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Salon Services Table (Equipped with pgvector vector arrays for AI matching models)
CREATE TABLE salon_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    duration_minutes INT NOT NULL,
    embedding vector(1536) -- Matches standard 1536-dimensional model structures (e.g., OpenAI/Claude embeddings spaces)
);

-- Bookings Table (Relational anchor for transactional operations)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
    appointment_start TIMESTAMP WITH TIME ZONE NOT NULL,
    appointment_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    status booking_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PERFORMANCE TUNING & STRUCTURAL INDEXING
-- GIN Index on style_profile for lightning-fast sub-property JSON queries
CREATE INDEX idx_users_style_profile ON users USING gin (style_profile);

-- Compound B-Tree Index to optimize scheduler lookups and protect against slot booking overlap race conditions
CREATE INDEX idx_bookings_schedule ON bookings (salon_id, appointment_start, appointment_end) WHERE status IN ('confirmed', 'pending');

-- ==============================================================================
-- 5. SEED DATA GENERATION (Crucial for immediate Hackathon Demonstration)
-- ==============================================================================

-- Seed a dummy user profile with a pre-configured style layout to test the AI recommender instantly
INSERT INTO users (id, name, email, role, style_profile) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Shreya Dwivedi', 'shreya@example.com', 'customer', 
 '{"faceShape": "Oval", "hairType": "Curly", "skinTone": "Warm", "preferredStyles": ["Classic", "Minimalist"]}'::jsonb),
('b1234567-9c0b-4ef8-bb6d-6bb9bd380a22', 'Salon Admin Owner', 'owner@urbansalon.app', 'salon_owner', '{}'::jsonb);

-- Seed a premium local marketplace salon target container
INSERT INTO salons (id, owner_id, name, address, operating_hours_open, operating_hours_close, rating) VALUES
('c7890123-9c0b-4ef8-bb6d-6bb9bd380a33', 'b1234567-9c0b-4ef8-bb6d-6bb9bd380a22', 'Glow & Co. Luxury Salon', '123 Mall Road, Kanpur, UP', '10:00:00', '20:00:00', 4.85);

-- Seed service options complete with randomized multi-dimensional fallback matrix vectors
INSERT INTO salon_services (id, salon_id, name, description, price, duration_minutes, embedding) VALUES
(uuid_generate_v4(), 'c7890123-9c0b-4ef8-bb6d-6bb9bd380a33', 'Hydrating Keratin Moisture Treatment', 'Intense moisture therapy explicitly formulated to redefine dry frizz and texture loops into silky curls.', 2499.00, 60, (SELECT array_agg(random() - 0.5)::vector FROM generate_series(1, 1536))),
(uuid_generate_v4(), 'c7890123-9c0b-4ef8-bb6d-6bb9bd380a33', 'Premium Face Frame Balayage Highlight', 'Precision tone contour shifts mapping facial geometry lines.', 4500.00, 90, (SELECT array_agg(random() - 0.5)::vector FROM generate_series(1, 1536))),
(uuid_generate_v4(), 'c7890123-9c0b-4ef8-bb6d-6bb9bd380a33', 'Classic Volumizing Blowout and Styling', 'Standard high-volume finish cut suited for sleek event styling looks.', 1200.00, 45, (SELECT array_agg(random() - 0.5)::vector FROM generate_series(1, 1536)));

-- Seed an active booking reservation to showcase the scheduler filtering logic during your pitch
INSERT INTO bookings (id, customer_id, salon_id, appointment_start, appointment_end, total_price, status) VALUES
(uuid_generate_v4(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c7890123-9c0b-4ef8-bb6d-6bb9bd380a33', 
 CURRENT_DATE + TIME '14:00:00', CURRENT_DATE + TIME '15:00:00', 2499.00, 'confirmed');