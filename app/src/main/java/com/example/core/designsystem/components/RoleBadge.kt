package com.example.core.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.core.model.UserRole
import com.example.ui.theme.MediCoreBorder
import com.example.ui.theme.MediCorePrimary
import com.example.ui.theme.MediCoreSurface
import com.example.ui.theme.MediCoreSurfaceVariant

@Composable
fun RoleBadge(
    role: UserRole,
    isSelected: Boolean = false,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val bgColor = if (isSelected) {
        MediCorePrimary
    } else {
        MediCoreSurfaceVariant
    }

    val contentColor = if (isSelected) {
        MediCoreSurface
    } else {
        MediCorePrimary
    }

    val clickModifier = if (onClick != null) {
        Modifier
            .testTag("role_badge_${role.name.lowercase()}")
            .clickable { onClick() }
    } else Modifier

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(bgColor)
            .border(1.dp, if (isSelected) MediCorePrimary else MediCoreBorder, RoundedCornerShape(10.dp))
            .then(clickModifier)
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = role.icon,
                contentDescription = role.title,
                tint = contentColor,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = role.title,
                color = contentColor,
                fontSize = 12.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold
            )
        }
    }
}
