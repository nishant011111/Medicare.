package com.example.feature.dashboard

import androidx.lifecycle.ViewModel
import com.example.core.model.DashboardSummary
import com.example.core.model.DirectoryVerificationStatus
import com.example.core.model.Hospital
import com.example.core.model.UserProfile
import com.example.core.model.UserRole
import com.example.data.mock.SampleData
import com.example.data.repository.MediCoreEnterpriseRepository
import com.example.data.repository.UserRepository
import com.example.data.repository.UserRepositoryImpl
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class DashboardUiState(
    val currentRole: UserRole = UserRole.SUPER_ADMIN,
    val selectedHospital: Hospital = SampleData.ranchiDirectoryHospitals.first(),
    val userProfile: UserProfile = SampleData.defaultUserProfile,
    val dashboardSummary: DashboardSummary = SampleData.getDashboardDataForRole(
        UserRole.SUPER_ADMIN,
        SampleData.ranchiDirectoryHospitals.first().name
    ),
    val isRolePreviewBannerVisible: Boolean = true
)

class DashboardViewModel(
    private val userRepository: UserRepository = UserRepositoryImpl()
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        val currentHospitalId = _uiState.value.selectedHospital.id.ifBlank {
            _uiState.value.userProfile.selectedHospitalId
        }
        val hospitals = MediCoreEnterpriseRepository.directoryHospitals.value
        val hospital = MediCoreEnterpriseRepository.getHospitalByIdOrCode(currentHospitalId)
            ?: hospitals.first()
        val role = _uiState.value.currentRole
        val verifiedCount = hospitals.count { it.verificationStatus == DirectoryVerificationStatus.VERIFIED }
        val summary = SampleData.getDashboardDataForRole(
            role = role,
            hospitalName = hospital.name,
            directoryCount = hospitals.size,
            verifiedCount = verifiedCount,
            scheduledAppointmentsCount = MediCoreEnterpriseRepository.appointments.value.size,
            registeredPatientsCount = MediCoreEnterpriseRepository.patients.value.size,
            invoicesCount = MediCoreEnterpriseRepository.invoices.value.size
        )

        _uiState.value = _uiState.value.copy(
            selectedHospital = hospital,
            dashboardSummary = summary
        )
    }

    fun selectRole(role: UserRole) {
        val hospital = _uiState.value.selectedHospital
        val hospitals = MediCoreEnterpriseRepository.directoryHospitals.value
        val verifiedCount = hospitals.count { it.verificationStatus == DirectoryVerificationStatus.VERIFIED }
        val summary = SampleData.getDashboardDataForRole(
            role = role,
            hospitalName = hospital.name,
            directoryCount = hospitals.size,
            verifiedCount = verifiedCount,
            scheduledAppointmentsCount = MediCoreEnterpriseRepository.appointments.value.size,
            registeredPatientsCount = MediCoreEnterpriseRepository.patients.value.size,
            invoicesCount = MediCoreEnterpriseRepository.invoices.value.size
        )

        _uiState.value = _uiState.value.copy(
            currentRole = role,
            dashboardSummary = summary
        )
        userRepository.updateSelectedRole(role)
    }

    fun setHospital(hospitalId: String) {
        val hospitals = MediCoreEnterpriseRepository.directoryHospitals.value
        val hospital = MediCoreEnterpriseRepository.getHospitalByIdOrCode(hospitalId)
            ?: hospitals.first()
        userRepository.updateSelectedHospital(hospital.id)
        val role = _uiState.value.currentRole
        val verifiedCount = hospitals.count { it.verificationStatus == DirectoryVerificationStatus.VERIFIED }
        val summary = SampleData.getDashboardDataForRole(
            role = role,
            hospitalName = hospital.name,
            directoryCount = hospitals.size,
            verifiedCount = verifiedCount,
            scheduledAppointmentsCount = MediCoreEnterpriseRepository.appointments.value.size,
            registeredPatientsCount = MediCoreEnterpriseRepository.patients.value.size,
            invoicesCount = MediCoreEnterpriseRepository.invoices.value.size
        )

        _uiState.value = _uiState.value.copy(
            selectedHospital = hospital,
            dashboardSummary = summary
        )
    }

    fun dismissRoleBanner() {
        _uiState.value = _uiState.value.copy(isRolePreviewBannerVisible = false)
    }

    fun resetSession() {
        userRepository.clearUserProfile()
        _uiState.value = DashboardUiState()
        loadData()
    }
}
