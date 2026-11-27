package com.example.data.repository

import com.example.core.model.UserProfile
import com.example.core.model.UserRole
import com.example.data.mock.SampleData
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

interface UserRepository {
    fun getUserProfile(): Flow<UserProfile>
    fun updateSelectedHospital(hospitalId: String)
    fun updateSelectedRole(role: UserRole)
    fun updateProfileInfo(name: String, email: String, phone: String)
    fun clearUserProfile()
}

class UserRepositoryImpl : UserRepository {
    private val profileState = MutableStateFlow(SampleData.defaultUserProfile)

    override fun getUserProfile(): Flow<UserProfile> = profileState.asStateFlow()

    override fun updateSelectedHospital(hospitalId: String) {
        profileState.value = profileState.value.copy(selectedHospitalId = hospitalId)
    }

    override fun updateSelectedRole(role: UserRole) {
        profileState.value = profileState.value.copy(role = role)
    }

    override fun updateProfileInfo(name: String, email: String, phone: String) {
        profileState.value = profileState.value.copy(
            fullName = name,
            email = email,
            phone = phone
        )
    }

    override fun clearUserProfile() {
        profileState.value = SampleData.defaultUserProfile.copy(
            fullName = "Guest Healthcare Worker",
            email = "",
            phone = "",
            role = UserRole.PATIENT,
            isDemoAccount = true
        )
    }
}
