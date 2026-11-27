package com.example

import com.example.core.model.DirectoryVerificationStatus
import com.example.data.mock.SampleData
import com.example.data.repository.MediCoreEnterpriseRepository
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class MediCorePlatformTest {

    @Before
    fun setUp() {
        MediCoreEnterpriseRepository.resetForTest()
    }

    @Test
    fun testRanchiDirectoryContains25RecordsAndZeroFictionalHospitals() {
        val directory = MediCoreEnterpriseRepository.directoryHospitals.value
        assertEquals("Must contain exactly 25 Ranchi directory records", 25, directory.size)
        assertEquals("First record must be RNC001", "RNC001", directory.first().directoryCode)
        assertEquals("Last record must be RNC025", "RNC025", directory.last().directoryCode)

        // Verify zero fictional hospitals exist
        val hasFictionalCityCare = directory.any { it.name.contains("City Care Hospital", ignoreCase = true) }
        val hasGreenLife = directory.any { it.name.contains("Green Life Medical Centre", ignoreCase = true) }
        val hasApolloDemo = directory.any { it.name.contains("Apollo Demo Hospital", ignoreCase = true) }

        assertFalse("Fictional 'City Care Hospital' must be removed", hasFictionalCityCare)
        assertFalse("Fictional 'Green Life' must be removed", hasGreenLife)
        assertFalse("Fictional 'Apollo Demo' must be removed", hasApolloDemo)
    }

    @Test
    fun testMissingContactFieldsPreservedAsNull() {
        val sadarHospital = MediCoreEnterpriseRepository.getHospitalByIdOrCode("RNC004")
        assertNotNull("Sadar Hospital RNC004 must exist", sadarHospital)
        assertNull("Missing phone must remain null and not invented", sadarHospital?.primaryPhone)
        assertNull("Missing email must remain null and not invented", sadarHospital?.email)

        val devkamal = MediCoreEnterpriseRepository.getHospitalByIdOrCode("RNC012")
        assertNotNull("Devkamal RNC012 must exist", devkamal)
        assertNull("Missing phone must remain null", devkamal?.primaryPhone)
        assertNull("Missing email must remain null", devkamal?.email)

        val cancerHospital = MediCoreEnterpriseRepository.getHospitalByIdOrCode("RNC013")
        assertNotNull("Ranchi Cancer Hospital RNC013 must exist", cancerHospital)
        assertEquals("Specialty facility without 24x7 ER must have false", false, cancerHospital?.emergencyAvailable)
    }

    @Test
    fun testDirectorySearchByPinAndSpecialty() {
        val bariatuHospitals = MediCoreEnterpriseRepository.searchDirectoryHospitals(query = "834009")
        assertTrue("PIN 834009 must return hospitals in Bariatu", bariatuHospitals.isNotEmpty())

        val psychHospitals = MediCoreEnterpriseRepository.searchDirectoryHospitals(specialtyFilter = "Psychiatry")
        assertTrue("Psychiatry search must include CIP or RINPAS", psychHospitals.any { it.directoryCode == "RNC002" || it.directoryCode == "RNC003" })
    }

    @Test
    fun testSuperAdminVerificationWorkflow() {
        val rnc4 = MediCoreEnterpriseRepository.getHospitalByIdOrCode("RNC004")
        assertNotNull(rnc4)
        assertEquals(DirectoryVerificationStatus.PENDING_VERIFICATION, rnc4?.verificationStatus)

        // Super Admin verifies contact info
        val verified = MediCoreEnterpriseRepository.verifyHospitalDirectoryRecord(
            hospitalId = "RNC004",
            primaryPhone = "+91-651-2200000",
            email = "sadar.ranchi@jharkhand.gov.in"
        )
        assertNotNull(verified)
        assertEquals(DirectoryVerificationStatus.VERIFIED, verified?.verificationStatus)
        assertEquals("+91-651-2200000", verified?.primaryPhone)

        // Re-importing dataset must NOT overwrite admin-verified data
        val summary = MediCoreEnterpriseRepository.importRanchiDirectoryDataset()
        assertTrue(summary.skippedDuplicatesCount >= 1)
        val afterReimport = MediCoreEnterpriseRepository.getHospitalByIdOrCode("RNC004")
        assertEquals(DirectoryVerificationStatus.VERIFIED, afterReimport?.verificationStatus)
        assertEquals("+91-651-2200000", afterReimport?.primaryPhone)
    }

    @Test
    fun testHospitalClaimToSaasOnboardingWorkflow() {
        val app = MediCoreEnterpriseRepository.claimHospitalForOnboarding(
            directoryCode = "RNC006",
            hospitalName = "Orchid Medical Centre",
            city = "Ranchi",
            adminEmail = "director@orchidmedcentre.com",
            registrationLicenseNumber = "LIC-RNC-006",
            gstNumber = "20AAACM0000A1Z5",
            selectedPlanCode = "ENTERPRISE"
        )
        assertEquals("UNDER_REVIEW", app.status)

        // Super Admin approves and activates tenant
        val activated = MediCoreEnterpriseRepository.approveAndActivateOnboarding(app.id)
        assertNotNull(activated)
        assertEquals("ACTIVATED", activated?.status)

        val hosp = MediCoreEnterpriseRepository.getHospitalByIdOrCode("RNC006")
        assertTrue("Claimed hospital must become active tenant", hosp?.isActiveTenant == true)
        assertEquals(DirectoryVerificationStatus.VERIFIED, hosp?.verificationStatus)
        assertTrue(MediCoreEnterpriseRepository.isFeatureEntitled("AI_ASSISTANT"))
    }

    @Test
    fun testClinicalVitalsBmiAndIntegerBilling() {
        val vitals = MediCoreEnterpriseRepository.recordVitalsWithBmi(
            patientId = "PAT-1",
            patientName = "Test Patient",
            systolicBp = 120,
            diastolicBp = 80,
            heartRateBpm = 72,
            temperatureCelsius = 37.0,
            oxygenSaturation = 98,
            heightCm = 175.0,
            weightKg = 70.0
        )
        assertEquals(22.9, vitals.bmi, 0.1)

        val invoice = MediCoreEnterpriseRepository.createInvoiceInPaise(
            hospitalId = "RNC001",
            patientName = "Test Patient",
            serviceCategory = "Consultation",
            subtotalPaise = 50000L, // ₹500.00
            taxPercent = 5
        )
        assertEquals(52500L, invoice.totalAmountPaise) // ₹525.00
        val paidInvoice = MediCoreEnterpriseRepository.recordInvoicePaymentInPaise(invoice.id, 52500L)
        assertEquals("PAID", paidInvoice.status)
        assertEquals(0L, paidInvoice.balanceDuePaise)
    }
}
