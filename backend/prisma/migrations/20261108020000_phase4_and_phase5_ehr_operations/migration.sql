-- MediCore Phase 4 (EHR & Clinical) and Phase 5 (Laboratory, Pharmacy, Inventory, OPD & IPD) Migration
-- Includes all 38 clinical and hospital operations tables, foreign keys, unique constraints, and active bed allocation index

-- Phase 4 Tables
CREATE TABLE IF NOT EXISTS "patient_allergies" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "allergen" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "recorded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "patient_conditions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "condition_name" TEXT NOT NULL,
    "icd10_code" TEXT,
    "clinical_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "onset_date" TEXT,
    "recorded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "patient_medical_history" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "recorded_date" TEXT NOT NULL,
    "recorded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "encounters" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "doctor_id" UUID NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
    "appointment_id" UUID REFERENCES "appointments"("id") ON DELETE SET NULL,
    "encounter_type" TEXT NOT NULL DEFAULT 'OPD',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "encounter_notes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL REFERENCES "encounters"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "author_user_id" UUID NOT NULL,
    "symptoms" TEXT NOT NULL,
    "examination_findings" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "nursing_observations" TEXT,
    "is_amendment" BOOLEAN NOT NULL DEFAULT false,
    "amendment_reason" TEXT,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "diagnoses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL REFERENCES "encounters"("id") ON DELETE CASCADE,
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "doctor_id" UUID NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
    "icd10_code" TEXT NOT NULL,
    "diagnosis_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "classification" TEXT NOT NULL DEFAULT 'PRIMARY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "patient_vitals" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "encounter_id" UUID REFERENCES "encounters"("id") ON DELETE SET NULL,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "heart_rate_bpm" INTEGER,
    "temperature_celsius" DOUBLE PRECISION,
    "respiratory_rate" INTEGER,
    "oxygen_saturation" INTEGER,
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "measurement_source" TEXT NOT NULL DEFAULT 'Clinical Monitor',
    "recorded_by_user_id" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "treatment_plans" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL REFERENCES "encounters"("id") ON DELETE CASCADE,
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "responsible_clinician_id" UUID NOT NULL,
    "clinical_goals" TEXT NOT NULL,
    "treatment_instructions" TEXT NOT NULL,
    "follow_up_instructions" TEXT NOT NULL,
    "progress_notes" TEXT,
    "review_date" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "prescriptions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "prescription_number" TEXT UNIQUE NOT NULL,
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "doctor_id" UUID NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "encounter_id" UUID NOT NULL REFERENCES "encounters"("id") ON DELETE CASCADE,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "digital_signature" TEXT,
    "signed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "prescription_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "prescription_id" UUID NOT NULL REFERENCES "prescriptions"("id") ON DELETE CASCADE,
    "medicine_name" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "route" TEXT NOT NULL DEFAULT 'Oral',
    "frequency" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "instructions" TEXT NOT NULL,
    "refills_allowed" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "clinical_documents" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "encounter_id" UUID REFERENCES "encounters"("id") ON DELETE SET NULL,
    "title" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT UNIQUE NOT NULL,
    "uploaded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "follow_up_recommendations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL REFERENCES "encounters"("id") ON DELETE CASCADE,
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "doctor_id" UUID NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
    "recommended_date" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "clinical_record_versions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "encounter_id" UUID NOT NULL REFERENCES "encounters"("id") ON DELETE CASCADE,
    "record_type" TEXT NOT NULL,
    "record_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "author_user_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "clinical_audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Phase 5 Tables: Laboratory, Pharmacy, Inventory & IPD
CREATE TABLE IF NOT EXISTS "lab_test_catalogue" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sample_type" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "reference_interval" TEXT NOT NULL,
    "price_inr" INTEGER NOT NULL,
    "turnaround_hours" INTEGER NOT NULL DEFAULT 6,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("hospital_id", "code")
);

CREATE TABLE IF NOT EXISTS "lab_orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_number" TEXT UNIQUE NOT NULL,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "doctor_id" UUID,
    "encounter_id" UUID,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "clinical_notes" TEXT,
    "requested_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "lab_order_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "lab_order_id" UUID NOT NULL REFERENCES "lab_orders"("id") ON DELETE CASCADE,
    "test_id" UUID NOT NULL,
    "test_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price_inr" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED'
);

CREATE TABLE IF NOT EXISTS "lab_samples" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "lab_order_id" UUID NOT NULL REFERENCES "lab_orders"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL,
    "sample_tracking_id" TEXT UNIQUE NOT NULL,
    "sample_type" TEXT NOT NULL,
    "collected_by_id" UUID NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COLLECTED'
);

