/*
   Adaptado de:
   https://www.survivingwithandroid.com/esp32-mqtt-client-publish-and-subscribe/
*/
#include <Arduino.h>
#include <WiFi.h>
const char *SSID = "****";
const char *CNTRSENA = "****";

void conectarAlWiFi() {
  Serial.print("Conectando a ");

  WiFi.begin(SSID, CNTRSENA);
  Serial.println(SSID);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.print("Conectado!");
}

#include <PubSubClient.h>
WiFiClient clienteWiFi;
PubSubClient clienteMQTT(clienteWiFi);
const char *servidorMQTT = "broker.hivemq.com";
int puertoMQTT = 1883;

void configuraMQTT() {
  clienteMQTT.setServer(servidorMQTT, puertoMQTT);
  // establece cual es la función callback que procesa los mensajes MQTT entrantes
  clienteMQTT.setCallback(acciones);
}

String idDeHabitat  = "habitat1";

#include <SimpleDHT.h> // Biblioteca para el sensor DHT11

/*
   Conexión del DHT11 con el ESP32 DEVKITV1
   DHT11     ESP32 DEVKITV1
    VCC  <--  3V3
    GND  <--  GND
  (S) DATA -->  GPIO04 (D4)
*/
int pinDHT11 = 4; // GPIO04 (D4)
SimpleDHT11 dht11(pinDHT11); // Objeto que representa al sensor dht11

/*
    Conexión del breakout GYML8511 con el ESP32 DEVKITV1
  GYML8511   ESP32 DEVKITV1
   VIN  <--  3V3
   3V3  -->  ADC1_7 (D35)
   GND  <--  GND
   OUT  -->  ADC1_6 (D34)
   EN   <--  3V3
***/
int SenalUV = 34;
int Referencia3V3 = 35;

/* 2022.01.23
   Conexión del SSR con el ESP32 DEVKITV1

  SSR    ESP32 DEVKITV1
  (VCC)DC+  <--  3V3
  (GND)DC-  <--  GND
       CH1  <--  GPIO12 (D12)
       CH2  <--  GPIO13 (D13)

       Aplcando un nivel LOW (0) en el canal enciende la lampara (lógica invertida)
*/
int lamp[] = {12, 13};
int edoLamp[] = {HIGH, HIGH};

// Para la obtención de la hora por medio de NTP se utilizo la informacion de:
// https://RandomNerdTutorials.com/esp32-ntp-timezones-daylight-saving/
// Get the POSIX style TZ format string from  https://github.com/nayarsystems/posix_tz_db/blob/master/zones.csv
#include "time.h"

void setTimezone(String timezone){
  Serial.printf("  Setting Timezone to %s\n",timezone.c_str());
  setenv("TZ",timezone.c_str(),1);  //  Now adjust the TZ.  Clock settings are adjusted to show the new local time
  tzset();
}

void initTime(String timezone){
  struct tm timeinfo;

  Serial.println("Setting up time");
  configTime(0, 0, "pool.ntp.org");    // First connect to NTP server, with 0 TZ offset
  if(!getLocalTime(&timeinfo)){
    Serial.println("  Failed to obtain time");
    return;
  }
  Serial.println("  Got the time from NTP");
  // Now we can set the real timezone
  setTimezone(timezone);
}

void printLocalTime(){
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    Serial.println("Failed to obtain time 1");
    return;
  }
  //Serial.println(&timeinfo, "%A, %B %d %Y %H:%M:%S zone %Z %z ");
  Serial.println(&timeinfo, "%A, %B %d %Y %H:%M:%S");
}

void setTime(int yr, int month, int mday, int hr, int minute, int sec, int isDst){
  struct tm tm;

  tm.tm_year = yr - 1900;   // Set date
  tm.tm_mon = month-1;
  tm.tm_mday = mday;
  tm.tm_hour = hr;      // Set time
  tm.tm_min = minute;
  tm.tm_sec = sec;
  tm.tm_isdst = isDst;  // 1 or 0
  time_t t = mktime(&tm);
  Serial.printf("Setting time: %s", asctime(&tm));
  struct timeval now = { .tv_sec = t };
  settimeofday(&now, NULL);
}

void setup() {
  Serial.begin(115200);
  conectarAlWiFi();
  configuraMQTT();

  pinMode(SenalUV, INPUT);
  pinMode(Referencia3V3, INPUT);

  for (int i = 0; i < 2; i++) {
    pinMode(lamp[i], OUTPUT);
    digitalWrite(lamp[i], edoLamp[i]);
  }

  initTime("CST6CDT,M4.1.0,M10.5.0");   // Set for America/Mexico_City
  printLocalTime();
}


char charBuffer[100];

unsigned long previoMilis = 0; // Cantidad de ms transcurridos cuando se hizo la ultima lectura
long intervaloEntreLecturas = 30000; // Intervalo de tiempo (ms) entre lecturas de los sensores

void loop() {
  if (!clienteMQTT.connected()) conectaConElBrokerMQTT();
  
  clienteMQTT.loop();

  unsigned long actualMilis = millis();
  if (actualMilis - previoMilis >= intervaloEntreLecturas) {
    printLocalTime();
    actualizarLecturas();
    previoMilis = actualMilis;
  }
}

byte temperaturaMax = 35, temperaturaMin = 26;
byte humedadMax= 90, humedadMin = 70;

