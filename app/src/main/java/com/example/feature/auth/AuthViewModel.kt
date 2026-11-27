package com.example.feature.auth

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class AuthUiState(
    val emailOrPhone: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val fullName: String = "",
    val phoneNumber: String = "",
    val rememberMe: Boolean = true,
    val termsAccepted: Boolean = false,
    val otpCode: String = "",
    val newPassword: String = "",
    val confirmNewPassword: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class AuthViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun onEmailOrPhoneChanged(value: String) {
        _uiState.value = _uiState.value.copy(emailOrPhone = value, errorMessage = null)
    }

    fun onPasswordChanged(value: String) {
        _uiState.value = _uiState.value.copy(password = value, errorMessage = null)
    }

    fun onConfirmPasswordChanged(value: String) {
        _uiState.value = _uiState.value.copy(confirmPassword = value, errorMessage = null)
    }

    fun onFullNameChanged(value: String) {
        _uiState.value = _uiState.value.copy(fullName = value, errorMessage = null)
    }

    fun onPhoneNumberChanged(value: String) {
        _uiState.value = _uiState.value.copy(phoneNumber = value, errorMessage = null)
    }

    fun onRememberMeToggled(value: Boolean) {
        _uiState.value = _uiState.value.copy(rememberMe = value)
    }

    fun onTermsAcceptedToggled(value: Boolean) {
        _uiState.value = _uiState.value.copy(termsAccepted = value, errorMessage = null)
    }

    fun onOtpCodeChanged(value: String) {
        if (value.length <= 6) {
            _uiState.value = _uiState.value.copy(otpCode = value, errorMessage = null)
        }
    }

    fun onNewPasswordChanged(value: String) {
        _uiState.value = _uiState.value.copy(newPassword = value, errorMessage = null)
    }

    fun onConfirmNewPasswordChanged(value: String) {
        _uiState.value = _uiState.value.copy(confirmNewPassword = value, errorMessage = null)
    }

    fun validateLogin(): Boolean {
        val state = _uiState.value
        return if (state.emailOrPhone.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Please enter an email or phone number")
            false
        } else if (state.password.length < 6) {
            _uiState.value = state.copy(errorMessage = "Password must be at least 6 characters")
            false
        } else {
            _uiState.value = state.copy(errorMessage = null)
            true
        }
    }

    fun validateRegister(): Boolean {
        val state = _uiState.value
        return if (state.fullName.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Please enter your full name")
            false
        } else if (state.emailOrPhone.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Please enter a valid email address")
            false
        } else if (state.phoneNumber.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Please enter a phone number")
            false
        } else if (state.password.length < 6) {
            _uiState.value = state.copy(errorMessage = "Password must be at least 6 characters")
            false
        } else if (state.password != state.confirmPassword) {
            _uiState.value = state.copy(errorMessage = "Passwords do not match")
            false
        } else if (!state.termsAccepted) {
            _uiState.value = state.copy(errorMessage = "You must accept the terms and conditions")
            false
        } else {
            _uiState.value = state.copy(errorMessage = null)
            true
        }
    }

    fun validateForgotPassword(): Boolean {
        val state = _uiState.value
        return if (state.emailOrPhone.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Please enter registered email or phone number")
            false
        } else {
            _uiState.value = state.copy(errorMessage = null, successMessage = "OTP sent to ${state.emailOrPhone}")
            true
        }
    }

    fun validateOtp(): Boolean {
        val state = _uiState.value
        return if (state.otpCode.length != 6) {
            _uiState.value = state.copy(errorMessage = "Please enter a valid 6-digit OTP")
            false
        } else {
            _uiState.value = state.copy(errorMessage = null)
            true
        }
    }

    fun clearCredentials() {
        _uiState.value = AuthUiState()
    }
}
