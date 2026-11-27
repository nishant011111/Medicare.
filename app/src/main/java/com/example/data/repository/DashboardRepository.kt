package com.example.data.repository

import com.example.core.model.DashboardSummary
import com.example.core.model.UserRole
import com.example.data.mock.SampleData

interface DashboardRepository {
    fun getDashboardData(role: UserRole, hospitalName: String): DashboardSummary
}

class DashboardRepositoryImpl : DashboardRepository {
    override fun getDashboardData(role: UserRole, hospitalName: String): DashboardSummary {
        return SampleData.getDashboardDataForRole(role, hospitalName)
    }
}
