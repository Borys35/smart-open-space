package com.ziuty.smart_open_space

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap

class GateCredentialModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "GateCredential"

  @ReactMethod
  fun getCredential(promise: Promise) {
    val credential = GateCredentialStore.read(reactContext)
    if (credential == null) {
      promise.resolve(null)
      return
    }

    val map = WritableNativeMap()
    map.putInt("userId", credential.userId)
    map.putString("credentialId", credential.credentialId)
    promise.resolve(map)
  }

  @ReactMethod
  fun saveCredential(userId: Int, credentialId: String, secret: String, promise: Promise) {
    GateCredentialStore.save(reactContext, userId, credentialId, secret)
    promise.resolve(null)
  }

  @ReactMethod
  fun clearCredential(promise: Promise) {
    GateCredentialStore.clear(reactContext)
    promise.resolve(null)
  }
}