void actualizarLecturas() {
  byte temperatura = 0, humedad = 0;
  int voltajeUV, voltaje3V3;
  float uvNormalizado;
  float intensidadUV;

  voltajeUV = promedioLecturaADC(SenalUV);
  voltaje3V3 = promedioLecturaADC(Referencia3V3);
  uvNormalizado = 3.3 / voltaje3V3 * voltajeUV;
  intensidadUV = mapeoFloat(uvNormalizado, 0.99, 2.8, 0.0, 15.0);
  //Serial.print("Intensidad: ");
  Serial.print(intensidadUV);
  Serial.println(" (mW/cm^2)");
  // publicar UV
  dtostrf(intensidadUV, 4, 2, charBuffer);
  clienteMQTT.publish("habitat1/UV", charBuffer);

  if (dht11.read(&temperatura, &humedad, NULL) == SimpleDHTErrSuccess) {
    Serial.print((int)temperatura); Serial.println(" *C, ");
    Serial.print((int)humedad); Serial.println(" H");
    // publicar temperatura y humedad
    clienteMQTT.publish("habitat1/humedad", &humedad, 1);
    clienteMQTT.publish("habitat1/temperatura", &temperatura, 1);
    // Si la temperadtura baja del minimo establecido encender las lamparas
    if(temperatura < temperaturaMin) {
      digitalWrite(lamp[0], edoLamp[0] = LOW);
      digitalWrite(lamp[1], edoLamp[1] = LOW);
    }
    // o si la temperatura rebasa un maximo y las lamparas estan encendidas , apagarlas
    if(temperatura > temperaturaMax) {
      digitalWrite(lamp[0], edoLamp[0] = HIGH);
      digitalWrite(lamp[1], edoLamp[1] = HIGH);
    }
    // Si la humedad baja del minimo establecido hacer una atomización
    if(humedad < humedadMin) {
      // atomizar
      Serial.println("Humedad baja! Atomizando");
    }
  } else {
    Serial.print("Read DHT11 failed!"); delay(1000);
    return;
  }
}

String topicosDeControl = idDeHabitat + "/ctrl/#";
String idClienteBase = "marchante -";

void conectaConElBrokerMQTT() {
  const char *tdc = topicosDeControl.c_str();
  Serial.println("Conectando con el Broker MQTT...");
  while (!clienteMQTT.connected()) {
    String idClienteDelBroker = idClienteBase;
    Serial.println("Reconectando con el Broker MQTT...");
    // Genera un nuevo identificador para identificarse como cliente del Broker
    idClienteDelBroker += String(random(0xffff), HEX);
    // connect espera como parametro un tipo char[],
    // c_str() returns a pointer to an array that contains a null-terminated
    // sequence of characters representing the current value of the String object.
    if (clienteMQTT.connect(idClienteDelBroker.c_str())) {
      Serial.println("Conectado!");
      // subscribirse a todos los topicos de control
      //clienteMQTT.subscribe(topicosDeControl.c_str());
      clienteMQTT.subscribe(tdc);
      Serial.print("Suscrito a:");
      Serial.println(tdc);
    }
  }
}

int promedioLecturaADC(int terminal) {
  byte numeroLecturas = 8;
  unsigned int acumulado = 0;
  for (int i = 0; i < numeroLecturas; i++)
    acumulado += analogRead(terminal);
  return (acumulado / numeroLecturas);
}

float mapeoFloat(float entrada, float in_min, float in_max, float out_min, float out_max) {
  return (entrada - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

void acciones(char* topico, byte* mensaje, unsigned int grandor) {
  int posIni = topicosDeControl.length() - 1;
  String sTopico = String(topico);
  Serial.print("Callback - ");
  Serial.print(sTopico + " Mensaje:");
  for (int i = 0; i < grandor; i++) {
    Serial.print((char)mensaje[i]);
  }
  Serial.print("\n");
  if (sTopico.startsWith("actualizar", posIni)) {
    Serial.println("Actualizando lecturas");
    actualizarLecturas();
  }
  else if (sTopico.startsWith("lamp1", posIni)) {
    Serial.println("Acualizando lamp1");
    if (mensaje[0] == '0') digitalWrite(lamp[0], edoLamp[0] = HIGH);
    else if (mensaje[0] == '1') digitalWrite(lamp[0], edoLamp[0] = LOW);
  }
  else if (sTopico.startsWith("lamp2", posIni)) {
    Serial.println("Actualizando lamp2");
    if (mensaje[0] == '0') digitalWrite(lamp[1], edoLamp[1] = HIGH);
    else if (mensaje[0] == '1') digitalWrite(lamp[1], edoLamp[1] = LOW);
  }
  else if (sTopico.startsWith("atomizar", posIni)) {
    Serial.println("Atomizando");
  }
  else if (sTopico.startsWith("humedadMin", posIni)) {
    mensaje[grandor]=0;
    humedadMin = atoi((const char *)mensaje);
    Serial.println(String("Estableciendo minimo de humedad: ") + humedadMin);
  }
  else if (sTopico.startsWith("tempMin", posIni)) {
    mensaje[grandor]=0;
    temperaturaMin = atoi((const char *)mensaje);
    Serial.println(String("Estableciendo la temperatura minima: ") + temperaturaMin);
    // Si el nuevo minimo es menor que la temperatura actual, apagar las lamparas
  }
  else if (sTopico.startsWith("tempMax", posIni)) {
    mensaje[grandor]=0;
    temperaturaMax = atoi((const char *)mensaje);
    Serial.println(String("Estableciendo la temperatura maxima: ") + temperaturaMax);
  }
  else if (sTopico.startsWith("intervalo", posIni)) {
    mensaje[grandor]=0;
    intervaloEntreLecturas = atoi((const char *)mensaje)*1000;
    Serial.println(String("Estableciendo intervalo entre actualizaciones de lecturas: ") + intervaloEntreLecturas);
    //intervaloEntreLecturas = atoi((const char *)mensaje)*1000;
    
  }
  else if (sTopico.startsWith("mensaje", posIni)) {
    Serial.println("Recibiendo mensaje");
  }
}
