#include <Wire.h>
#include <PN532_I2C.h>
#include <PN532.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>
#include <HTTPClient.h>
#include <WiFiManager.h>
#include <ESPAsyncWebServer.h>
#include <WebSerial.h>
#include <AsyncTCP.h>

// obiekty serwera i NFC
AsyncWebServer server(80);
PN532_I2C pn532i2c(Wire);
PN532 nfc(pn532i2c);

// konfiguracja nfc
const int ledBialy = 26;
const int ledCzerwony = 27;
const int buzzer = 25;

const String deviceKey = "czujnik 1";

const uint8_t SELECT_SOS_AID[] = {
  0x00, 0xA4, 0x04, 0x00, 0x07,
  0xF0, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
  0x00
};

String bytesToHex(const uint8_t *data, uint8_t len)
{
  String output = "";
  for (uint8_t i = 0; i < len; i++)
  {
    if (data[i] < 0x10) output += "0";
    output += String(data[i], HEX);
  }
  output.toLowerCase();
  return output;
}

void grantAccess()
{
  WebSerial.println("PRZYZNANO DOSTEP");
  digitalWrite(ledBialy, HIGH);
  digitalWrite(buzzer, HIGH);
  delay(200);
  digitalWrite(buzzer, LOW);
  delay(800);
  digitalWrite(ledBialy, LOW);
}

void denyAccess()
{
  WebSerial.println("ODMOWA DOSTEPU / NIE ROZPOZNANO IDENTYFIKATORA");
  digitalWrite(ledCzerwony, HIGH);
  for(int i = 0; i < 2; i++) {
    digitalWrite(buzzer, HIGH);
    delay(150);
    digitalWrite(buzzer, LOW);
    delay(150);
  }
  digitalWrite(ledCzerwony, LOW);
}

void handleAccessResponse(String responseJSON)
{
  WebSerial.print("Odpowiedz serwera: ");
  WebSerial.println(responseJSON);

  if (responseJSON.indexOf("\"allowed\":true") != -1)
  {
    grantAccess();
  }
  else
  {
    denyAccess();
  }
}

void setup(void)
{
  Serial.begin(115200);
  delay(500);

  pinMode(ledBialy, OUTPUT);
  pinMode(ledCzerwony, OUTPUT);
  pinMode(buzzer, OUTPUT);

  // konfiguracja wifi (WiFiManager)
  WiFiManager wm;
  
  // wm.resetSettings();
  
  Serial.println("Uruchamianie WiFiManager...");
  // proba polaczenia z zapamietana siecia, jezeli sie nie uda ESP32 tworzy siec o nazwie "Czytnik_NFC"
  if (!wm.autoConnect("Czytnik_NFC"))
  {
    Serial.println("Blad polaczenia. Restartowanie...");
    delay(3000);
    ESP.restart();
  }

  // start konsoli http://[ADRES_IP_ESP32]/webserial
  WebSerial.begin(&server);
  server.begin();

  // konfiguracja aktualizacji kodu bezprzewodowo (Over-The-Air)
  ArduinoOTA.setHostname("Czytnik-NFC-ESP32");
  ArduinoOTA.setPassword("YOUR_OTA_PASSWORD");
  ArduinoOTA.begin();

  // start nfc
  nfc.begin();
  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata)
  {
    WebSerial.println("Nie znaleziono czytnika NFC");
  }
  else 
  {
    nfc.setPassiveActivationRetries(0xFF);
    nfc.SAMConfig();
    WebSerial.println("NFC: Czytnik gotowy do pracy");
  }
}

// funkcja wysylajaca dane do BACKEND
String sendMessage(String uidCard) 
{
  String payload = "";
  
  if (WiFi.status() == WL_CONNECTED) 
  {
    HTTPClient http;

    String url = "http://192.168.21.32:8000/api/sensor/access/check";
    
    http.begin(url);
    http.setTimeout(500);
    http.addHeader("Content-Type", "application/json");

    // struktura JSON
    String json = "{\"device_key\":\"" + deviceKey + "\",\"credential_uid\":\"" + uidCard + "\"}";

    int httpResponseCode = http.POST(json);

    WebSerial.print("Status HTTP z serwera: ");
    WebSerial.println(String(httpResponseCode));

    if (httpResponseCode == 200) 
    {
      payload = http.getString();
    }
    else 
    {
      payload = "ERROR";
    }
    
    http.end();
  }
  return payload;
}

