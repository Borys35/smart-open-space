package com.ziuty.smart_open_space

import android.content.Context

object GateCredentialStore {
  private const val PREFS_NAME = "smart_open_space_gate_credential"
  private const val KEY_USER_ID = "user_id"
  private const val KEY_CREDENTIAL_ID = "credential_id"
  private const val KEY_SECRET = "secret"

  fun save(context: Context, userId: Int, credentialId: String, secret: String) {
    context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putInt(KEY_USER_ID, userId)
      .putString(KEY_CREDENTIAL_ID, credentialId)
      .putString(KEY_SECRET, secret)
      .apply()
  }

  fun read(context: Context): Credential? {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val credentialId = prefs.getString(KEY_CREDENTIAL_ID, null) ?: return null
    val secret = prefs.getString(KEY_SECRET, null) ?: return null
    val userId = prefs.getInt(KEY_USER_ID, -1)
    if (userId < 0) return null

    return Credential(userId, credentialId, secret)
  }

  fun clear(context: Context) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
  }

  data class Credential(
    val userId: Int,
    val credentialId: String,
    val secret: String,
  )
}
