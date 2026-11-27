package com.example.feature.hospital

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bed
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Domain
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.designsystem.components.MediCoreCard
import com.example.core.model.Hospital
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCoreSecondary
import com.example.ui.theme.MediCoreSuccess
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

@Composable
fun HospitalSelectionScreen(
    viewModel: HospitalViewModel,
    onHospitalSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val categories = listOf("All", "Multi-Specialty", "Super Specialty", "Quaternary Care")

    Column(
        modifier = modifier
            .testTag("hospital_selection_screen")
            .fillMaxSize()
            .background(MediCoreBackground)
            .padding(top = 16.dp, start = 20.dp, end = 20.dp)
    ) {
        // Top Title
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(MediCorePrimary.copy(alpha = 0.1f))
            ) {
                Icon(
                    imageVector = Icons.Default.Domain,
                    contentDescription = "Hospitals",
                    tint = MediCorePrimary,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "Select Hospital",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreTextDark
                )
                Text(
                    text = "Choose your active hospital network workspace",
                    fontSize = 13.sp,
                    color = MediCoreTextMuted
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Search Bar
        OutlinedTextField(
            value = uiState.searchQuery,
            onValueChange = { viewModel.onSearchQueryChanged(it) },
            placeholder = { Text("Search by name, city, or category...", fontSize = 14.sp, color = MediCoreTextMuted) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = MediCorePrimary) },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MediCorePrimary,
                unfocusedBorderColor = MediCoreBorder,
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White
            ),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .testTag("hospital_search_input")
                .fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(14.dp))

        // Category Filter Chips
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(categories) { cat ->
                val isSelected = cat == uiState.selectedCategory
                FilterChip(
                    selected = isSelected,
                    onClick = { viewModel.onCategorySelected(cat) },
                    label = { Text(cat, fontSize = 12.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MediCorePrimary,
                        selectedLabelColor = Color.White,
                        containerColor = Color.White,
                        labelColor = MediCoreTextDark
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = isSelected,
                        borderColor = MediCoreBorder,
                        selectedBorderColor = MediCorePrimary
                    ),
                    modifier = Modifier.testTag("category_chip_${cat.lowercase().replace(" ", "_")}")
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Hospital Cards List
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(uiState.filteredHospitals) { hospital ->
                HospitalCardItem(
                    hospital = hospital,
                    isSelected = hospital.id == uiState.selectedHospitalId,
                    onSelect = {
                        viewModel.selectHospital(hospital.id)
                        onHospitalSelected(hospital.id)
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
    }
}

@Composable
fun HospitalCardItem(
    hospital: Hospital,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    MediCoreCard(
        modifier = Modifier.fillMaxWidth(),
        border = if (isSelected) androidx.compose.foundation.BorderStroke(2.dp, MediCorePrimary) else androidx.compose.foundation.BorderStroke(1.dp, MediCoreBorder)
    ) {
        Column(
            modifier = Modifier.padding(18.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(52.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MediCorePrimary.copy(alpha = 0.1f))
                ) {
                    Icon(
                        imageVector = Icons.Default.LocalHospital,
                        contentDescription = hospital.name,
                        tint = MediCorePrimary,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = hospital.name,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = MediCoreTextDark
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = hospital.category,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = MediCoreSecondary
                    )
                }

                Surface(
                    color = Color(0xFFFEF3C7),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Icon(Icons.Default.Star, contentDescription = "Rating", tint = Color(0xFFD97706), modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "${hospital.rating}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFB45309))
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Address Row
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.LocationOn, contentDescription = "Address", tint = MediCoreTextMuted, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "${hospital.address} • ${hospital.distanceKm}",
                    fontSize = 12.sp,
                    color = MediCoreTextMuted
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Stats row (Beds & Emergency)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Bed, contentDescription = "Beds", tint = MediCorePrimary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${hospital.availableBeds} / ${hospital.totalBeds} Beds Available",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MediCoreTextDark
                    )
                }

                if (hospital.isEmergencyConfirmed) {
                    Surface(
                        color = MediCoreSuccess.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "24/7 ER Ready",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MediCoreSuccess,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Select Button
            Button(
                onClick = onSelect,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isSelected) MediCoreSuccess else MediCorePrimary
                ),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .testTag("select_hospital_${hospital.id.lowercase()}")
                    .fillMaxWidth()
                    .height(44.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (isSelected) {
                        Icon(Icons.Default.CheckCircle, contentDescription = "Selected", modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Active Hospital Selected", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    } else {
                        Text("Select Hospital Workspace", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
