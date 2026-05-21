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
const int ledBialy = 19;
const int ledCzerwony = 18;
const int buzzer = 17;


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
  // próba połączenia z zapamiętaną siecią, jeżeli się nie uda ESP32 tworzy sieć o nazwie "Czytnik_NFC"
  if (!wm.autoConnect("Czytnik_NFC"))
  {
    Serial.println("Błąd połączenia. Restartowanie...");
    delay(3000);
    ESP.restart();
  }

  // start konsoli http://[ADRES_IP_ESP32]/webserial
  WebSerial.begin(&server);
  server.begin();

  // konfiguracja aktualizacji kodu bezprzewodowo (Over-The-Air)
  ArduinoOTA.setHostname("Czytnik-NFC-ESP32");
  ArduinoOTA.setPassword("haslo123");
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

// funkcja wysyłająca dane do BACKEND
int sendMessage(String uidCard) 
{
  int httpResponseCode = 0;
  
  if (WiFi.status() == WL_CONNECTED) 
  {
    HTTPClient http;

    // url serwera w dockerze
    String url = "http://192.168.0.241:8000/api/v1/auth/check-access";
    
    http.begin(url);
    http.setTimeout(150);
    http.addHeader("Content-Type", "application/json");

    // Budowanie struktury payloadu: {"uid":"WARTOŚĆ_KARTY"}
    String json = "{\"uid\":\"" + uidCard + "\"}";

    httpResponseCode = http.POST(json);

    WebSerial.print("Status odpowiedzi z serwera: ");
    WebSerial.println(String(httpResponseCode));
    http.end();
  }
  return httpResponseCode;
}

void loop(void)
 {
  ArduinoOTA.handle();

  boolean success;
  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 }; 
  uint8_t uidLength;

  // próba odczytu karty
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
    int serverStatus = sendMessage(cardUID);
    // logika reakcji ESP32 na odpowiedź
    if (serverStatus == 200 || serverStatus == 201)
     {
      // I: Backend potwierdził że karta ma aktywne uprawnienia w bazie danych
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
      // II: Dowolny inny status oznacza odmowę dostępu
      WebSerial.println("NIE ROZPOZNANO KARTY");
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