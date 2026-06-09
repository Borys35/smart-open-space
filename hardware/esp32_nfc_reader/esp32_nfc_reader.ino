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

    String url = "http://192.168.0.241:8000/api/sensor/access/check";
    
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
    
    // przekazanie odczytanego UID do serwera
    String responseJSON = sendMessage(cardUID);
    WebSerial.print("Odpowiedz serwera: ");
    WebSerial.println(responseJSON);

    // sprawdzamy, czy w odpowiedzi znajduje sie klucz "allowed":true
    if (responseJSON.indexOf("\"allowed\":true") != -1)
    {
      // backend potwierdzil, ze uzytkownik ma aktywna rezerwacje i wpuszcza go
      WebSerial.println("PRZYZNANO DOSTEP");
      digitalWrite(ledBialy, HIGH);
      digitalWrite(buzzer, HIGH);
      delay(200);
      digitalWrite(buzzer, LOW);
      delay(800);
      digitalWrite(ledBialy, LOW);
    } 
    else 
    {
      // odmowa dostepu
      WebSerial.println("ODMOWA DOSTEPU / NIE ROZPOZNANO KARTY");
      digitalWrite(ledCzerwony, HIGH);
      for(int i = 0; i < 2; i++) {
        digitalWrite(buzzer, HIGH);
        delay(150);
        digitalWrite(buzzer, LOW);
        delay(150);
      }
      digitalWrite(ledCzerwony, LOW);
    }
    delay(500);
  }
}