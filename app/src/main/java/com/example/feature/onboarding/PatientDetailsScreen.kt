package com.example.feature.onboarding

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContactEmergency
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.HealthAndSafety
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MedicalInformation
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.R
import com.example.core.designsystem.components.MediCoreButtonLoader
import com.example.core.designsystem.components.MediCoreCard
import com.example.core.model.UserProfile
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCoreColors
import com.example.ui.theme.MediCoreError
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCorePrimaryDark
import com.example.ui.theme.MediCoreSecondary
import com.example.ui.theme.MediCoreSuccess
import com.example.ui.theme.MediCoreSurface
import com.example.ui.theme.MediCoreSurfaceSoft
import com.example.ui.theme.MediCoreSurfaceVariant
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun PatientDetailsScreen(
    currentProfile: UserProfile,
    isEditMode: Boolean = false,
    onDetailsCompleted: (UserProfile) -> Unit,
    onNavigateBack: (() -> Unit)? = null,
    viewModel: PatientDetailsViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()
    var showDatePicker by remember { mutableStateOf(false) }

    LaunchedEffect(currentProfile.id, currentProfile.email, isEditMode) {
        viewModel.initialize(context, currentProfile, isEditMode)
    }

    BackHandler(enabled = uiState.currentStep > 0 || (isEditMode && onNavigateBack != null)) {
        if (uiState.currentStep > 0) {
            viewModel.previousStep()
        } else if (isEditMode && onNavigateBack != null) {
            onNavigateBack()
        }
    }

    val animatedProgress by animateFloatAsState(
        targetValue = uiState.completionPercent / 100f,
        animationSpec = spring(),
        label = "profile_completion_progress"
    )

    Scaffold(
        modifier = modifier
            .testTag("patient_details_screen")
            .fillMaxSize(),
        containerColor = MediCoreBackground,
        contentWindowInsets = WindowInsets.safeDrawing,
        topBar = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(brush = MediCoreColors.BlueWhiteHeaderBrush)
                    .padding(horizontal = 20.dp, vertical = 18.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (uiState.currentStep > 0 || (isEditMode && onNavigateBack != null)) {
                            IconButton(
                                onClick = {
                                    if (uiState.currentStep > 0) {
                                        viewModel.previousStep()
                                    } else {
                                        onNavigateBack?.invoke()
                                    }
                                },
                                modifier = Modifier
                                    .testTag("patient_details_back_button")
                                    .minimumInteractiveComponentSize()
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = "Back",
                                    tint = Color.White
                                )
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                        } else {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.18f))
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Badge,
                                    contentDescription = "Patient Registration Details",
                                    tint = Color.White,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (isEditMode) {
                                    stringResource(R.string.patient_details_edit_title)
                                } else {
                                    stringResource(R.string.patient_details_title)
                                },
                                fontSize = 21.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = stringResource(R.string.patient_details_subtitle),
                                fontSize = 12.sp,
                                color = Color.White.copy(alpha = 0.88f)
                            )
                        }

                        Surface(
                            color = Color.White.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                text = "${uiState.completionPercent}%",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    LinearProgressIndicator(
                        progress = { animatedProgress },
                        color = Color.White,
                        trackColor = Color.White.copy(alpha = 0.25f),
                        strokeCap = StrokeCap.Round,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Step Tabs
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        StepPill(
                            stepNumber = 1,
                            label = "Personal & Address",
                            selected = uiState.currentStep == 0,
                            completed = PatientDetailsValidator.validateStep1(uiState).isEmpty(),
                            onClick = { viewModel.goToStep(0) },
                            modifier = Modifier
                                .weight(1f)
                                .testTag("patient_details_step1_tab")
                        )
                        StepPill(
                            stepNumber = 2,
                            label = "Emergency & Health",
                            selected = uiState.currentStep == 1,
                            completed = PatientDetailsValidator.validateStep2(uiState).isEmpty(),
                            onClick = { viewModel.goToStep(1) },
                            modifier = Modifier
                                .weight(1f)
                                .testTag("patient_details_step2_tab")
                        )
                    }
                }
            }
        },
        bottomBar = {
            Surface(
                color = MediCoreSurface,
                shadowElevation = 8.dp,
                border = BorderStroke(1.dp, MediCoreBorder)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (uiState.currentStep == 1) {
                        OutlinedButton(
                            onClick = { viewModel.previousStep() },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .testTag("patient_details_prev_button")
                                .height(50.dp)
                        ) {
                            Text("Previous", fontWeight = FontWeight.SemiBold, color = MediCoreTextDark)
                        }
                    }

                    Button(
                        onClick = {
                            if (uiState.currentStep == 0) {
                                viewModel.goToStep(1)
                            } else {
                                viewModel.submitPatientDetails(
                                    context = context,
                                    currentProfile = currentProfile,
                                    onSavedSuccess = onDetailsCompleted
                                )
                            }
                        },
                        enabled = !uiState.isSaving,
                        colors = ButtonDefaults.buttonColors(containerColor = MediCorePrimary),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .testTag(
                                if (uiState.currentStep == 0) "patient_details_next_button"
                                else "patient_details_save_button"
                            )
                            .weight(1f)
                            .height(50.dp)
                    ) {
                        if (uiState.isSaving) {
                            MediCoreButtonLoader(lineColor = Color.White)
                        } else if (uiState.currentStep == 0) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Continue to Step 2", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                            }
                        } else {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = if (isEditMode) "Save Patient Details" else "Save & Continue",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .imePadding()
                .verticalScroll(scrollState)
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            AnimatedVisibility(visible = uiState.globalErrorMessage != null) {
                Surface(
                    color = MediCoreError.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, MediCoreError.copy(alpha = 0.35f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("patient_details_error_banner")
                ) {
                    Text(
                        text = uiState.globalErrorMessage.orEmpty(),
                        color = MediCoreError,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(14.dp)
                    )
                }
            }

            AnimatedContent(
                targetState = uiState.currentStep,
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "patient_details_step_content"
            ) { step ->
                if (step == 0) {
                    Step1PersonalContactAddress(
                        uiState = uiState,
                        viewModel = viewModel,
                        onOpenDatePicker = { showDatePicker = true }
                    )
                } else {
                    Step2EmergencyAndHealth(
                        uiState = uiState,
                        viewModel = viewModel
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
        }
    }

    if (showDatePicker) {
        val datePickerState = rememberDatePickerState(
            selectableDates = object : SelectableDates {
                override fun isSelectableDate(utcTimeMillis: Long): Boolean {
                    return utcTimeMillis <= System.currentTimeMillis()
                }
            }
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        val selectedMillis = datePickerState.selectedDateMillis
                        if (selectedMillis != null) {
                            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                                timeZone = TimeZone.getTimeZone("UTC")
                            }
                            viewModel.onDateOfBirthChanged(sdf.format(Date(selectedMillis)))
                        }
                        showDatePicker = false
                    },
                    modifier = Modifier.testTag("dob_picker_confirm_button")
                ) {
                    Text("Confirm", fontWeight = FontWeight.Bold, color = MediCorePrimary)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) {
                    Text("Cancel", color = MediCoreTextMuted)
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

@Composable
private fun StepPill(
    stepNumber: Int,
    label: String,
    selected: Boolean,
    completed: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        color = if (selected) Color.White else Color.White.copy(alpha = 0.16f),
        shape = RoundedCornerShape(10.dp),
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .minimumInteractiveComponentSize()
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 10.dp)
        ) {
            if (completed) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "Step completed",
                    tint = if (selected) MediCoreSuccess else Color.White,
                    modifier = Modifier.size(16.dp)
                )
            } else {
                Surface(
                    color = if (selected) MediCorePrimary else Color.White.copy(alpha = 0.25f),
                    shape = CircleShape,
                    modifier = Modifier.size(18.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "$stepNumber",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = if (selected) MediCorePrimaryDark else Color.White
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Step1PersonalContactAddress(
    uiState: PatientDetailsUiState,
    viewModel: PatientDetailsViewModel,
    onOpenDatePicker: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Section 1: Personal & Contact Details
        MediCoreCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(18.dp)) {
                SectionHeader(
                    icon = Icons.Default.Person,
                    title = "Personal & Contact Details",
                    badgeText = "Required *",
                    badgeColor = MediCorePrimary
                )

                Spacer(modifier = Modifier.height(14.dp))

                RequiredFieldLabel("Full Name *")
                OutlinedTextField(
                    value = uiState.fullName,
                    onValueChange = { viewModel.onFullNameChanged(it) },
                    placeholder = { Text("Enter patient full name", color = MediCoreTextMuted, fontSize = 14.sp) },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = MediCorePrimary) },
                    singleLine = true,
                    isError = uiState.fieldErrors.containsKey("fullName"),
                    supportingText = uiState.fieldErrors["fullName"]?.let { err ->
                        { Text(err, color = MediCoreError, fontSize = 12.sp) }
                    },
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier
                        .testTag("patient_fullname_input")
                        .fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                RequiredFieldLabel("Date of Birth (YYYY-MM-DD) *")
                OutlinedTextField(
                    value = uiState.dateOfBirth,
                    onValueChange = { viewModel.onDateOfBirthChanged(it) },
                    placeholder = { Text("YYYY-MM-DD (e.g. 1995-08-14)", color = MediCoreTextMuted, fontSize = 14.sp) },
                    leadingIcon = { Icon(Icons.Default.CalendarToday, contentDescription = null, tint = MediCorePrimary) },
                    trailingIcon = {
                        IconButton(
                            onClick = onOpenDatePicker,
                            modifier = Modifier
                                .testTag("patient_dob_picker_button")
                                .minimumInteractiveComponentSize()
                        ) {
                            Icon(Icons.Default.CalendarToday, contentDescription = "Pick date of birth", tint = MediCoreSecondary)
                        }
                    },
                    singleLine = true,
                    isError = uiState.fieldErrors.containsKey("dateOfBirth"),
                    supportingText = uiState.fieldErrors["dateOfBirth"]?.let { err ->
                        { Text(err, color = MediCoreError, fontSize = 12.sp) }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier
                        .testTag("patient_dob_input")
                        .fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                RequiredFieldLabel("Gender *")
                Spacer(modifier = Modifier.height(6.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    PatientDetailsUiState.ALLOWED_GENDERS.forEach { option ->
                        val selected = uiState.gender == option
                        FilterChip(
                            selected = selected,
                            onClick = { viewModel.onGenderSelected(option) },
                            label = {
                                Text(
                                    text = option,
                                    fontSize = 13.sp,
                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
                                )
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MediCorePrimary,
                                selectedLabelColor = Color.White,
                                containerColor = MediCoreSurfaceSoft,
                                labelColor = MediCoreTextDark
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = selected,
                                borderColor = MediCoreBorder,
                                selectedBorderColor = MediCorePrimary
                            ),
                            modifier = Modifier
                                .testTag("gender_chip_${option.lowercase().replace(" ", "_")}")
                                .minimumInteractiveComponentSize()
                        )
                    }
                }
                if (uiState.fieldErrors.containsKey("gender")) {
                    Text(
                        text = uiState.fieldErrors["gender"].orEmpty(),
                        color = MediCoreError,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                RequiredFieldLabel("Email Address *")
                OutlinedTextField(
                    value = uiState.email,
                    onValueChange = { viewModel.onEmailChanged(it) },
                    placeholder = { Text("patient@example.com", color = MediCoreTextMuted, fontSize = 14.sp) },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = MediCorePrimary) },
                    singleLine = true,
                    isError = uiState.fieldErrors.containsKey("email"),
                    supportingText = uiState.fieldErrors["email"]?.let { err ->
                        { Text(err, color = MediCoreError, fontSize = 12.sp) }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier
                        .testTag("patient_email_input")
                        .fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                RequiredFieldLabel("Mobile Number *")
                OutlinedTextField(
                    value = uiState.phone,
                    onValueChange = { viewModel.onPhoneChanged(it) },
                    placeholder = { Text("+91 98765 43210", color = MediCoreTextMuted, fontSize = 14.sp) },
                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = MediCorePrimary) },
                    singleLine = true,
                    isError = uiState.fieldErrors.containsKey("phone"),
                    supportingText = uiState.fieldErrors["phone"]?.let { err ->
                        { Text(err, color = MediCoreError, fontSize = 12.sp) }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier
                        .testTag("patient_phone_input")
                        .fillMaxWidth()
                )
            }
        }

        // Section 2: Residential Address (Required)
        MediCoreCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(18.dp)) {
                SectionHeader(
                    icon = Icons.Default.Home,
                    title = "Residential Address",
                    badgeText = "Required *",
                    badgeColor = MediCorePrimary
                )

                Spacer(modifier = Modifier.height(14.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Column(modifier = Modifier.weight(0.42f)) {
                        OptionalFieldLabel("House / Flat No.")
                        OutlinedTextField(
                            value = uiState.houseNumber,
                            onValueChange = { viewModel.onHouseNumberChanged(it) },
                            placeholder = { Text("e.g. Flat 4B", color = MediCoreTextMuted, fontSize = 13.sp) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                            modifier = Modifier
                                .testTag("patient_house_input")
                                .fillMaxWidth()
                        )
                    }
                    Column(modifier = Modifier.weight(0.58f)) {
                        OptionalFieldLabel("Locality / Area")
                        OutlinedTextField(
                            value = uiState.locality,
                            onValueChange = { viewModel.onLocalityChanged(it) },
                            placeholder = { Text("e.g. Lalpur", color = MediCoreTextMuted, fontSize = 13.sp) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                            modifier = Modifier
                                .testTag("patient_locality_input")
                                .fillMaxWidth()
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                RequiredFieldLabel("Street / Line Address *")
                OutlinedTextField(
                    value = uiState.streetAddress,
                    onValueChange = { viewModel.onStreetAddressChanged(it) },
                    placeholder = { Text("Street name, building or road", color = MediCoreTextMuted, fontSize = 14.sp) },
                    singleLine = true,
                    isError = uiState.fieldErrors.containsKey("streetAddress"),
                    supportingText = uiState.fieldErrors["streetAddress"]?.let { err ->
                        { Text(err, color = MediCoreError, fontSize = 12.sp) }
                    },
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier
                        .testTag("patient_street_input")
                        .fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Column(modifier = Modifier.weight(1f)) {
                        RequiredFieldLabel("City *")
                        OutlinedTextField(
                            value = uiState.city,
                            onValueChange = { viewModel.onCityChanged(it) },
                            placeholder = { Text("e.g. Ranchi", color = MediCoreTextMuted, fontSize = 14.sp) },
                            singleLine = true,
                            isError = uiState.fieldErrors.containsKey("city"),
                            supportingText = uiState.fieldErrors["city"]?.let { err ->
                                { Text(err, color = MediCoreError, fontSize = 11.sp) }
                            },
                            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                            modifier = Modifier
                                .testTag("patient_city_input")
                                .fillMaxWidth()
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        RequiredFieldLabel("State *")
                        OutlinedTextField(
                            value = uiState.state,
                            onValueChange = { viewModel.onStateChanged(it) },
                            placeholder = { Text("e.g. Jharkhand", color = MediCoreTextMuted, fontSize = 14.sp) },
                            singleLine = true,
                            isError = uiState.fieldErrors.containsKey("state"),
                            supportingText = uiState.fieldErrors["state"]?.let { err ->
                                { Text(err, color = MediCoreError, fontSize = 11.sp) }
                            },
                            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                            modifier = Modifier
                                .testTag("patient_state_input")
                                .fillMaxWidth()
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Column(modifier = Modifier.weight(1f)) {
                        RequiredFieldLabel("Postal / PIN Code *")
                        OutlinedTextField(
                            value = uiState.postalCode,
                            onValueChange = { viewModel.onPostalCodeChanged(it) },
                            placeholder = { Text("e.g. 834001", color = MediCoreTextMuted, fontSize = 14.sp) },
                            singleLine = true,
                            isError = uiState.fieldErrors.containsKey("postalCode"),
                            supportingText = uiState.fieldErrors["postalCode"]?.let { err ->
                                { Text(err, color = MediCoreError, fontSize = 11.sp) }
                            },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                            modifier = Modifier
                                .testTag("patient_postal_code_input")
                                .fillMaxWidth()
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        RequiredFieldLabel("Country *")
                        OutlinedTextField(
                            value = uiState.country,
                            onValueChange = { viewModel.onCountryChanged(it) },
                            placeholder = { Text("India", color = MediCoreTextMuted, fontSize = 14.sp) },
                            singleLine = true,
                            isError = uiState.fieldErrors.containsKey("country"),
                            supportingText = uiState.fieldErrors["country"]?.let { err ->
                                { Text(err, color = MediCoreError, fontSize = 11.sp) }
                            },
                            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                            modifier = Modifier
                                .testTag("patient_country_input")
                                .fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Step2EmergencyAndHealth(
    uiState: PatientDetailsUiState,
    viewModel: PatientDetailsViewModel
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Section 3: Emergency Contact (Required)
        MediCoreCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(18.dp)) {
                SectionHeader(
                    icon = Icons.Default.ContactEmergency,
                    title = "Emergency Contact",
                    badgeText = "Required *",
                    badgeColor = MediCorePrimary
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Used by hospital triage teams if you are unreachable during an emergency.",
                    fontSize = 12.sp,
                    color = MediCoreTextMuted
                )

                Spacer(modifier = Modifier.height(14.dp))

                RequiredFieldLabel("Emergency Contact Name *")
                OutlinedTextField(
                    value = uiState.emergencyContactName,
                    onValueChange = { viewModel.onEmergencyContactNameChanged(it) },
                    placeholder = { Text("e.g. Priya Verma", color = MediCoreTextMuted, fontSize = 14.sp) },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = MediCorePrimary) },
                    singleLine = true,
                    isError = uiState.fieldErrors.containsKey("emergencyContactName"),
                    supportingText = uiState.fieldErrors["emergencyContactName"]?.let { err ->
                        { Text(err, color = MediCoreError, fontSize = 12.sp) }
                    },
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier
                        .testTag("emergency_name_input")
                        .fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                RequiredFieldLabel("Relationship *")
                Spacer(modifier = Modifier.height(6.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    PatientDetailsUiState.COMMON_RELATIONSHIPS.forEach { rel ->
                        val selected = uiState.emergencyContactRelationship.equals(rel, ignoreCase = true)
                        FilterChip(
                            selected = selected,
                            onClick = { viewModel.onEmergencyContactRelationshipChanged(rel) },
                            label = { Text(rel, fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MediCorePrimary,
                                selectedLabelColor = Color.White,
                                containerColor = MediCoreSurfaceSoft,
                                labelColor = MediCoreTextDark
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = selected,
                                borderColor = MediCoreBorder,
                                selectedBorderColor = MediCorePrimary
                            ),
                            modifier = Modifier
                                .testTag("relationship_chip_${rel.lowercase()}")
                                .minimumInteractiveComponentSize()
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = uiState.emergencyContactRelationship,
                    onValueChange = { viewModel.onEmergencyContactRelationshipChanged(it) },
                    placeholder = { Text("Or enter relationship (e.g. Spouse, Parent)", color = MediCoreTextMuted, fontSize = 14.sp) },
                    singleLine = true,
                    isError = uiState.fieldErrors.containsKey("emergencyContactRelationship"),
                    supportingText = uiState.fieldErrors["emergencyContactRelationship"]?.let { err ->
                        { Text(err, color = MediCoreError, fontSize = 12.sp) }
                    },
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier
                        .testTag("emergency_relationship_input")
                        .fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                RequiredFieldLabel("Emergency Contact Phone *")
                OutlinedTextField(
                    value = uiState.emergencyContactPhone,
                    onValueChange = { viewModel.onEmergencyContactPhoneChanged(it) },
                    placeholder = { Text("Must differ from your own mobile number", color = MediCoreTextMuted, fontSize = 14.sp) },
                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = MediCorePrimary) },
                    singleLine = true,
                    isError = uiState.fieldErrors.containsKey("emergencyContactPhone"),
                    supportingText = uiState.fieldErrors["emergencyContactPhone"]?.let { err ->
                        { Text(err, color = MediCoreError, fontSize = 12.sp) }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier
                        .testTag("emergency_phone_input")
                        .fillMaxWidth()
                )
            }
        }

        // Section 4: Optional Health Information (Consent Gated)
        MediCoreCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(18.dp)) {
                SectionHeader(
                    icon = Icons.Default.MedicalInformation,
                    title = "Medical Background",
                    badgeText = "Optional",
                    badgeColor = MediCoreSecondary
                )

                Spacer(modifier = Modifier.height(10.dp))

                Surface(
                    color = MediCoreSurfaceVariant.copy(alpha = 0.5f),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clickable { viewModel.onHealthConsentToggled(!uiState.healthConsentGranted) }
                            .padding(horizontal = 10.dp, vertical = 8.dp)
                            .minimumInteractiveComponentSize()
                    ) {
                        Checkbox(
                            checked = uiState.healthConsentGranted,
                            onCheckedChange = { viewModel.onHealthConsentToggled(it) },
                            colors = CheckboxDefaults.colors(checkedColor = MediCorePrimary),
                            modifier = Modifier.testTag("health_consent_checkbox")
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Consent to Save Health Details",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = MediCoreTextDark
                            )
                            Text(
                                text = "Optional: Share blood group, allergies & conditions for clinical safety.",
                                fontSize = 11.sp,
                                color = MediCoreTextMuted
                            )
                        }
                    }
                }

                if (uiState.fieldErrors.containsKey("healthConsent")) {
                    Text(
                        text = uiState.fieldErrors["healthConsent"].orEmpty(),
                        color = MediCoreError,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 6.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                OptionalFieldLabel("Blood Group")
                Spacer(modifier = Modifier.height(6.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    PatientDetailsUiState.ALLOWED_BLOOD_GROUPS.forEach { bg ->
                        val selected = uiState.bloodGroup == bg
                        FilterChip(
                            selected = selected,
                            onClick = { viewModel.onBloodGroupSelected(bg) },
                            label = { Text(bg, fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MediCorePrimary,
                                selectedLabelColor = Color.White,
                                containerColor = MediCoreSurfaceSoft,
                                labelColor = MediCoreTextDark
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = selected,
                                borderColor = MediCoreBorder,
                                selectedBorderColor = MediCorePrimary
                            ),
                            modifier = Modifier
                                .testTag("blood_group_chip_${bg.lowercase().replace("+", "pos").replace("-", "neg")}")
                                .minimumInteractiveComponentSize()
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                OptionalFieldLabel("Known Allergies (comma-separated)")
                OutlinedTextField(
                    value = uiState.knownAllergiesText,
                    onValueChange = { viewModel.onKnownAllergiesChanged(it) },
                    placeholder = { Text("e.g. Penicillin, Peanuts", color = MediCoreTextMuted, fontSize = 14.sp) },
                    leadingIcon = { Icon(Icons.Default.HealthAndSafety, contentDescription = null, tint = MediCoreSecondary) },
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier
                        .testTag("health_allergies_input")
                        .fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                OptionalFieldLabel("Existing Conditions (comma-separated)")
                OutlinedTextField(
                    value = uiState.existingConditionsText,
                    onValueChange = { viewModel.onExistingConditionsChanged(it) },
                    placeholder = { Text("e.g. Hypertension, Asthma", color = MediCoreTextMuted, fontSize = 14.sp) },
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier
                        .testTag("health_conditions_input")
                        .fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                OptionalFieldLabel("Current Medications (comma-separated)")
                OutlinedTextField(
                    value = uiState.currentMedicationsText,
                    onValueChange = { viewModel.onCurrentMedicationsChanged(it) },
                    placeholder = { Text("e.g. Metformin 500mg", color = MediCoreTextMuted, fontSize = 14.sp) },
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier
                        .testTag("health_medications_input")
                        .fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                OptionalFieldLabel("Clinical Notes")
                OutlinedTextField(
                    value = uiState.medicalNotes,
                    onValueChange = { viewModel.onMedicalNotesChanged(it) },
                    placeholder = { Text("Any additional notes for your doctor", color = MediCoreTextMuted, fontSize = 14.sp) },
                    minLines = 2,
                    maxLines = 4,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MediCorePrimary, unfocusedBorderColor = MediCoreBorder),
                    modifier = Modifier
                        .testTag("health_notes_input")
                        .fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.VerifiedUser,
                        contentDescription = "Protected health information",
                        tint = MediCoreSuccess,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Your patient record is encrypted and shared only with your selected hospital care team.",
                        fontSize = 11.sp,
                        color = MediCoreTextMuted
                    )
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(
    icon: ImageVector,
    title: String,
    badgeText: String,
    badgeColor: Color
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(badgeColor.copy(alpha = 0.12f))
        ) {
            Icon(icon, contentDescription = null, tint = badgeColor, modifier = Modifier.size(20.dp))
        }
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = title,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = MediCoreTextDark,
            modifier = Modifier.weight(1f)
        )
        Surface(
            color = badgeColor.copy(alpha = 0.12f),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text(
                text = badgeText,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = badgeColor,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}

@Composable
private fun RequiredFieldLabel(text: String) {
    Text(
        text = text,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        color = MediCoreTextDark,
        modifier = Modifier.padding(bottom = 6.dp)
    )
}

@Composable
private fun OptionalFieldLabel(text: String) {
    Text(
        text = text,
        fontSize = 13.sp,
        fontWeight = FontWeight.Medium,
        color = MediCoreTextMuted,
        modifier = Modifier.padding(bottom = 6.dp)
    )
}
