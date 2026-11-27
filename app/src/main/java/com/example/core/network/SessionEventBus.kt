package com.example.core.network

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

sealed class SessionEvent {
    data class SessionExpired(val reason: String) : SessionEvent()
}

object SessionEventBus {
    private val _events = MutableSharedFlow<SessionEvent>(extraBufferCapacity = 4)
    val events: SharedFlow<SessionEvent> = _events.asSharedFlow()

    fun emitSessionExpired(reason: String = "Your session has expired. Please sign in again.") {
        _events.tryEmit(SessionEvent.SessionExpired(reason))
    }
}
