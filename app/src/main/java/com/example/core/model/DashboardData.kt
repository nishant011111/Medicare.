package com.example.core.model

data class MetricCardData(
    val title: String,
    val value: String,
    val changeText: String,
    val isPositive: Boolean,
    val iconName: String
)

data class QuickActionData(
    val id: String,
    val label: String,
    val iconName: String,
    val badge: String? = null
)

data class RecentActivityData(
    val id: String,
    val title: String,
    val subtitle: String,
    val timeAgo: String,
    val statusTag: String,
    val statusColorHex: Long
)

data class DashboardSummary(
    val role: UserRole,
    val welcomeTitle: String,
    val subtitle: String,
    val metrics: List<MetricCardData>,
    val quickActions: List<QuickActionData>,
    val recentActivities: List<RecentActivityData>
)
