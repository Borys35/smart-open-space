import { Linking, Platform } from "react-native";

export function hasFiniteCoordinates(latitude: unknown, longitude: unknown) {
  return typeof latitude === "number" && typeof longitude === "number" &&
    Number.isFinite(latitude) && Number.isFinite(longitude);
}

function getMapsUrl(latitude: number, longitude: number, label: string) {
  const coordinates = `${latitude},${longitude}`;
  const encodedLabel = encodeURIComponent(label);

  if (Platform.OS === "ios") {
    return `maps://?q=${encodedLabel}&ll=${coordinates}`;
  }

  if (Platform.OS === "android") {
    return `geo:${coordinates}?q=${coordinates}(${encodedLabel})`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${coordinates}`;
}

export async function openMapsUrl(latitude: number, longitude: number, label: string) {
  const nativeUrl = getMapsUrl(latitude, longitude, label);
  const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  try {
    const canOpenNativeUrl = await Linking.canOpenURL(nativeUrl);
    await Linking.openURL(canOpenNativeUrl ? nativeUrl : fallbackUrl);
  } catch (error) {
    console.error("Failed to open maps:", error);
  }
}
