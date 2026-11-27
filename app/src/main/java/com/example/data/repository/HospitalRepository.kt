package com.example.data.repository

import com.example.core.model.Hospital
import com.example.data.mock.SampleData
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

interface HospitalRepository {
    fun getHospitals(): Flow<List<Hospital>>
    fun getHospitalById(id: String): Hospital?
}

class HospitalRepositoryImpl : HospitalRepository {
    private val hospitalsState = MutableStateFlow(SampleData.sampleHospitals)

    override fun getHospitals(): Flow<List<Hospital>> = hospitalsState.asStateFlow()

    override fun getHospitalById(id: String): Hospital? {
        return hospitalsState.value.find { it.id == id } ?: hospitalsState.value.firstOrNull()
    }
}