CREATE TABLE IF NOT EXISTS "lab_results" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "lab_order_item_id" UUID UNIQUE NOT NULL REFERENCES "lab_order_items"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL,
    "observed_value" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "reference_interval" TEXT NOT NULL,
    "remarks" TEXT,
    "entered_by_user_id" UUID NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_by_user_id" UUID,
    "verified_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "lab_reports" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "lab_order_id" UUID NOT NULL REFERENCES "lab_orders"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "report_number" TEXT UNIQUE NOT NULL,
    "verified_by_user_id" UUID NOT NULL,
    "summary_notes" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "medicines" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "generic_name" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "dosage_form" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "reorder_level" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "medicine_batches" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "medicine_id" UUID NOT NULL REFERENCES "medicines"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL,
    "batch_number" TEXT NOT NULL,
    "manufacturing_date" TEXT NOT NULL,
    "expiry_date" TEXT NOT NULL,
    "purchase_price_inr" DOUBLE PRECISION NOT NULL,
    "selling_price_inr" DOUBLE PRECISION NOT NULL,
    "current_stock" INTEGER NOT NULL,
    "location_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("hospital_id", "medicine_id", "batch_number")
);

CREATE TABLE IF NOT EXISTS "suppliers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "po_number" TEXT UNIQUE NOT NULL,
    "hospital_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "total_amount_inr" DOUBLE PRECISION NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "purchase_order_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "purchase_order_id" UUID NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
    "item_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity_ordered" INTEGER NOT NULL,
    "unit_price_inr" DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS "dispensing_records" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "medicine_batch_id" UUID NOT NULL,
    "medicine_name" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "quantity_dispensed" INTEGER NOT NULL,
    "dispensed_by_id" UUID NOT NULL,
    "dispensed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "medicine_returns" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "dispensing_id" UUID NOT NULL,
    "medicine_batch_id" UUID NOT NULL,
    "quantity_returned" INTEGER NOT NULL,
    "refund_amount_inr" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "processed_by_id" UUID NOT NULL,
    "returned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "inventory_locations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "item_category" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "batch_number" TEXT,
    "movement_type" TEXT NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reference_id" TEXT,
    "reason" TEXT NOT NULL,
    "performed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "stock_adjustments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "item_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "approved_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "inventory_alerts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "batch_number" TEXT,
    "message" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "wards" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "ward_type" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "total_beds" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("hospital_id", "name")
);

CREATE TABLE IF NOT EXISTS "rooms" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "ward_id" UUID NOT NULL REFERENCES "wards"("id") ON DELETE CASCADE,
    "room_number" TEXT NOT NULL,
    "room_type" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "beds" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "ward_id" UUID NOT NULL REFERENCES "wards"("id") ON DELETE CASCADE,
    "room_id" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
    "bed_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "daily_rate_inr" INTEGER NOT NULL DEFAULT 1500,
    "current_admission_id" UUID UNIQUE,
    UNIQUE ("hospital_id", "bed_number")
);

CREATE TABLE IF NOT EXISTS "admissions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "admission_number" TEXT UNIQUE NOT NULL,
    "hospital_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "admitting_doctor_id" UUID NOT NULL,
    "assigned_nurse_id" UUID,
    "ward_id" UUID NOT NULL,
    "bed_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ADMITTED',
    "admission_reason" TEXT NOT NULL,
    "admitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discharged_at" TIMESTAMP(3)
);

-- Prevent simultaneous allocation of the same bed to multiple active admissions
CREATE UNIQUE INDEX IF NOT EXISTS "admissions_active_bed_unique_idx"
  ON "admissions"("hospital_id", "bed_id")
  WHERE "status" IN ('APPROVED', 'ADMITTED', 'DISCHARGE_APPROVED');

CREATE TABLE IF NOT EXISTS "bed_allocations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "admission_id" UUID NOT NULL,
    "bed_id" UUID NOT NULL,
    "allocated_by_id" UUID NOT NULL,
    "allocated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "patient_transfers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "admission_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "from_ward_id" UUID NOT NULL,
    "from_bed_id" UUID NOT NULL,
    "to_ward_id" UUID NOT NULL,
    "to_bed_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "transferred_by" UUID NOT NULL,
    "transferred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "discharges" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "admission_id" UUID UNIQUE NOT NULL,
    "patient_id" UUID NOT NULL,
    "approved_by_doctor_id" UUID NOT NULL,
    "discharge_condition" TEXT NOT NULL,
    "discharge_summary" TEXT NOT NULL,
    "follow_up_plan" TEXT NOT NULL,
    "discharged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
