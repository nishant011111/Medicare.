package com.example

import android.app.Application
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performScrollToNode
import androidx.test.core.app.ApplicationProvider
import com.example.core.network.MediCoreApiService
import com.example.core.network.NetworkClientProvider
import com.example.core.security.SecureTokenStorage
import com.example.data.repository.PatientBillingRepository
import com.example.data.repository.PatientMedicationsRepository
import com.example.core.model.UserProfile
import com.example.data.mock.SampleData
import com.example.data.repository.ApiResult
import com.example.data.repository.AuthenticationRepository
import com.example.feature.auth.AuthViewModel
import com.example.feature.auth.LoginScreen
import com.example.feature.auth.OtpAuthValidator
import com.example.feature.auth.OtpChannel
import com.example.feature.billing.BillingDashboardScreen
import com.example.feature.billing.BillingViewModel
import com.example.feature.dashboard.DashboardViewModel
import com.example.feature.dashboard.views.MyHealthOverviewComponent
import com.example.feature.medications.MedicationDashboardScreen
import com.example.feature.medications.MedicationTrackingViewModel
import com.example.feature.onboarding.PatientDetailsScreen
import com.example.feature.onboarding.PatientDetailsUiState
import com.example.feature.onboarding.PatientDetailsValidator
import com.example.feature.onboarding.PatientDetailsViewModel
import com.example.ui.theme.MediCoreTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class Phase14SecurityAndBillingTest {

    @get:Rule
    val composeRule = createComposeRule()

    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var application: Application

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        application = ApplicationProvider.getApplicationContext()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun buildMockApiService(handler: (method: String, path: String, body: String) -> Pair<Int, String>): MediCoreApiService {
        val interceptor = Interceptor { chain ->
            val req = chain.request()
            val buffer = okio.Buffer()
            req.body?.writeTo(buffer)
            val reqBody = buffer.readUtf8()
            val (code, json) = handler(req.method, req.url.encodedPath, reqBody)
            Response.Builder()
                .request(req)
                .protocol(Protocol.HTTP_1_1)
                .code(code)
                .message(if (code in 200..299) "OK" else "Error")
                .body(json.toResponseBody("application/json".toMediaType()))
                .build()
        }
        val client = OkHttpClient.Builder().addInterceptor(interceptor).build()
        return Retrofit.Builder()
            .baseUrl("https://medicore.test.local/")
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(NetworkClientProvider.moshi))
            .build()
            .create(MediCoreApiService::class.java)
    }

    @Test
    fun `secure token storage encrypts decrypts rejects tampered ciphertext and clears session`() = runBlocking {
        val storage = SecureTokenStorage(application)
        val rawAccess = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.patient-token-payload.sig"
        val rawRefresh = "rt_secret_refresh_value_123456"

        val encryptedAccess = storage.encrypt(rawAccess)
        assertNotEquals(rawAccess, encryptedAccess)
        assertEquals(rawAccess, storage.decrypt(encryptedAccess))

        // Corrupt ciphertext must never silently decrypt or return partial secret
        val tampered = encryptedAccess.dropLast(4) + "AAAA"
        assertNull(storage.decrypt(tampered))

        storage.saveTokens(
            accessToken = rawAccess,
            refreshToken = rawRefresh,
            expiresInSeconds = 900L,
            userId = "usr-pat-1",
            activeHospitalId = "RNC001",
            userEmail = "patient@medicore.test",
            isEmailVerified = true,
            onboardingCompleted = true
        )
        val loaded = storage.loadTokens()
        assertEquals(rawAccess, loaded.accessToken)
        assertEquals("usr-pat-1", loaded.userId)
        assertFalse(loaded.isExpired)

        storage.clearTokens()
        val cleared = storage.getCurrentTokensSync()
        assertNull(cleared.accessToken)
        assertNull(cleared.refreshToken)
        assertNull(cleared.userId)
    }

    @Test
    fun `paise formatting and input parsing avoid floating point drift`() {
        assertEquals("₹525.00", PatientBillingRepository.formatInrFromPaise(52500L))
        assertEquals("₹0.05", PatientBillingRepository.formatInrFromPaise(5L))
        assertEquals("-₹100.50", PatientBillingRepository.formatInrFromPaise(-10050L))

        assertEquals(125075L, PatientBillingRepository.parseRupeesToPaise("1,250.75"))
        assertEquals(50000L, PatientBillingRepository.parseRupeesToPaise("500"))
        assertNull(PatientBillingRepository.parseRupeesToPaise("0"))
        assertNull(PatientBillingRepository.parseRupeesToPaise("-25"))
        assertNull(PatientBillingRepository.parseRupeesToPaise("invalid"))
    }

    @Test
    fun `billing view model enforces server verification rejects forged signature and guards unverified receipts`() {
        var verifiedOnServer = false

        val apiService = buildMockApiService { method, path, body ->
            when {
                method == "GET" && path == "/api/v1/patient/invoices" -> 200 to """
                    {
                      "success": true,
                      "data": [
                        {
                          "id": "inv-1",
                          "invoiceNumber": "INV-RNC-2026-001",
                          "hospitalId": "RNC001",
                          "hospitalName": "Rajendra Institute of Medical Sciences (RIMS)",
                          "status": "${if (verifiedOnServer) "PAID" else "ISSUED"}",
                          "displayStatus": "${if (verifiedOnServer) "PAID" else "PENDING"}",
                          "isOverdue": false,
                          "invoiceDate": "2026-11-17T08:00:00.000Z",
                          "dueDate": "2026-11-24T08:00:00.000Z",
                          "subtotalPaise": 50000,
                          "discountPaise": 0,
                          "taxPaise": 2500,
                          "creditNotePaise": 0,
                          "paidPaise": ${if (verifiedOnServer) 52500 else 0},
                          "insuranceSettledPaise": 0,
                          "totalPaise": 52500,
                          "balanceDuePaise": ${if (verifiedOnServer) 0 else 52500},
                          "itemCount": 1,
                          "createdAt": "2026-11-17T08:00:00.000Z"
                        }
                      ],
                      "summary": {
                        "currency": "INR",
                        "totalOutstandingPaise": ${if (verifiedOnServer) 0 else 52500},
                        "totalPaidPaise": ${if (verifiedOnServer) 52500 else 0},
                        "pendingInvoiceCount": ${if (verifiedOnServer) 0 else 1},
                        "partialInvoiceCount": 0,
                        "paidInvoiceCount": ${if (verifiedOnServer) 1 else 0},
                        "overdueInvoiceCount": 0
                      },
                      "recentTransactions": []
                    }
                """.trimIndent()

                method == "POST" && path == "/api/v1/patient/invoices/inv-1/payment-orders" -> 201 to """
                    {
                      "success": true,
                      "data": {
                        "idempotentReplay": false,
                        "payment": {
                          "id": "pay-1",
                          "hospitalId": "RNC001",
                          "invoiceId": "inv-1",
                          "patientId": "pat-1",
                          "amountPaise": 52500,
                          "currency": "INR",
                          "method": "UPI",
                          "status": "CREATED",
                          "gatewayProvider": "RAZORPAY",
                          "gatewayOrderId": "order_test_001",
                          "receiptAvailable": false
                        },
                        "gatewayOrder": {
                          "provider": "RAZORPAY",
                          "mode": "sandbox",
                          "gatewayOrderId": "order_test_001",
                          "amountPaise": 52500,
                          "currency": "INR",
                          "keyId": null,
                          "checkoutRequired": true
                        }
                      }
                    }
                """.trimIndent()

                method == "POST" && path == "/api/v1/patient/payments/pay-1/verify" -> {
                    if (body.contains("forged_sig")) {
                        400 to """{"success":false,"error":{"code":"SIGNATURE_MISMATCH","message":"Invalid gateway HMAC signature."}}"""
                    } else {
                        verifiedOnServer = true
                        200 to """
                            {
                              "success": true,
                              "data": {
                                "payment": {
                                  "id": "pay-1",
                                  "receiptNumber": "RCPT-2026-0001",
                                  "hospitalId": "RNC001",
                                  "invoiceId": "inv-1",
                                  "patientId": "pat-1",
                                  "amountPaise": 52500,
                                  "currency": "INR",
                                  "method": "UPI",
                                  "status": "SUCCESS",
                                  "gatewayProvider": "RAZORPAY",
                                  "gatewayOrderId": "order_test_001",
                                  "gatewayPaymentId": "pay_gw_001",
                                  "receiptAvailable": true
                                },
                                "alreadyVerified": false
                              }
                            }
                        """.trimIndent()
                    }
                }

                method == "GET" && path == "/api/v1/patient/payments/pay-1/status" -> 200 to """
                    {
                      "success": true,
                      "data": {
                        "id": "pay-1",
                        "receiptNumber": ${if (verifiedOnServer) "\"RCPT-2026-0001\"" else "null"},
                        "hospitalId": "RNC001",
                        "hospitalName": "Rajendra Institute of Medical Sciences (RIMS)",
                        "invoiceId": "inv-1",
                        "invoiceNumber": "INV-RNC-2026-001",
                        "invoiceStatus": "${if (verifiedOnServer) "PAID" else "ISSUED"}",
                        "invoiceBalanceDuePaise": ${if (verifiedOnServer) 0 else 52500},
                        "amountPaise": 52500,
                        "currency": "INR",
                        "method": "UPI",
                        "status": "${if (verifiedOnServer) "SUCCESS" else "CREATED"}",
                        "gatewayOrderId": "order_test_001",
                        "receiptAvailable": $verifiedOnServer
                      }
                    }
                """.trimIndent()

                method == "GET" && path == "/api/v1/patient/payments/pay-1/receipt" -> {
                    if (!verifiedOnServer) {
                        409 to """{"success":false,"error":{"code":"RECEIPT_UNAVAILABLE","message":"Receipt is only issued after payment verification."}}"""
                    } else {
                        200 to """
                            {
                              "success": true,
                              "data": {
                                "receipt": {
                                  "id": "rcpt-1",
                                  "receiptNumber": "RCPT-2026-0001",
                                  "paymentId": "pay-1",
                                  "invoiceId": "inv-1",
                                  "hospitalId": "RNC001",
                                  "patientId": "pat-1",
                                  "amountPaise": 52500,
                                  "currency": "INR",
                                  "issuedAt": "2026-11-17T08:05:00.000Z"
                                },
                                "payment": {
                                  "id": "pay-1",
                                  "receiptNumber": "RCPT-2026-0001",
                                  "hospitalId": "RNC001",
                                  "invoiceId": "inv-1",
                                  "patientId": "pat-1",
                                  "amountPaise": 52500,
                                  "currency": "INR",
                                  "method": "UPI",
                                  "status": "SUCCESS",
                                  "receiptAvailable": true
                                },
                                "hospitalName": "Rajendra Institute of Medical Sciences (RIMS)",
                                "invoiceNumber": "INV-RNC-2026-001",
                                "invoiceItems": []
                              }
                            }
                        """.trimIndent()
                    }
                }

                method == "POST" && path == "/api/v1/patient/payments/pay-1/cancel" -> 200 to """
                    {
                      "success": true,
                      "data": {
                        "id": "pay-1",
                        "hospitalId": "RNC001",
                        "invoiceId": "inv-1",
                        "patientId": "pat-1",
                        "amountPaise": 52500,
                        "currency": "INR",
                        "method": "UPI",
                        "status": "CANCELLED",
                        "receiptAvailable": false
                      }
                    }
                """.trimIndent()

                else -> 404 to """{"success":false,"error":{"code":"NOT_FOUND","message":"Not found"}}"""
            }
        }

        val repo = PatientBillingRepository(context = application, apiService = apiService)
        val vm = BillingViewModel(application, repo)

        runBlocking {
            vm.loadDashboard()
            kotlinx.coroutines.withTimeout(5000) {
                vm.uiState.first { !it.isLoading && it.invoices.isNotEmpty() }
            }
            assertEquals(1, vm.uiState.value.invoices.size)
            assertEquals(52500L, vm.uiState.value.summary.totalOutstandingPaise)

            // Unverified payment must NOT return receipt
            vm.loadReceiptDetail("pay-1")
            kotlinx.coroutines.withTimeout(5000) {
                vm.uiState.first { !it.isLoading && it.errorMessage != null }
            }
            assertNull(vm.uiState.value.receiptDetail)
            assertTrue(vm.uiState.value.errorMessage?.contains("verification", ignoreCase = true) == true)

            // Create payment order
            var createdOrderId: String? = null
            vm.initiatePaymentOrder("inv-1", 52500L, "UPI", "patient@upi") {
                createdOrderId = it.gatewayOrder.gatewayOrderId
            }
            kotlinx.coroutines.withTimeout(5000) {
                vm.uiState.first { !it.isMutating && it.activeOrder != null }
            }
            assertEquals("order_test_001", createdOrderId)
            assertNotNull(vm.uiState.value.activeOrder)

            // Forged signature rejected
            var verifiedCallbackCalled = false
            vm.verifyPaymentWithGateway("pay-1", "order_test_001", "pay_gw_001", "forged_sig") {
                verifiedCallbackCalled = true
            }
            kotlinx.coroutines.withTimeout(5000) {
                vm.uiState.first { !it.isMutating && it.errorMessage != null }
            }
            assertFalse(verifiedCallbackCalled)
            assertTrue(vm.uiState.value.errorMessage?.contains("HMAC", ignoreCase = true) == true)

            // Valid signature verified
            vm.verifyPaymentWithGateway("pay-1", "order_test_001", "pay_gw_001", "valid_hmac_sig") {
                verifiedCallbackCalled = true
            }
            kotlinx.coroutines.withTimeout(5000) {
                vm.uiState.first {
                    !it.isMutating && !it.isLoading &&
                        it.paymentStatus?.status == "SUCCESS" &&
                        it.summary.totalOutstandingPaise == 0L
                }
            }
            assertTrue(verifiedCallbackCalled)
            assertEquals("SUCCESS", vm.uiState.value.paymentStatus?.status)
            assertEquals(0L, vm.uiState.value.summary.totalOutstandingPaise)

            // Receipt now loads cleanly
            vm.loadReceiptDetail("pay-1")
            kotlinx.coroutines.withTimeout(5000) {
                vm.uiState.first { !it.isLoading && it.receiptDetail != null }
            }
            assertEquals("RCPT-2026-0001", vm.uiState.value.receiptDetail?.receipt?.receiptNumber)
        }
    }

    @Test
    fun `billing dashboard screen renders invoices reliably with Robolectric Compose rule`() {
        assertEquals("MediCore", application.getString(R.string.app_name))
        assertEquals("Billing & Payments", application.getString(R.string.billing_title))

        val billingApi = buildMockApiService { method, path, _ ->
            when {
                method == "GET" && path == "/api/v1/patient/invoices" -> 200 to """
                    {
                      "success": true,
                      "data": [
                        {
                          "id": "inv-ui-1",
                          "invoiceNumber": "INV-RIMS-901",
                          "hospitalId": "RNC001",
                          "hospitalName": "RIMS Ranchi",
                          "status": "ISSUED",
                          "displayStatus": "PENDING",
                          "isOverdue": false,
                          "invoiceDate": "2026-11-17T08:00:00.000Z",
                          "totalPaise": 75000,
                          "balanceDuePaise": 75000,
                          "itemCount": 1,
                          "createdAt": "2026-11-17T08:00:00.000Z"
                        }
                      ],
                      "summary": {
                        "currency": "INR",
                        "totalOutstandingPaise": 75000,
                        "totalPaidPaise": 0,
                        "pendingInvoiceCount": 1,
                        "partialInvoiceCount": 0,
                        "paidInvoiceCount": 0,
                        "overdueInvoiceCount": 0
                      },
                      "recentTransactions": []
                    }
                """.trimIndent()
                else -> 404 to """{"success":false,"error":{"code":"NOT_FOUND","message":"Not found"}}"""
            }
        }

        val billingVm = BillingViewModel(application, PatientBillingRepository(application, billingApi))

        composeRule.setContent {
            MediCoreTheme {
                BillingDashboardScreen(
                    onNavigateBack = {},
                    onOpenInvoiceDetail = {},
                    onPayInvoice = {},
                    onOpenPaymentHistory = {},
                    onOpenReceipt = {},
                    viewModel = billingVm
                )
            }
        }
        composeRule.waitUntil(timeoutMillis = 5000) {
            billingVm.uiState.value.invoices.isNotEmpty()
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("billing_dashboard_screen").assertIsDisplayed()
        composeRule.onNodeWithText("Total Outstanding Due").assertIsDisplayed()
        composeRule.onNodeWithTag("billing_invoices_list").performScrollToNode(hasTestTag("invoice_card_INV-RIMS-901"))
        composeRule.onNodeWithTag("invoice_card_INV-RIMS-901").assertIsDisplayed()
        composeRule.onNodeWithText("INV-RIMS-901", substring = true).assertIsDisplayed()
    }

    @Test
    fun `medication dashboard screen mounts cleanly with Robolectric Compose rule`() {
        val medApi = buildMockApiService { method, path, _ ->
            when {
                method == "GET" && path == "/api/v1/patient/medications" -> 200 to """
                    {
                      "success": true,
                      "data": {
                        "medications": [],
                        "activeMedications": [],
                        "completedMedications": [],
                        "discontinuedMedications": [],
                        "todaySchedule": [],
                        "missedReminders": [],
                        "adherenceSummary": {
                          "totalDoses": 0,
                          "takenDoses": 0,
                          "missedDoses": 0,
                          "skippedDoses": 0,
                          "adherencePercent": 100
                        }
                      }
                    }
                """.trimIndent()
                method == "GET" && path == "/api/v1/patient/medication-reminders" -> 200 to """
                    {
                      "success": true,
                      "data": {
                        "reminders": [],
                        "todaySchedule": [],
                        "missedReminders": []
                      }
                    }
                """.trimIndent()
                method == "GET" && path == "/api/v1/patient/medication-doses" -> 200 to """
                    {
                      "success": true,
                      "data": {
                        "logs": [],
                        "adherenceSummary": {
                          "totalDoses": 0,
                          "takenDoses": 0,
                          "missedDoses": 0,
                          "skippedDoses": 0,
                          "adherencePercent": 100
                        }
                      }
                    }
                """.trimIndent()
                else -> 404 to """{"success":false,"error":{"code":"NOT_FOUND","message":"Not found"}}"""
            }
        }

        val medVm = MedicationTrackingViewModel(
            application = application,
            repository = PatientMedicationsRepository(application, medApi),
            disableAlarmSync = true
        )

        composeRule.setContent {
            MediCoreTheme {
                MedicationDashboardScreen(
                    onNavigateBack = {},
                    onOpenMedicationDetail = {},
                    onAddReminderForMedication = {},
                    viewModel = medVm
                )
            }
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("medication_dashboard_screen").assertIsDisplayed()
    }

    @Test
    fun `patient details validator enforces step 1 and step 2 required patient fields and distinct emergency phone`() {
        val emptyState = PatientDetailsUiState()
        val step1Errors = PatientDetailsValidator.validateStep1(emptyState)
        assertTrue(step1Errors.containsKey("fullName"))
        assertTrue(step1Errors.containsKey("dateOfBirth"))
        assertTrue(step1Errors.containsKey("gender"))
        assertTrue(step1Errors.containsKey("email"))
        assertTrue(step1Errors.containsKey("phone"))
        assertTrue(step1Errors.containsKey("streetAddress"))
        assertTrue(step1Errors.containsKey("city"))
        assertTrue(step1Errors.containsKey("state"))
        assertTrue(step1Errors.containsKey("postalCode"))

        val validState = PatientDetailsUiState(
            fullName = "Aarav Kumar",
            dateOfBirth = "1994-06-15",
            gender = "Male",
            email = "aarav.kumar@example.com",
            phone = "+919876543210",
            streetAddress = "Bariatu Road",
            city = "Ranchi",
            state = "Jharkhand",
            postalCode = "834009",
            country = "India",
            emergencyContactName = "Priya Kumar",
            emergencyContactRelationship = "Spouse",
            emergencyContactPhone = "+919876543210"
        )
        assertTrue(PatientDetailsValidator.validateStep1(validState).isEmpty())

        val duplicatePhoneStep2Errors = PatientDetailsValidator.validateStep2(validState)
        assertTrue(duplicatePhoneStep2Errors.containsKey("emergencyContactPhone"))

        val completeState = validState.copy(
            emergencyContactPhone = "+919123456789",
            bloodGroup = "O+",
            healthConsentGranted = true
        )
        assertTrue(PatientDetailsValidator.validateStep2(completeState).isEmpty())
        assertEquals(100, completeState.completionPercent)
    }

    @Test
    fun `post-signup patient details screen mounts cleanly and displays required personal and address inputs`() {
        val patientDetailsVm = PatientDetailsViewModel()
        composeRule.setContent {
            MediCoreTheme {
                PatientDetailsScreen(
                    currentProfile = UserProfile(
                        id = "pat-101",
                        fullName = "Aarav Kumar",
                        email = "aarav.kumar@example.com",
                        phone = "+919876543210",
                        onboardingCompleted = false
                    ),
                    isEditMode = false,
                    onDetailsCompleted = {},
                    viewModel = patientDetailsVm
                )
            }
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("patient_details_screen").assertIsDisplayed()
        composeRule.onNodeWithTag("patient_fullname_input").assertExists()
        composeRule.onNodeWithTag("patient_dob_input").assertExists()
        composeRule.onNodeWithTag("patient_details_next_button").assertIsDisplayed()
    }

    @Test
    fun `my health overview component aggregates key indicators upcoming appointments and prescription alerts`() {
        val overview = DashboardViewModel.buildHealthOverview(
            userProfile = UserProfile(
                id = "pat-101",
                fullName = "Aarav Kumar",
                bloodGroup = "B+",
                knownAllergies = listOf("Penicillin")
            ),
            hospital = SampleData.ranchiDirectoryHospitals.first(),
            vitals = emptyList(),
            appointments = emptyList(),
            encounters = emptyList()
        )

        assertEquals(4, overview.keyIndicators.size)
        assertTrue(overview.upcomingAppointments.isNotEmpty())
        assertTrue(overview.prescriptionAlerts.isNotEmpty())
        assertEquals("B+ • 1 Allergy", overview.keyIndicators.first { it.id == "blood_allergy" }.value)

        composeRule.setContent {
            MediCoreTheme {
                MyHealthOverviewComponent(
                    overview = overview,
                    onActionClick = {}
                )
            }
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("my_health_overview_card").assertIsDisplayed()
        composeRule.onNodeWithTag("health_overview_indicators_section").assertExists()
        composeRule.onNodeWithTag("health_overview_appointments_section").assertExists()
        composeRule.onNodeWithTag("health_overview_prescriptions_section").assertExists()
        composeRule.onNodeWithText("My Health Overview").assertIsDisplayed()
    }

    @Test
    fun `otp auth validator validates phone email and 6 digit otp codes and masks destinations`() {
        assertTrue(OtpAuthValidator.isValidPhone("+91 98765 43210"))
        assertFalse(OtpAuthValidator.isValidPhone("12345"))
        assertTrue(OtpAuthValidator.isValidEmail("aarav.kumar@example.com"))
        assertFalse(OtpAuthValidator.isValidEmail("invalid-email"))
        assertTrue(OtpAuthValidator.isValidOtp("482910"))
        assertFalse(OtpAuthValidator.isValidOtp("48291"))
        assertFalse(OtpAuthValidator.isValidOtp("48291a"))

        assertEquals("+******3210", OtpAuthValidator.maskIdentifier("+919876543210", OtpChannel.PHONE))
        assertEquals("aa***@example.com", OtpAuthValidator.maskIdentifier("aarav@example.com", OtpChannel.EMAIL))
    }

    @Test
    fun `login screen renders strictly otp only phone and email login without password or google sign in`() {
        val authVm = AuthViewModel()
        composeRule.setContent {
            MediCoreTheme {
                LoginScreen(
                    viewModel = authVm,
                    onLoginSuccess = {}
                )
            }
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("login_screen").assertIsDisplayed()
        composeRule.onNodeWithTag("otp_channel_phone").assertIsDisplayed()
        composeRule.onNodeWithTag("otp_channel_email").assertIsDisplayed()
        composeRule.onNodeWithTag("login_phone_input").assertIsDisplayed()
        composeRule.onNodeWithTag("login_send_otp_button").performScrollTo().assertIsDisplayed()

        // Ensure legacy password & Google login options are completely removed
        composeRule.onNodeWithTag("login_password_input").assertDoesNotExist()
        composeRule.onNodeWithTag("google_signin_button").assertDoesNotExist()
        composeRule.onNodeWithTag("login_forgot_password_button").assertDoesNotExist()
        composeRule.onNodeWithTag("login_register_nav_button").assertDoesNotExist()

        // Switch to Email channel and verify email input appears
        authVm.onChannelSelected(OtpChannel.EMAIL)
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("login_email_input").assertIsDisplayed()
    }

    @Test
    fun `authentication repository completes otp request and verification for patient role only`() = runBlocking {
        val otpApi = buildMockApiService { method, path, _ ->
            when {
                method == "POST" && path == "/api/v1/auth/patient/otp/request" -> 200 to """
                    {
                      "success": true,
                      "data": {
                        "otpSent": true,
                        "channel": "PHONE",
                        "maskedDestination": "+******3210",
                        "expiresInSeconds": 600,
                        "cooldownSeconds": 30,
                        "deliveryConfigured": true,
                        "message": "A 6-digit verification code has been issued for +******3210."
                      }
                    }
                """.trimIndent()
                method == "POST" && path == "/api/v1/auth/patient/otp/verify" -> 200 to """
                    {
                      "success": true,
                      "data": {
                        "user": {
                          "id": "pat-otp-1",
                          "fullName": "Aarav Kumar",
                          "email": "aarav@example.com",
                          "phone": "+919876543210",
                          "isEmailVerified": true,
                          "isActive": true,
                          "globalRoles": ["PATIENT"],
                          "activeRoles": ["PATIENT"]
                        },
                        "accessToken": "access-jwt-otp",
                        "refreshToken": "refresh-jwt-otp",
                        "expiresIn": 900,
                        "isNewUser": true
                      }
                    }
                """.trimIndent()
                method == "GET" && path == "/api/v1/patient/profile" -> 200 to """
                    {
                      "success": true,
                      "data": {
                        "user": {
                          "id": "pat-otp-1",
                          "fullName": "Aarav Kumar",
                          "email": "aarav@example.com",
                          "phone": "+919876543210",
                          "isEmailVerified": true
                        },
                        "patient": {
                          "id": "p-1",
                          "globalPatientId": "MC-PAT-001",
                          "onboardingCompleted": false,
                          "healthConsentGranted": false,
                          "profileCompletionPercent": 20
                        }
                      }
                    }
                """.trimIndent()
                else -> 404 to """{"success":false,"error":{"code":"NOT_FOUND","message":"Not found"}}"""
            }
        }

        val repo = AuthenticationRepository(application, apiService = otpApi)
        val reqRes = repo.requestPatientOtp("+919876543210", "PHONE")
        assertTrue(reqRes is ApiResult.Success)
        assertEquals("+******3210", (reqRes as ApiResult.Success).data.maskedDestination)

        val verifyRes = repo.verifyPatientOtp("+919876543210", "591024", "PHONE")
        assertTrue(verifyRes is ApiResult.Success)
        assertEquals("pat-otp-1", (verifyRes as ApiResult.Success).data.user.id)
    }
}
