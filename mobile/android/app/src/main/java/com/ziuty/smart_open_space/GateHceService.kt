package com.ziuty.smart_open_space

import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import android.util.Log
import java.security.MessageDigest
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class GateHceService : HostApduService() {
  override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
    if (commandApdu == null) {
      return STATUS_FAILED
    }

    Log.d(TAG, "APDU <- ${commandApdu.toHex()}")

    val response =
      when {
        commandApdu.contentEquals(SELECT_AID_APDU) -> {
          if (GateCredentialStore.read(this) == null) {
            "SOS-HCE-NO-CRED".encodeToByteArray()
          } else {
            "SOS-HCE-READY".encodeToByteArray()
          }
        }
        commandApdu.matchesChallengeCommand() -> {
          val challengeLength = commandApdu[4].toInt() and 0xff
          val nonce = commandApdu.copyOfRange(5, 5 + challengeLength)
          val credential = GateCredentialStore.read(this) ?: return STATUS_CONDITIONS_NOT_SATISFIED
          credential.credentialId.toUuidBytes() + credential.sign(nonce)
        }
        else -> return STATUS_INS_NOT_SUPPORTED
      }

    val responseApdu = response + STATUS_SUCCESS
    Log.d(TAG, "APDU -> ${responseApdu.toHex()}")
    return responseApdu
  }

  override fun onDeactivated(reason: Int) {
    Log.d(TAG, "HCE deactivated: $reason")
  }

  private fun ByteArray.matchesChallengeCommand(): Boolean {
    if (size < 6) return false
    val lc = this[4].toInt() and 0xff
    return this[0] == 0x80.toByte() &&
      this[1] == 0x10.toByte() &&
      size >= 5 + lc &&
      lc == 8
  }

  private fun GateCredentialStore.Credential.sign(nonce: ByteArray): ByteArray {
    val key = MessageDigest.getInstance("SHA-256").digest(secret.toByteArray(Charsets.UTF_8))
    val mac = Mac.getInstance("HmacSHA256")
    mac.init(SecretKeySpec(key, "HmacSHA256"))
    return mac.doFinal(nonce)
  }

  private fun String.toUuidBytes(): ByteArray {
    val uuid = UUID.fromString(this)
    val output = ByteArray(16)
    val most = uuid.mostSignificantBits
    val least = uuid.leastSignificantBits

    for (index in 0 until 8) {
      output[index] = (most shr (8 * (7 - index))).toByte()
      output[index + 8] = (least shr (8 * (7 - index))).toByte()
    }

    return output
  }

  private fun ByteArray.toHex(): String = joinToString("") { "%02X".format(it) }

  companion object {
    private const val TAG = "GateHceService"

    private val SELECT_AID_APDU =
      byteArrayOf(
        0x00,
        0xA4.toByte(),
        0x04,
        0x00,
        0x07,
        0xF0.toByte(),
        0x01,
        0x02,
        0x03,
        0x04,
        0x05,
        0x06,
        0x00,
      )

    private val STATUS_SUCCESS = byteArrayOf(0x90.toByte(), 0x00)
    private val STATUS_FAILED = byteArrayOf(0x6F.toByte(), 0x00)
    private val STATUS_INS_NOT_SUPPORTED = byteArrayOf(0x6D.toByte(), 0x00)
    private val STATUS_CONDITIONS_NOT_SATISFIED = byteArrayOf(0x69.toByte(), 0x85.toByte())
  }
}