String sendPhoneMessage(String credentialId, String nonce, String signature)
{
  String payload = "";

  if (WiFi.status() == WL_CONNECTED)
  {
    HTTPClient http;

    String url = "http://192.168.21.32:8000/api/sensor/access/phone/check";

    http.begin(url);
    http.setTimeout(1000);
    http.addHeader("Content-Type", "application/json");

    String json = "{\"device_key\":\"" + deviceKey + "\",\"credential_id\":\"" + credentialId + "\",\"nonce\":\"" + nonce + "\",\"signature\":\"" + signature + "\"}";

    int httpResponseCode = http.POST(json);

    WebSerial.print("Status HTTP telefonu z serwera: ");
    WebSerial.println(String(httpResponseCode));

    if (httpResponseCode == 200)
    {
      payload = http.getString();
    }
    else
    {
      payload = "ERROR";
    }

    http.end();
  }
  return payload;
}

bool exchangeApdu(const uint8_t *command, uint8_t commandLen, uint8_t *response, uint8_t *responseLen)
{
  return nfc.inDataExchange((uint8_t *)command, commandLen, response, responseLen);
}

bool hasSuccessStatus(const uint8_t *response, uint8_t responseLen)
{
  return responseLen >= 2 && response[responseLen - 2] == 0x90 && response[responseLen - 1] == 0x00;
}

bool tryPhoneCredential()
{
  if (!nfc.inListPassiveTarget())
  {
    return false;
  }

  uint8_t response[64];
  uint8_t responseLen = sizeof(response);

  if (!exchangeApdu(SELECT_SOS_AID, sizeof(SELECT_SOS_AID), response, &responseLen))
  {
    return false;
  }

  if (!hasSuccessStatus(response, responseLen))
  {
    return false;
  }

  String selectPayload = "";
  for (uint8_t i = 0; i < responseLen - 2; i++)
  {
    selectPayload += (char)response[i];
  }

  WebSerial.print("HCE SELECT: ");
  WebSerial.println(selectPayload);

  if (selectPayload != "SOS-HCE-READY")
  {
    denyAccess();
    return true;
  }

  uint8_t challengeApdu[14] = {
    0x80, 0x10, 0x00, 0x00, 0x08,
    0, 0, 0, 0, 0, 0, 0, 0,
    0x00
  };

  uint32_t randomA = esp_random();
  uint32_t randomB = esp_random();
  challengeApdu[5] = (randomA >> 24) & 0xFF;
  challengeApdu[6] = (randomA >> 16) & 0xFF;
  challengeApdu[7] = (randomA >> 8) & 0xFF;
  challengeApdu[8] = randomA & 0xFF;
  challengeApdu[9] = (randomB >> 24) & 0xFF;
  challengeApdu[10] = (randomB >> 16) & 0xFF;
  challengeApdu[11] = (randomB >> 8) & 0xFF;
  challengeApdu[12] = randomB & 0xFF;

  responseLen = sizeof(response);
  if (!exchangeApdu(challengeApdu, sizeof(challengeApdu), response, &responseLen))
  {
    denyAccess();
    return true;
  }

  if (!hasSuccessStatus(response, responseLen) || responseLen != 50)
  {
    WebSerial.print("Niepoprawna odpowiedz HCE, dlugosc: ");
    WebSerial.println(String(responseLen));
    denyAccess();
    return true;
  }

  String nonce = bytesToHex(challengeApdu + 5, 8);
  String credentialId = bytesToHex(response, 16);
  String signature = bytesToHex(response + 16, 32);

  WebSerial.print("Telefon credential_id: ");
  WebSerial.println(credentialId);
  WebSerial.print("Telefon nonce: ");
  WebSerial.println(nonce);

  handleAccessResponse(sendPhoneMessage(credentialId, nonce, signature));
  return true;
}

void loop(void)
{
  ArduinoOTA.handle();

  boolean success;
  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 }; 
  uint8_t uidLength;

  // proba odczytu karty
  success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, &uid[0], &uidLength, 50);

  if (success)
  {
    String cardUID = "";
    for (uint8_t i=0; i < uidLength; i++) 
    {
      cardUID += String(uid[i], HEX);
      if (i < uidLength - 1) cardUID += ":";
    }

    WebSerial.print("Wykryto karte: ");
    WebSerial.println(cardUID);

    if (tryPhoneCredential())
    {
      delay(500);
      return;
    }
    
    // przekazanie odczytanego UID do serwera
    String responseJSON = sendMessage(cardUID);
    handleAccessResponse(responseJSON);
    delay(500);
  }
}
