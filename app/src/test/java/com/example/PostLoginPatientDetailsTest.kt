package com.example

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import com.example.core.model.UserProfile
import com.example.feature.onboarding.PatientDetailsScreen
import com.example.feature.onboarding.PatientDetailsUiState
import com.example.feature.onboarding.PatientDetailsValidator
import com.example.feature.onboarding.PatientDetailsViewModel
import com.example.ui.theme.MediCoreTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class PostLoginPatientDetailsTest {

    @get:Rule
    val composeRule = createComposeRule()

    private val testDispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `validator rejects missing required fields and enforces distinct emergency phone`() {
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

        val validStep1 = emptyState.copy(
            fullName = "Asha Kumari",
            dateOfBirth = "1994-05-12",
            gender = "Female",
            email = "asha@example.com",
            phone = "+91 9876543210",
            streetAddress = "42 Main Road",
            city = "Ranchi",
            state = "Jharkhand",
            postalCode = "834001",
            country = "India"
        )
        assertTrue(PatientDetailsValidator.validateStep1(validStep1).isEmpty())

        val samePhoneEmergency = validStep1.copy(
            emergencyContactName = "Rohan Kumar",
            emergencyContactRelationship = "Spouse",
            emergencyContactPhone = "+919876543210"
        )
        val step2Errors = PatientDetailsValidator.validateStep2(samePhoneEmergency)
        assertTrue(step2Errors.containsKey("emergencyContactPhone"))

        val completeState = samePhoneEmergency.copy(
            emergencyContactPhone = "+91 9123456789"
        )
        assertTrue(PatientDetailsValidator.validateStep2(completeState).isEmpty())
        assertEquals(100, completeState.completionPercent)
    }

    @Test
    fun `patient details screen requires mandatory details before advancing and completes onboarding`() {
        var savedProfile: UserProfile? = null
        val viewModel = PatientDetailsViewModel()
        val initialProfile = UserProfile(
            id = "usr-test-1",
            fullName = "",
            email = "asha@example.com",
            phone = "",
            onboardingCompleted = false
        )

        composeRule.setContent {
            MediCoreTheme {
                PatientDetailsScreen(
                    currentProfile = initialProfile,
                    isEditMode = false,
                    onDetailsCompleted = { savedProfile = it },
                    viewModel = viewModel
                )
            }
        }

        // Attempting to proceed with missing required fields shows validation banner & stays on Step 1
        composeRule.onNodeWithTag("patient_details_next_button").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("patient_details_error_banner").assertIsDisplayed()
        assertFalse(viewModel.uiState.value.currentStep == 1)

        // Fill Step 1 required fields
        composeRule.onNodeWithTag("patient_fullname_input").performScrollTo().performTextInput("Asha Kumari")
        composeRule.onNodeWithTag("patient_dob_input").performScrollTo().performTextInput("1994-05-12")
        composeRule.onNodeWithTag("gender_chip_female").performScrollTo().performClick()
        composeRule.onNodeWithTag("patient_phone_input").performScrollTo().performTextInput("+919876543210")
        composeRule.onNodeWithTag("patient_street_input").performScrollTo().performTextInput("42 Bariatu Road")
        composeRule.onNodeWithTag("patient_city_input").performScrollTo().performTextInput("Ranchi")
        composeRule.onNodeWithTag("patient_state_input").performScrollTo().performTextInput("Jharkhand")
        composeRule.onNodeWithTag("patient_postal_code_input").performScrollTo().performTextInput("834009")

        composeRule.onNodeWithTag("patient_details_next_button").performClick()
        composeRule.waitForIdle()
        assertEquals(1, viewModel.uiState.value.currentStep)

        // Fill Step 2 required emergency contact fields
        composeRule.onNodeWithTag("emergency_name_input").performScrollTo().performTextInput("Rohan Kumar")
        composeRule.onNodeWithTag("relationship_chip_spouse").performScrollTo().performClick()
        composeRule.onNodeWithTag("emergency_phone_input").performScrollTo().performTextInput("+919123456789")

        composeRule.onNodeWithTag("patient_details_save_button").performClick()
        composeRule.waitUntil(timeoutMillis = 5_000L) { savedProfile != null }

        assertNull(viewModel.uiState.value.globalErrorMessage)
        assertEquals("Asha Kumari", savedProfile?.fullName)
        assertEquals("1994-05-12", savedProfile?.dateOfBirth)
        assertEquals("Female", savedProfile?.gender)
        assertEquals("Ranchi", savedProfile?.city)
        assertEquals("834009", savedProfile?.postalCode)
        assertEquals("Rohan Kumar", savedProfile?.emergencyContactName)
        assertTrue(savedProfile?.onboardingCompleted == true)
        assertEquals(100, savedProfile?.profileCompletionPercent)
    }
}
