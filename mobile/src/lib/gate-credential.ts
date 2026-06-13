import { api } from "@/lib/api";
import { NativeModules } from "react-native";
import * as Device from "expo-device";

interface NativeGateCredential {
  getCredential: () => Promise<{ userId: number; credentialId: string } | null>;
  saveCredential: (userId: number, credentialId: string, secret: string) => Promise<void>;
  clearCredential: () => Promise<void>;
}

interface PhoneCredentialCreateResponse {
  credentialId: string;
  secret: string;
}

const GateCredential = NativeModules.GateCredential as NativeGateCredential | undefined;

function getDeviceName() {
  return Device.deviceName ?? Device.modelName ?? "Android phone";
}

export async function ensureGateCredential(userId: number) {
  if (process.env.EXPO_OS !== "android" || !GateCredential) {
    return;
  }

  const currentCredential = await GateCredential.getCredential();
  if (currentCredential?.userId === userId) {
    return;
  }

  if (currentCredential) {
    await GateCredential.clearCredential();
  }

  const credential = await api.post<PhoneCredentialCreateResponse>("/api/credentials/phone", {
    deviceName: getDeviceName(),
  });

  await GateCredential.saveCredential(userId, credential.credentialId, credential.secret);
}
