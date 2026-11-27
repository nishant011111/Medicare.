package com.example.feature.hospital

import androidx.lifecycle.ViewModel
import com.example.core.model.Hospital
import com.example.data.repository.MediCoreEnterpriseRepository
import com.example.data.repository.UserRepository
import com.example.data.repository.UserRepositoryImpl
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class HospitalUiState(
    val searchQuery: String = "",
    val selectedCategory: String = "All",
    val selectedOwnership: String = "All",
    val selectedVerification: String = "All",
    val selectedHospitalId: String = "RNC001",
    val hospitals: List<Hospital> = emptyList(),
    val filteredHospitals: List<Hospital> = emptyList()
)

class HospitalViewModel(
    private val userRepository: UserRepository = UserRepositoryImpl()
) : ViewModel() {

    private val _uiState = MutableStateFlow(HospitalUiState())
    val uiState: StateFlow<HospitalUiState> = _uiState.asStateFlow()

    init {
        refreshDirectory()
    }

    fun refreshDirectory() {
        val list = MediCoreEnterpriseRepository.directoryHospitals.value
        _uiState.value = _uiState.value.copy(
            hospitals = list,
            filteredHospitals = MediCoreEnterpriseRepository.searchDirectoryHospitals(
                query = _uiState.value.searchQuery,
                ownershipFilter = _uiState.value.selectedOwnership,
                specialtyFilter = _uiState.value.selectedCategory,
                verificationFilter = _uiState.value.selectedVerification
            )
        )
    }

    fun onSearchQueryChanged(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        applyFilters()
    }

    fun onCategorySelected(category: String) {
        _uiState.value = _uiState.value.copy(selectedCategory = category)
        applyFilters()
    }

    fun onOwnershipSelected(ownership: String) {
        _uiState.value = _uiState.value.copy(selectedOwnership = ownership)
        applyFilters()
    }

    fun onVerificationSelected(verification: String) {
        _uiState.value = _uiState.value.copy(selectedVerification = verification)
        applyFilters()
    }

    fun selectHospital(hospitalId: String) {
        _uiState.value = _uiState.value.copy(selectedHospitalId = hospitalId)
        userRepository.updateSelectedHospital(hospitalId)
    }

    private fun applyFilters() {
        val result = MediCoreEnterpriseRepository.searchDirectoryHospitals(
            query = _uiState.value.searchQuery,
            ownershipFilter = _uiState.value.selectedOwnership,
            specialtyFilter = _uiState.value.selectedCategory,
            verificationFilter = _uiState.value.selectedVerification
        )
        _uiState.value = _uiState.value.copy(
            hospitals = MediCoreEnterpriseRepository.directoryHospitals.value,
            filteredHospitals = result
        )
    }
}
