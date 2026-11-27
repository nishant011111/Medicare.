package com.example.feature.onboarding

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.core.model.UserProfile
import com.example.core.security.SecureTokenStorage
import com.example.data.repository.ApiResult
import com.example.data.repository.MediCoreEnterpriseRepository
import com.example.data.repository.PatientProfileRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

data class PatientDetailsUiState(
    val currentStep: Int = 0, // 0 = Personal, Contact & Address | 1 = Emergency Contact & Optional Health
    val isLoadingProfile: Boolean = false,
    val isSaving: Boolean = false,
    val isEditMode: Boolean = false,
    val globalErrorMessage: String? = null,
    val fieldErrors: Map<String, String> = emptyMap(),

    // Step 1: Personal, Contact & Address (Required)
    val fullName: String = "",
    val dateOfBirth: String = "",
    val gender: String = "",
    val email: String = "",
    val phone: String = "",
    val houseNumber: String = "",
    val streetAddress: String = "",
    val locality: String = "",
    val city: String = "",
    val state: String = "",
    val postalCode: String = "",
    val country: String = "India",

    // Step 2: Emergency Contact (Required) & Health Info (Optional)
    val existingPrimaryContactId: String? = null,
    val emergencyContactName: String = "",
    val emergencyContactPhone: String = "",
    val emergencyContactRelationship: String = "",
    val healthConsentGranted: Boolean = false,
    val bloodGroup: String = "",
    val knownAllergiesText: String = "",
    val existingConditionsText: String = "",
    val currentMedicationsText: String = "",
    val medicalNotes: String = ""
) {
    val completionPercent: Int
        get() {
            var score = 0
            if (fullName.trim().length >= 2) score += 10
            if (PatientDetailsValidator.isValidPastDate(dateOfBirth)) score += 10
            if (gender in ALLOWED_GENDERS) score += 10
            if (PatientDetailsValidator.isValidEmail(email)) score += 10
            if (PatientDetailsValidator.normalizePhoneDigits(phone).length >= 8) score += 10
            val addressComplete = streetAddress.trim().length >= 2 &&
                city.trim().length >= 2 &&
                state.trim().length >= 2 &&
                country.trim().length >= 2 &&
                PatientProfileRepository.isValidPostalCode(country, postalCode)
            if (addressComplete) score += 30
            val emergencyComplete = emergencyContactName.trim().length >= 2 &&
                emergencyContactRelationship.trim().length >= 2 &&
                PatientDetailsValidator.isValidPhoneFormat(emergencyContactPhone) &&
                !PatientDetailsValidator.isSamePhone(phone, emergencyContactPhone)
            if (emergencyComplete) score += 20
            return score.coerceIn(0, 100)
        }

    companion object {
        val ALLOWED_GENDERS = listOf("Male", "Female", "Other", "Prefer not to say")
        val ALLOWED_BLOOD_GROUPS = listOf("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
        val COMMON_RELATIONSHIPS = listOf("Spouse", "Parent", "Sibling", "Child", "Guardian", "Friend")
    }
}

object PatientDetailsValidator {
    private val EMAIL_REGEX = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
    private val DATE_REGEX = Regex("^\\d{4}-\\d{2}-\\d{2}$")
    private val PHONE_REGEX = Regex("^\\+?[0-9\\s()-]{8,20}$")

    fun isValidEmail(email: String): Boolean = EMAIL_REGEX.matches(email.trim())

    fun normalizePhoneDigits(phone: String): String =
        phone.trim().replace(Regex("[\\s()-]"), "")

    fun isValidPhoneFormat(phone: String): Boolean {
        val trimmed = phone.trim()
        val digitsOnly = trimmed.filter { it.isDigit() }
        return PHONE_REGEX.matches(trimmed) && digitsOnly.length in 8..15
    }

    fun isSamePhone(first: String, second: String): Boolean {
        val a = normalizePhoneDigits(first)
        val b = normalizePhoneDigits(second)
        return a.isNotEmpty() && a == b
    }

    fun isValidPastDate(dateString: String): Boolean {
        val trimmed = dateString.trim()
        if (!DATE_REGEX.matches(trimmed)) return false
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { isLenient = false }
            val parsed = sdf.parse(trimmed) ?: return false
            val minCal = Calendar.getInstance().apply { set(1900, Calendar.JANUARY, 1, 0, 0, 0) }
            val today = Calendar.getInstance()
            !parsed.before(minCal.time) && !parsed.after(today.time)
        } catch (_: Exception) {
            false
        }
    }

    fun validateStep1(state: PatientDetailsUiState): Map<String, String> {
        val errors = mutableMapOf<String, String>()
        if (state.fullName.trim().length < 2) {
            errors["fullName"] = "Full name is required (at least 2 characters)."
        }
        if (state.dateOfBirth.isBlank()) {
            errors["dateOfBirth"] = "Date of birth is required."
        } else if (!isValidPastDate(state.dateOfBirth)) {
            errors["dateOfBirth"] = "Enter a valid past date in YYYY-MM-DD format."
        }
        if (state.gender !in PatientDetailsUiState.ALLOWED_GENDERS) {
            errors["gender"] = "Please select your gender."
        }
        if (state.email.isBlank() || !isValidEmail(state.email)) {
            errors["email"] = "A valid email address is required."
        }
        if (!isValidPhoneFormat(state.phone)) {
            errors["phone"] = "A valid mobile number (8–15 digits) is required."
        }
        if (state.streetAddress.trim().length < 2) {
            errors["streetAddress"] = "Street address is required."
        }
        if (state.city.trim().length < 2) {
            errors["city"] = "City is required."
        }
        if (state.state.trim().length < 2) {
            errors["state"] = "State / Province is required."
        }
        if (state.country.trim().length < 2) {
            errors["country"] = "Country is required."
        }
        if (state.postalCode.isBlank()) {
            errors["postalCode"] = "Postal / PIN code is required."
        } else if (!PatientProfileRepository.isValidPostalCode(state.country, state.postalCode)) {
            errors["postalCode"] = if (state.country.trim().equals("India", ignoreCase = true)) {
                "Enter a valid 6-digit Indian PIN code (e.g., 834001)."
            } else {
                "Enter a valid postal code for ${state.country.trim()}."
            }
        }
        return errors
    }

    fun validateStep2(state: PatientDetailsUiState): Map<String, String> {
        val errors = mutableMapOf<String, String>()
        if (state.emergencyContactName.trim().length < 2) {
            errors["emergencyContactName"] = "Emergency contact name is required."
        }
        if (state.emergencyContactRelationship.trim().length < 2) {
            errors["emergencyContactRelationship"] = "Please specify your relationship."
        }
        if (!isValidPhoneFormat(state.emergencyContactPhone)) {
            errors["emergencyContactPhone"] = "A valid emergency contact phone number is required."
        } else if (isSamePhone(state.phone, state.emergencyContactPhone)) {
            errors["emergencyContactPhone"] = "Emergency contact phone must differ from your own mobile number."
        }

        val hasOptionalHealthData = state.bloodGroup.isNotBlank() ||
            state.knownAllergiesText.isNotBlank() ||
            state.existingConditionsText.isNotBlank() ||
            state.currentMedicationsText.isNotBlank() ||
            state.medicalNotes.isNotBlank()

        if (hasOptionalHealthData && !state.healthConsentGranted) {
            errors["healthConsent"] = "Please grant consent to save optional health information, or clear those fields."
        }
        return errors
    }
}

class PatientDetailsViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(PatientDetailsUiState())
    val uiState: StateFlow<PatientDetailsUiState> = _uiState.asStateFlow()

    private var hydratedProfileKey: String? = null

    fun initialize(
        context: Context,
        currentProfile: UserProfile,
        isEditMode: Boolean
    ) {
        val key = "${currentProfile.id}_${currentProfile.email}_$isEditMode"
        if (hydratedProfileKey == key) return
        hydratedProfileKey = key

        val prefilledName = currentProfile.fullName
            .takeIf { it.isNotBlank() && it != "Guest Patient" && it != "Guest Healthcare Worker" }
            ?: ""

        _uiState.value = _uiState.value.copy(
            currentStep = 0,
            isEditMode = isEditMode,
            globalErrorMessage = null,
            fieldErrors = emptyMap(),
            fullName = prefilledName,
            dateOfBirth = currentProfile.dateOfBirth.orEmpty(),
            gender = currentProfile.gender.orEmpty(),
            email = currentProfile.email,
            phone = currentProfile.phone,
            houseNumber = currentProfile.houseNumber.orEmpty(),
            streetAddress = currentProfile.streetAddress.orEmpty(),
            locality = currentProfile.locality.orEmpty(),
            city = currentProfile.city.orEmpty(),
            state = currentProfile.state.orEmpty(),
            postalCode = currentProfile.postalCode.orEmpty(),
            country = currentProfile.country.ifBlank { "India" },
            emergencyContactName = currentProfile.emergencyContactName.orEmpty(),
            emergencyContactPhone = currentProfile.emergencyContactPhone.orEmpty(),
            emergencyContactRelationship = currentProfile.emergencyContactRelationship.orEmpty(),
            healthConsentGranted = currentProfile.healthConsentGranted,
            bloodGroup = currentProfile.bloodGroup.orEmpty(),
            knownAllergiesText = currentProfile.knownAllergies.joinToString(", "),
            existingConditionsText = currentProfile.existingConditions.joinToString(", "),
            currentMedicationsText = currentProfile.currentMedications.joinToString(", "),
            medicalNotes = currentProfile.medicalNotes.orEmpty()
        )

        val tokenStorage = SecureTokenStorage.getInstance(context)
        if (!tokenStorage.getCurrentTokensSync().accessToken.isNullOrBlank()) {
            loadProfileFromBackend(context)
        }
    }

    fun resetHydration() {
        hydratedProfileKey = null
        _uiState.value = PatientDetailsUiState()
    }

    private fun loadProfileFromBackend(context: Context) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingProfile = true)
            val repo = PatientProfileRepository(context)
            when (val res = repo.getFullProfile()) {
                is ApiResult.Success -> {
                    val data = res.data
                    val primaryContact = data.emergencyContacts.firstOrNull { it.isPrimary }
                        ?: data.emergencyContacts.firstOrNull()
                    val curr = _uiState.value
                    _uiState.value = curr.copy(
                        isLoadingProfile = false,
                        fullName = data.user.fullName.ifBlank { curr.fullName },
                        email = data.user.email.ifBlank { curr.email },
                        phone = data.user.phone.orEmpty().ifBlank { curr.phone },
                        dateOfBirth = data.patient.dateOfBirth.orEmpty().ifBlank { curr.dateOfBirth },
                        gender = data.patient.gender.orEmpty().ifBlank { curr.gender },
                        houseNumber = data.address?.houseNumber.orEmpty().ifBlank { curr.houseNumber },
                        streetAddress = data.address?.street.orEmpty().ifBlank { curr.streetAddress },
                        locality = data.address?.locality.orEmpty().ifBlank { curr.locality },
                        city = data.address?.city.orEmpty().ifBlank { curr.city },
                        state = data.address?.state.orEmpty().ifBlank { curr.state },
                        postalCode = data.address?.postalCode.orEmpty().ifBlank { curr.postalCode },
                        country = data.address?.country.orEmpty().ifBlank { curr.country },
                        existingPrimaryContactId = primaryContact?.id,
                        emergencyContactName = primaryContact?.name.orEmpty().ifBlank { curr.emergencyContactName },
                        emergencyContactPhone = primaryContact?.phone.orEmpty().ifBlank { curr.emergencyContactPhone },
                        emergencyContactRelationship = primaryContact?.relationship.orEmpty().ifBlank { curr.emergencyContactRelationship },
                        healthConsentGranted = data.patient.healthConsentGranted || (data.healthInformation?.consentGranted == true),
                        bloodGroup = data.healthInformation?.bloodGroup.orEmpty().ifBlank { curr.bloodGroup },
                        knownAllergiesText = data.healthInformation?.knownAllergies?.joinToString(", ").orEmpty().ifBlank { curr.knownAllergiesText },
                        existingConditionsText = data.healthInformation?.existingConditions?.joinToString(", ").orEmpty().ifBlank { curr.existingConditionsText },
                        currentMedicationsText = data.healthInformation?.currentMedications?.joinToString(", ").orEmpty().ifBlank { curr.currentMedicationsText },
                        medicalNotes = data.healthInformation?.medicalNotes.orEmpty().ifBlank { curr.medicalNotes }
                    )
                }
                is ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(isLoadingProfile = false)
                }
            }
        }
    }

    private fun clearFieldError(field: String) {
        val currentErrors = _uiState.value.fieldErrors
        if (currentErrors.containsKey(field) || _uiState.value.globalErrorMessage != null) {
            _uiState.value = _uiState.value.copy(
                fieldErrors = currentErrors - field,
                globalErrorMessage = null
            )
        }
    }

    fun onFullNameChanged(value: String) {
        _uiState.value = _uiState.value.copy(fullName = value)
        clearFieldError("fullName")
    }

    fun onDateOfBirthChanged(value: String) {
        _uiState.value = _uiState.value.copy(dateOfBirth = value)
        clearFieldError("dateOfBirth")
    }

    fun onGenderSelected(value: String) {
        _uiState.value = _uiState.value.copy(gender = value)
        clearFieldError("gender")
    }

    fun onEmailChanged(value: String) {
        _uiState.value = _uiState.value.copy(email = value)
        clearFieldError("email")
    }

    fun onPhoneChanged(value: String) {
        _uiState.value = _uiState.value.copy(phone = value)
        clearFieldError("phone")
    }

    fun onHouseNumberChanged(value: String) {
        _uiState.value = _uiState.value.copy(houseNumber = value)
    }

    fun onStreetAddressChanged(value: String) {
        _uiState.value = _uiState.value.copy(streetAddress = value)
        clearFieldError("streetAddress")
    }

    fun onLocalityChanged(value: String) {
        _uiState.value = _uiState.value.copy(locality = value)
    }

    fun onCityChanged(value: String) {
        _uiState.value = _uiState.value.copy(city = value)
        clearFieldError("city")
    }

    fun onStateChanged(value: String) {
        _uiState.value = _uiState.value.copy(state = value)
        clearFieldError("state")
    }

    fun onPostalCodeChanged(value: String) {
        _uiState.value = _uiState.value.copy(postalCode = value)
        clearFieldError("postalCode")
    }

    fun onCountryChanged(value: String) {
        _uiState.value = _uiState.value.copy(country = value)
        clearFieldError("country")
        clearFieldError("postalCode")
    }

    fun onEmergencyContactNameChanged(value: String) {
        _uiState.value = _uiState.value.copy(emergencyContactName = value)
        clearFieldError("emergencyContactName")
    }

    fun onEmergencyContactPhoneChanged(value: String) {
        _uiState.value = _uiState.value.copy(emergencyContactPhone = value)
        clearFieldError("emergencyContactPhone")
    }

    fun onEmergencyContactRelationshipChanged(value: String) {
        _uiState.value = _uiState.value.copy(emergencyContactRelationship = value)
        clearFieldError("emergencyContactRelationship")
    }

    fun onHealthConsentToggled(granted: Boolean) {
        _uiState.value = _uiState.value.copy(healthConsentGranted = granted)
        clearFieldError("healthConsent")
    }

    fun onBloodGroupSelected(value: String) {
        val next = if (_uiState.value.bloodGroup == value) "" else value
        _uiState.value = _uiState.value.copy(bloodGroup = next)
        clearFieldError("healthConsent")
    }

    fun onKnownAllergiesChanged(value: String) {
        _uiState.value = _uiState.value.copy(knownAllergiesText = value)
        clearFieldError("healthConsent")
    }

    fun onExistingConditionsChanged(value: String) {
        _uiState.value = _uiState.value.copy(existingConditionsText = value)
        clearFieldError("healthConsent")
    }

    fun onCurrentMedicationsChanged(value: String) {
        _uiState.value = _uiState.value.copy(currentMedicationsText = value)
        clearFieldError("healthConsent")
    }

    fun onMedicalNotesChanged(value: String) {
        _uiState.value = _uiState.value.copy(medicalNotes = value)
        clearFieldError("healthConsent")
    }

    fun goToStep(step: Int) {
        if (step == 0) {
            _uiState.value = _uiState.value.copy(currentStep = 0, globalErrorMessage = null)
            return
        }
        val step1Errors = PatientDetailsValidator.validateStep1(_uiState.value)
        if (step1Errors.isNotEmpty()) {
            _uiState.value = _uiState.value.copy(
                fieldErrors = step1Errors,
                globalErrorMessage = "Please complete all required personal, contact, and address details before continuing."
            )
            return
        }
        _uiState.value = _uiState.value.copy(
            currentStep = 1,
            fieldErrors = emptyMap(),
            globalErrorMessage = null
        )
    }

    fun previousStep() {
        if (_uiState.value.currentStep > 0) {
            _uiState.value = _uiState.value.copy(
                currentStep = 0,
                globalErrorMessage = null
            )
        }
    }

    fun submitPatientDetails(
        context: Context,
        currentProfile: UserProfile,
        onSavedSuccess: (UserProfile) -> Unit
    ) {
        val state = _uiState.value
        if (state.isSaving) return

        val step1Errors = PatientDetailsValidator.validateStep1(state)
        if (step1Errors.isNotEmpty()) {
            _uiState.value = state.copy(
                currentStep = 0,
                fieldErrors = step1Errors,
                globalErrorMessage = "Please complete all required personal, contact, and address fields."
            )
            return
        }

        val step2Errors = PatientDetailsValidator.validateStep2(state)
        if (step2Errors.isNotEmpty()) {
            _uiState.value = state.copy(
                currentStep = 1,
                fieldErrors = step2Errors,
                globalErrorMessage = "Please complete your required emergency contact details."
            )
            return
        }

        val allergies = parseCommaList(state.knownAllergiesText)
        val conditions = parseCommaList(state.existingConditionsText)
        val medications = parseCommaList(state.currentMedicationsText)

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, globalErrorMessage = null, fieldErrors = emptyMap())

            val tokenStorage = SecureTokenStorage.getInstance(context)
            val hasBackendSession = !tokenStorage.getCurrentTokensSync().accessToken.isNullOrBlank()

            if (hasBackendSession) {
                val repo = PatientProfileRepository(context)
                val personalRes = repo.updatePersonalInfo(
                    fullName = state.fullName,
                    dateOfBirth = state.dateOfBirth.trim(),
                    gender = state.gender,
                    phone = if (currentProfile.phone.isBlank()) state.phone else null
                )
                if (personalRes is ApiResult.Error && personalRes.code != "NETWORK_ERROR") {
                    _uiState.value = _uiState.value.copy(isSaving = false, globalErrorMessage = personalRes.message)
                    return@launch
                }

                val addrRes = repo.updateAddress(
                    houseNumber = state.houseNumber.takeIf { it.isNotBlank() },
                    street = state.streetAddress,
                    locality = state.locality.takeIf { it.isNotBlank() },
                    city = state.city,
                    state = state.state,
                    postalCode = state.postalCode,
                    country = state.country
                )
                if (addrRes is ApiResult.Error && addrRes.code != "NETWORK_ERROR") {
                    _uiState.value = _uiState.value.copy(isSaving = false, globalErrorMessage = addrRes.message)
                    return@launch
                }

                val contactRes = if (!state.existingPrimaryContactId.isNullOrBlank()) {
                    repo.updateEmergencyContact(
                        contactId = state.existingPrimaryContactId,
                        name = state.emergencyContactName,
                        phone = state.emergencyContactPhone,
                        relationship = state.emergencyContactRelationship,
                        isPrimary = true
                    )
                } else {
                    repo.addEmergencyContact(
                        name = state.emergencyContactName,
                        phone = state.emergencyContactPhone,
                        relationship = state.emergencyContactRelationship,
                        isPrimary = true
                    )
                }
                if (contactRes is ApiResult.Error && contactRes.code != "NETWORK_ERROR") {
                    _uiState.value = _uiState.value.copy(isSaving = false, globalErrorMessage = contactRes.message)
                    return@launch
                }

                if (state.healthConsentGranted) {
                    val healthRes = repo.updateHealthInformation(
                        consentGranted = true,
                        bloodGroup = state.bloodGroup.takeIf { it.isNotBlank() },
                        knownAllergies = allergies,
                        existingConditions = conditions,
                        currentMedications = medications,
                        medicalNotes = state.medicalNotes.takeIf { it.isNotBlank() }
                    )
                    if (healthRes is ApiResult.Error && healthRes.code != "NETWORK_ERROR") {
                        _uiState.value = _uiState.value.copy(isSaving = false, globalErrorMessage = healthRes.message)
                        return@launch
                    }
                }

                val completeRes = repo.completeOnboarding()
                if (completeRes is ApiResult.Error && completeRes.code != "NETWORK_ERROR") {
                    _uiState.value = _uiState.value.copy(isSaving = false, globalErrorMessage = completeRes.message)
                    return@launch
                }
            }

            try {
                kotlinx.coroutines.withTimeoutOrNull(1000L) {
                    tokenStorage.updateSessionMeta(
                        onboardingCompleted = true,
                        userEmail = state.email.trim()
                    )
                }
            } catch (_: Exception) {
            }

            val formattedAddress = listOfNotNull(
                state.houseNumber.trim().takeIf { it.isNotEmpty() },
                state.streetAddress.trim().takeIf { it.isNotEmpty() },
                state.locality.trim().takeIf { it.isNotEmpty() },
                state.city.trim().takeIf { it.isNotEmpty() },
                state.state.trim().takeIf { it.isNotEmpty() },
                state.postalCode.trim().takeIf { it.isNotEmpty() }
            ).joinToString(", ")

            MediCoreEnterpriseRepository.registerPatient(
                hospitalId = currentProfile.selectedHospitalId,
                fullName = state.fullName.trim(),
                dateOfBirth = state.dateOfBirth.trim(),
                gender = state.gender,
                bloodGroup = state.bloodGroup.ifBlank { "Not specified" },
                phone = state.phone.trim(),
                emergencyContact = "${state.emergencyContactName.trim()} (${state.emergencyContactRelationship.trim()}) • ${state.emergencyContactPhone.trim()}",
                address = formattedAddress,
                allergies = allergies
            )

            val updatedProfile = currentProfile.copy(
                fullName = state.fullName.trim(),
                email = state.email.trim(),
                phone = state.phone.trim(),
                dateOfBirth = state.dateOfBirth.trim(),
                gender = state.gender,
                houseNumber = state.houseNumber.trim().takeIf { it.isNotEmpty() },
                streetAddress = state.streetAddress.trim(),
                locality = state.locality.trim().takeIf { it.isNotEmpty() },
                city = state.city.trim(),
                state = state.state.trim(),
                postalCode = state.postalCode.trim(),
                country = state.country.trim().ifBlank { "India" },
                emergencyContactName = state.emergencyContactName.trim(),
                emergencyContactPhone = state.emergencyContactPhone.trim(),
                emergencyContactRelationship = state.emergencyContactRelationship.trim(),
                bloodGroup = state.bloodGroup.takeIf { it.isNotBlank() },
                knownAllergies = allergies,
                existingConditions = conditions,
                currentMedications = medications,
                medicalNotes = state.medicalNotes.trim().takeIf { it.isNotEmpty() },
                healthConsentGranted = state.healthConsentGranted,
                onboardingCompleted = true,
                profileCompletionPercent = 100
            )

            _uiState.value = _uiState.value.copy(isSaving = false)
            onSavedSuccess(updatedProfile)
        }
    }

    private fun parseCommaList(raw: String): List<String> =
        raw.split(",").map { it.trim() }.filter { it.isNotEmpty() }
}
