-- MediCore Phase 3 PostgreSQL Migration: Patient, Doctor, Department & Appointment Management
-- Includes tenant isolation, foreign keys, unique constraints, and partial unique index preventing double-booking

CREATE TYPE "DoctorVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "AppointmentStatus" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
);
CREATE TYPE "AppointmentType" AS ENUM ('OPD', 'WALK_IN', 'FOLLOW_UP');

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fcm_token" TEXT;
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

-- 1. patients
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "global_patient_id" TEXT NOT NULL,
    "date_of_birth" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "blood_group" TEXT NOT NULL,
    "emergency_contact_name" TEXT NOT NULL,
    "emergency_contact_phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");
CREATE UNIQUE INDEX "patients_global_patient_id_key" ON "patients"("global_patient_id");
CREATE INDEX "patients_global_patient_id_idx" ON "patients"("global_patient_id");

-- 2. patient_hospital_links
CREATE TABLE "patient_hospital_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "hospital_registration_number" TEXT NOT NULL,
    "registered_by_user_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patient_hospital_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "patient_hospital_links_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patient_hospital_links_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "patient_hospital_links_patient_id_hospital_id_key" ON "patient_hospital_links"("patient_id", "hospital_id");
CREATE UNIQUE INDEX "patient_hospital_links_hospital_id_hospital_registration_nu_key" ON "patient_hospital_links"("hospital_id", "hospital_registration_number");
CREATE INDEX "patient_hospital_links_hospital_id_idx" ON "patient_hospital_links"("hospital_id");

-- 3. departments
CREATE TABLE "departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "floor_location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "departments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "departments_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "departments_hospital_id_name_key" ON "departments"("hospital_id", "name");
CREATE INDEX "departments_hospital_id_is_active_idx" ON "departments"("hospital_id", "is_active");

-- 4. doctors
CREATE TABLE "doctors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "medical_license_number" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "experience_years" INTEGER NOT NULL DEFAULT 5,
    "bio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors"("user_id");
CREATE UNIQUE INDEX "doctors_medical_license_number_key" ON "doctors"("medical_license_number");
CREATE INDEX "doctors_specialization_idx" ON "doctors"("specialization");

-- 5. doctor_hospital_assignments
CREATE TABLE "doctor_hospital_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "consultation_fee" INTEGER NOT NULL DEFAULT 500,
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "verification_status" "DoctorVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verified_by_user_id" UUID,
    "verified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "doctor_hospital_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "doctor_hospital_assignments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "doctor_hospital_assignments_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "doctor_hospital_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "doctor_hospital_assignments_doctor_id_hospital_id_key" ON "doctor_hospital_assignments"("doctor_id", "hospital_id");
CREATE INDEX "doctor_hospital_assignments_hospital_id_department_id_verif_idx" ON "doctor_hospital_assignments"("hospital_id", "department_id", "verification_status");

-- 6. doctor_availability
CREATE TABLE "doctor_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "doctor_availability_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "doctor_availability_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "doctor_availability_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "doctor_availability_doctor_id_hospital_id_day_of_week_key" ON "doctor_availability"("doctor_id", "hospital_id", "day_of_week");
CREATE INDEX "doctor_availability_hospital_id_doctor_id_idx" ON "doctor_availability"("hospital_id", "doctor_id");

-- 7. doctor_blocked_times
CREATE TABLE "doctor_blocked_times" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "blocked_date" TEXT NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "is_full_day_leave" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "doctor_blocked_times_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "doctor_blocked_times_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "doctor_blocked_times_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "doctor_blocked_times_doctor_id_hospital_id_blocked_date_idx" ON "doctor_blocked_times"("doctor_id", "hospital_id", "blocked_date");

-- 8. appointments
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_number" TEXT NOT NULL,
    "hospital_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "appointment_date" TEXT NOT NULL,
    "slot_start_time" TEXT NOT NULL,
    "slot_end_time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "type" "AppointmentType" NOT NULL DEFAULT 'OPD',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "reason_for_visit" TEXT NOT NULL,
    "cancellation_reason" TEXT,
    "clinical_notes" TEXT,
    "booked_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appointments_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "appointments_appointment_number_key" ON "appointments"("appointment_number");

-- Partial unique index preventing double-booking of active appointments for the same doctor, hospital, date, and slot!
CREATE UNIQUE INDEX "appointments_no_double_booking_active_slot_idx"
  ON "appointments"("hospital_id", "doctor_id", "appointment_date", "slot_start_time")
  WHERE "status" NOT IN ('CANCELLED');

CREATE INDEX "appointments_hospital_id_appointment_date_status_idx" ON "appointments"("hospital_id", "appointment_date", "status");
CREATE INDEX "appointments_doctor_id_appointment_date_slot_start_time_idx" ON "appointments"("doctor_id", "appointment_date", "slot_start_time");
CREATE INDEX "appointments_patient_id_appointment_date_idx" ON "appointments"("patient_id", "appointment_date");

-- 9. appointment_status_history
CREATE TABLE "appointment_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "from_status" "AppointmentStatus",
    "to_status" "AppointmentStatus" NOT NULL,
    "changed_by_user_id" UUID NOT NULL,
    "changed_by_role" TEXT NOT NULL,
    "notes" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointment_status_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appointment_status_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "appointment_status_history_appointment_id_changed_at_idx" ON "appointment_status_history"("appointment_id", "changed_at");

-- Row-Level Security (RLS) for Phase 3 Hospital-Scoped Tables
ALTER TABLE "patient_hospital_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "doctor_hospital_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_patient_links" ON "patient_hospital_links"
  USING (
    current_setting('app.is_super_admin', true) = 'true'
    OR "hospital_id"::text = current_setting('app.current_hospital_id', true)
  );

CREATE POLICY "tenant_isolation_appointments" ON "appointments"
  USING (
    current_setting('app.is_super_admin', true) = 'true'
    OR "hospital_id"::text = current_setting('app.current_hospital_id', true)
  );
