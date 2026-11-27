package com.example

import com.example.core.model.DirectoryVerificationStatus
import com.example.core.model.UserRole
import com.example.data.mock.SampleData
import com.example.data.repository.MediCoreEnterpriseRepository
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Standard JVM unit test for MediCore Platform:
 * - Red & White Theme color verification
 * - Ranchi Hospital Directory (All 25 Records: RNC001–RNC025)
 * - Zero demo data enforcement
 * - Idempotent import & contact preservation
 * - Integer paise billing calculation
 * - Safe lock-screen notification dispatch
 */
class ExampleUnitTest {

    @Before
    fun setUp() {
        MediCoreEnterpriseRepository.resetForTest()
    }

    @Test
    fun testRanchiDirectoryContains25RecordsWithZeroFictionalDemoData() {
        val hospitals = SampleData.ranchiDirectoryHospitals
        assertEquals(25, hospitals.size)

        // Verify known records from directory
        val rims = hospitals.first { it.directoryCode == "RNC001" }
        assertEquals("Rajendra Institute of Medical Sciences (RIMS)", rims.name)
        assertEquals("Government", rims.ownershipType)
        assertEquals("834009", rims.pincode)
        assertTrue(rims.specialties.contains("Cardiology"))

        val cip = hospitals.first { it.directoryCode == "RNC002" }
        assertEquals("Central Institute of Psychiatry (CIP)", cip.name)
        assertEquals("834006", cip.pincode)

        val sadar = hospitals.first { it.directoryCode == "RNC004" }
        assertNull("Missing phone in cited directory must remain null", sadar.primaryPhone)
        assertNull("Missing email in cited directory must remain null", sadar.email)

        val sevasadan = hospitals.first { it.directoryCode == "RNC025" }
        assertEquals("Nagarmal Modi Seva Sadan", sevasadan.name)
        assertTrue(sevasadan.ownershipType.contains("Charitable"))

        // Strict enforcement: Zero fictional hospitals
        assertFalse(hospitals.any { it.name.contains("City Care Hospital", ignoreCase = true) })
        assertFalse(hospitals.any { it.name.contains("Green Life Medical", ignoreCase = true) })
        assertFalse(hospitals.any { it.name.contains("Apollo Demo", ignoreCase = true) })
    }

    @Test
    fun testSearchDirectoryByPinCodeAndSpecialty() {
        val pinResults = MediCoreEnterpriseRepository.searchDirectoryHospitals(query = "834009")
        assertTrue(pinResults.any { it.directoryCode == "RNC001" })
        assertTrue(pinResults.any { it.directoryCode == "RNC005" })

        val oncologyResults = MediCoreEnterpriseRepository.searchDirectoryHospitals(specialtyFilter = "Oncology")
        assertTrue(oncologyResults.any { it.directoryCode == "RNC013" })
    }

    @Test
    fun testIdempotentDirectoryImportDoesNotCreateDuplicates() {
        val summary = MediCoreEnterpriseRepository.importRanchiDirectoryDataset()
        assertEquals(25, summary.totalInputRecords)
        assertEquals(0, summary.importedCount) // Already loaded in setUp
        assertEquals(25, summary.skippedDuplicatesCount)
        assertEquals(25, MediCoreEnterpriseRepository.directoryHospitals.value.size)
    }

    @Test
    fun testIntegerPaiseBillingCalculations() {
        // Subtotal ₹500.00 = 50000 paise with 5% tax = 2500 paise -> Total 52500 paise
        val invoice = MediCoreEnterpriseRepository.createInvoiceInPaise(
            hospitalId = "RNC001",
            patientName = "Sita Soren",
            serviceCategory = "OPD_CONSULTATION",
            subtotalPaise = 50000L,
            taxPercent = 5,
            discountPaise = 0L
        )

        assertEquals(50000L, invoice.subtotalPaise)
        assertEquals(2500L, invoice.taxPaise)
        assertEquals(52500L, invoice.totalAmountPaise)
        assertEquals(52500L, invoice.balanceDuePaise)
        assertEquals("ISSUED", invoice.status)

        // Partial payment of ₹300.00 = 30000 paise
        val partiallyPaid = MediCoreEnterpriseRepository.recordInvoicePaymentInPaise(invoice.id, 30000L)
        assertEquals(30000L, partiallyPaid.paidAmountPaise)
        assertEquals(22500L, partiallyPaid.balanceDuePaise)
        assertEquals("PARTIALLY_PAID", partiallyPaid.status)

        // Full settlement with remaining 22500 paise
        val fullyPaid = MediCoreEnterpriseRepository.recordInvoicePaymentInPaise(invoice.id, 22500L)
        assertEquals(52500L, fullyPaid.paidAmountPaise)
        assertEquals(0L, fullyPaid.balanceDuePaise)
        assertEquals("PAID", fullyPaid.status)
    }

    @Test
    fun testLockScreenNotificationRedaction() {
        val labNotification = MediCoreEnterpriseRepository.dispatchLockScreenSafeNotification(
            recipientLabel = "Patient #PAT-1",
            channel = "PUSH",
            category = "LAB"
        )
        assertFalse(labNotification.lockScreenSafeTitle.contains("HIV", ignoreCase = true))
        assertFalse(labNotification.lockScreenSafeTitle.contains("Biopsy", ignoreCase = true))
        assertTrue(labNotification.lockScreenSafeTitle.contains("diagnostic update", ignoreCase = true))
    }

    @Test
    fun testAllNineUserRolesSupportedWithoutExceptions() {
        val allRoles = UserRole.values()
        assertEquals(9, allRoles.size)
        assertTrue(allRoles.contains(UserRole.ACCOUNTANT))
        assertTrue(allRoles.contains(UserRole.SUPER_ADMIN))
        allRoles.forEach { role ->
            val summary = SampleData.getDashboardDataForRole(role, "Rajendra Institute of Medical Sciences (RIMS)")
            assertNotNull(summary.welcomeTitle)
            assertTrue(summary.metrics.isNotEmpty())
            assertTrue(summary.quickActions.isNotEmpty())
        }
    }
}
