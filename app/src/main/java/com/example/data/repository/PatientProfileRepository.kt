package com.example.data.repository

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import com.example.core.network.EmergencyContactDto
import com.example.core.network.EmergencyContactMutationResponseDto
import com.example.core.network.MediCoreApiService
import com.example.core.network.NetworkClientProvider
import com.example.core.network.PatientFullProfileDto
import com.example.core.network.UpdateAddressRequestDto
import com.example.core.network.UpdateHealthInfoRequestDto
import com.example.core.network.UpdatePersonalInfoRequestDto
import com.example.core.network.UpsertEmergencyContactRequestDto
import com.example.core.security.SecureTokenStorage
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

class PatientProfileRepository(
    private val context: Context,
    private val apiService: MediCoreApiService = NetworkClientProvider.getApiService(context),
    private val tokenStorage: SecureTokenStorage = SecureTokenStorage.getInstance(context)
) {

    suspend fun getFullProfile(): ApiResult<PatientFullProfileDto> {
        return try {
            val result = ApiResponseParser.parse(apiService.getPatientFullProfile())
            if (result is ApiResult.Success) {
                tokenStorage.updateSessionMeta(
                    isEmailVerified = result.data.user.isEmailVerified,
                    onboardingCompleted = result.data.patient.onboardingCompleted,
                    userEmail = result.data.user.email
                )
            }
            result
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Failed to load patient profile.")
        }
    }

    suspend fun updatePersonalInfo(
        fullName: String,
        dateOfBirth: String?,
        gender: String?,
        phone: String? = null
    ): ApiResult<PatientFullProfileDto> {
        return try {
            ApiResponseParser.parse(
                apiService.updatePersonalInfo(
                    UpdatePersonalInfoRequestDto(
                        fullName = fullName.trim(),
                        dateOfBirth = dateOfBirth?.takeIf { it.isNotBlank() },
                        gender = gender?.takeIf { it.isNotBlank() },
                        phone = phone?.takeIf { it.isNotBlank() }
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Failed to update personal information.")
        }
    }

    suspend fun updateAddress(
        houseNumber: String?,
        street: String,
        locality: String?,
        city: String,
        state: String,
        postalCode: String,
        country: String
    ): ApiResult<PatientFullProfileDto> {
        return try {
            ApiResponseParser.parse(
                apiService.updateAddress(
                    UpdateAddressRequestDto(
                        houseNumber = houseNumber?.takeIf { it.isNotBlank() },
                        street = street.trim(),
                        locality = locality?.takeIf { it.isNotBlank() },
                        city = city.trim(),
                        state = state.trim(),
                        postalCode = postalCode.trim(),
                        country = country.trim().ifBlank { "India" }
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Failed to save address.")
        }
    }

    suspend fun addEmergencyContact(
        name: String,
        phone: String,
        relationship: String,
        isPrimary: Boolean = true
    ): ApiResult<EmergencyContactMutationResponseDto> {
        return try {
            ApiResponseParser.parse(
                apiService.addEmergencyContact(
                    UpsertEmergencyContactRequestDto(
                        name = name.trim(),
                        phone = phone.trim(),
                        relationship = relationship.trim(),
                        isPrimary = isPrimary
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Failed to add emergency contact.")
        }
    }

    suspend fun updateEmergencyContact(
        contactId: String,
        name: String,
        phone: String,
        relationship: String,
        isPrimary: Boolean
    ): ApiResult<EmergencyContactMutationResponseDto> {
        return try {
            ApiResponseParser.parse(
                apiService.updateEmergencyContact(
                    contactId = contactId,
                    request = UpsertEmergencyContactRequestDto(
                        name = name.trim(),
                        phone = phone.trim(),
                        relationship = relationship.trim(),
                        isPrimary = isPrimary
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Failed to update emergency contact.")
        }
    }

    suspend fun deleteEmergencyContact(contactId: String): ApiResult<EmergencyContactMutationResponseDto> {
        return try {
            ApiResponseParser.parse(apiService.deleteEmergencyContact(contactId))
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Failed to remove emergency contact.")
        }
    }

    suspend fun updateHealthInformation(
        consentGranted: Boolean,
        bloodGroup: String?,
        knownAllergies: List<String>,
        existingConditions: List<String>,
        currentMedications: List<String>,
        medicalNotes: String?
    ): ApiResult<PatientFullProfileDto> {
        return try {
            ApiResponseParser.parse(
                apiService.updateHealthInformation(
                    UpdateHealthInfoRequestDto(
                        consentGranted = consentGranted,
                        bloodGroup = bloodGroup?.takeIf { it.isNotBlank() },
                        knownAllergies = knownAllergies.map { it.trim() }.filter { it.isNotEmpty() },
                        existingConditions = existingConditions.map { it.trim() }.filter { it.isNotEmpty() },
                        currentMedications = currentMedications.map { it.trim() }.filter { it.isNotEmpty() },
                        medicalNotes = medicalNotes?.takeIf { it.isNotBlank() }
                    )
                )
            )
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Failed to save optional health information.")
        }
    }

    suspend fun uploadProfilePhoto(uri: Uri, contentResolver: ContentResolver = context.contentResolver): ApiResult<PatientFullProfileDto> {
        return try {
            val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
            if (mimeType !in listOf("image/jpeg", "image/jpg", "image/png", "image/webp")) {
                return ApiResult.Error("UNSUPPORTED_IMAGE_FORMAT", "Please select a JPEG, PNG, or WEBP image.")
            }

            val bytes = contentResolver.openInputStream(uri)?.use { it.readBytes() }
                ?: return ApiResult.Error("FILE_READ_FAILED", "Could not read selected image.")

            if (bytes.size > 5 * 1024 * 1024) {
                return ApiResult.Error("FILE_TOO_LARGE", "Profile photo must be 5 MB or smaller.")
            }

            var displayName = "profile_photo.jpg"
            contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (idx >= 0) {
                        displayName = cursor.getString(idx) ?: displayName
                    }
                }
            }

            val reqBody = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData("photo", displayName, reqBody)
            ApiResponseParser.parse(apiService.uploadProfilePhoto(part))
        } catch (e: Exception) {
            ApiResult.Error("UPLOAD_FAILED", e.localizedMessage ?: "Failed to upload profile photo.")
        }
    }

    suspend fun deleteProfilePhoto(): ApiResult<PatientFullProfileDto> {
        return try {
            ApiResponseParser.parse(apiService.deleteProfilePhoto())
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Failed to remove profile photo.")
        }
    }

    suspend fun completeOnboarding(): ApiResult<PatientFullProfileDto> {
        return try {
            val parsed = ApiResponseParser.parse(apiService.completePatientOnboarding())
            if (parsed is ApiResult.Success) {
                tokenStorage.updateSessionMeta(onboardingCompleted = true)
            }
            parsed
        } catch (e: Exception) {
            ApiResult.Error("NETWORK_ERROR", e.localizedMessage ?: "Failed to complete onboarding.")
        }
    }

    companion object {
        fun isValidPostalCode(country: String, postalCode: String): Boolean {
            val c = country.trim().lowercase()
            val code = postalCode.trim()
            if (code.isEmpty()) return false
            return when (c) {
                "india", "in" -> Regex("^[1-9][0-9]{5}$").matches(code)
                "united states", "usa", "us" -> Regex("^\\d{5}(-\\d{4})?$").matches(code)
                "united kingdom", "uk", "gb" -> Regex("^[A-Za-z]{1,2}\\d[A-Za-z\\d]?\\s?\\d[A-Za-z]{2}$").matches(code)
                "canada", "ca" -> Regex("^[A-Za-z]\\d[A-Za-z][ -]?\\d[A-Za-z]\\d$").matches(code)
                "australia", "au" -> Regex("^\\d{4}$").matches(code)
                else -> Regex("^[A-Za-z0-9\\s-]{3,12}$").matches(code)
            }
        }
    }
}
