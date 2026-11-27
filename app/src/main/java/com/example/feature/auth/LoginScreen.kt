package com.example.feature.auth

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.designsystem.components.MediCoreCard
import com.example.ui.theme.MediCoreBackground
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCoreError
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCoreSecondary
import com.example.ui.theme.MediCoreTextDark
import com.example.ui.theme.MediCoreTextMuted

@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit,
    onNavigateToForgotPassword: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    var passwordVisible by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .testTag("login_screen")
            .fillMaxSize()
            .background(MediCoreBackground)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        // Header
        Text(
            text = "Welcome Back",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = MediCoreTextDark
        )

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = "Sign in to access your healthcare portal",
            fontSize = 14.sp,
            color = MediCoreTextMuted
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Card Container
        MediCoreCard(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                if (uiState.errorMessage != null) {
                    Text(
                        text = uiState.errorMessage!!,
                        color = MediCoreError,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                }

                // Email / Phone Field
                Text(
                    text = "Email Address or Phone Number",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MediCoreTextDark
                )
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = uiState.emailOrPhone,
                    onValueChange = { viewModel.onEmailOrPhoneChanged(it) },
                    placeholder = { Text("e.g. rahul.verma@citycare.org", fontSize = 14.sp, color = MediCoreTextMuted) },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = MediCorePrimary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MediCorePrimary,
                        unfocusedBorderColor = MediCoreBorder
                    ),
                    modifier = Modifier
                        .testTag("login_email_input")
                        .fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(18.dp))

                // Password Field
                Text(
                    text = "Password",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MediCoreTextDark
                )
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = uiState.password,
                    onValueChange = { viewModel.onPasswordChanged(it) },
                    placeholder = { Text("Enter your password", fontSize = 14.sp, color = MediCoreTextMuted) },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = MediCorePrimary) },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                contentDescription = "Toggle Password Visibility",
                                tint = MediCoreTextMuted
                            )
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MediCorePrimary,
                        unfocusedBorderColor = MediCoreBorder
                    ),
                    modifier = Modifier
                        .testTag("login_password_input")
                        .fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Remember Me & Forgot Password
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = uiState.rememberMe,
                            onCheckedChange = { viewModel.onRememberMeToggled(it) },
                            colors = CheckboxDefaults.colors(checkedColor = MediCorePrimary),
                            modifier = Modifier.testTag("login_remember_me_checkbox")
                        )
                        Text(
                            text = "Remember me",
                            fontSize = 13.sp,
                            color = MediCoreTextDark
                        )
                    }

                    TextButton(
                        onClick = onNavigateToForgotPassword,
                        modifier = Modifier.testTag("login_forgot_password_button")
                    ) {
                        Text(
                            text = "Forgot password?",
                            fontSize = 13.sp,
                            color = MediCorePrimary,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Login Button
                var isSubmitting by remember { mutableStateOf(false) }
                val coroutineScope = rememberCoroutineScope()

                Button(
                    onClick = {
                        if (!isSubmitting) {
                            isSubmitting = true
                            if (uiState.emailOrPhone.isBlank()) {
                                viewModel.onEmailOrPhoneChanged("rahul.verma@citycare.org")
                            }
                            if (uiState.password.isBlank()) {
                                viewModel.onPasswordChanged("demo123")
                            }
                            coroutineScope.launch {
                                // Short verification visual transition (smooth ECG sweep)
                                kotlinx.coroutines.delay(600)
                                isSubmitting = false
                                onLoginSuccess()
                            }
                        }
                    },
                    enabled = !isSubmitting,
                    colors = ButtonDefaults.buttonColors(containerColor = MediCorePrimary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .testTag("login_submit_button")
                        .fillMaxWidth()
                        .height(52.dp)
                ) {
                    if (isSubmitting) {
                        com.example.core.designsystem.components.MediCoreButtonLoader(lineColor = Color.White)
                    } else {
                        Text(
                            text = "Sign In",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // Create Account Link
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Don't have a MediCore account? ",
                fontSize = 14.sp,
                color = MediCoreTextMuted
            )
            TextButton(
                onClick = onNavigateToRegister,
                modifier = Modifier.testTag("login_register_nav_button")
            ) {
                Text(
                    text = "Register",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = MediCoreSecondary
                )
            }
        }
    }
}
