package com.example.feature.dashboard.views

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Bed
import androidx.compose.material.icons.filled.Biotech
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.Domain
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.MonitorHeart
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.SupervisorAccount
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.designsystem.components.MediCoreCard
import com.example.core.model.DashboardSummary
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCoreSecondary
import com.example.ui.theme.MediCoreSuccess
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

@Composable
fun GenericRoleDashboardView(
    summary: DashboardSummary,
    headerIcon: ImageVector,
    headerColor: Color
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero Header Card
        Surface(
            color = headerColor,
            shape = RoundedCornerShape(18.dp),
            shadowElevation = 3.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(18.dp)
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(50.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.2f))
                ) {
                    Icon(
                        imageVector = headerIcon,
                        contentDescription = summary.role.title,
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column {
                    Text(
                        text = "${summary.role.title} Control Center",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = summary.subtitle,
                        fontSize = 12.sp,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }
            }
        }

        // Section Title
        Text(
            text = "${summary.role.title} Key Metrics",
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold,
            color = MediCoreTextDark
        )

        // Metrics Grid (2x2)
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricItem(summary.metrics.getOrNull(0)?.title ?: "Metric 1", summary.metrics.getOrNull(0)?.value ?: "0", headerIcon, headerColor, modifier = Modifier.weight(1f))
                MetricItem(summary.metrics.getOrNull(1)?.title ?: "Metric 2", summary.metrics.getOrNull(1)?.value ?: "0", Icons.Default.ReceiptLong, MediCoreSecondary, modifier = Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricItem(summary.metrics.getOrNull(2)?.title ?: "Metric 3", summary.metrics.getOrNull(2)?.value ?: "0", Icons.Default.People, MediCorePrimary, modifier = Modifier.weight(1f))
                MetricItem(summary.metrics.getOrNull(3)?.title ?: "Metric 4", summary.metrics.getOrNull(3)?.value ?: "0", Icons.Default.Bed, MediCoreSuccess, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
fun DoctorDashboardView(summary: DashboardSummary) = GenericRoleDashboardView(summary, Icons.Default.MedicalServices, Color(0xFF14A88A))

@Composable
fun NurseDashboardView(summary: DashboardSummary) = GenericRoleDashboardView(summary, Icons.Default.LocalHospital, Color(0xFF8E24AA))

@Composable
fun ReceptionistDashboardView(summary: DashboardSummary) = GenericRoleDashboardView(summary, Icons.Default.Badge, Color(0xFFD81B60))

@Composable
fun PharmacistDashboardView(summary: DashboardSummary) = GenericRoleDashboardView(summary, Icons.Default.Medication, Color(0xFFF57C00))

@Composable
fun LabTechDashboardView(summary: DashboardSummary) = GenericRoleDashboardView(summary, Icons.Default.Biotech, Color(0xFF00897B))

@Composable
fun AdminDashboardView(summary: DashboardSummary) = GenericRoleDashboardView(summary, Icons.Default.AdminPanelSettings, Color(0xFF3949AB))

@Composable
fun SuperAdminDashboardView(summary: DashboardSummary) = GenericRoleDashboardView(summary, Icons.Default.SupervisorAccount, Color(0xFFD32F2F))
