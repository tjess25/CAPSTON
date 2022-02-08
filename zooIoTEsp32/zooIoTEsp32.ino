
//Bibliotecas
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "DHT.h"
#include "time.h"


// Definiciones
#define DHTPIN 13
#define DHTTYPE DHT11
#define NIVEL 34
const int calor = 14;
const int uv = 27;
const int agua = 26;



//Datos de WiFi
const char* ssid = "**";
const char* password = "**";

//Datos del broker MQTT
const char* mqtt_server = "**";
IPAddress server();

//const char* mqtt_server = "192.168.0.100";
//IPAddress server(192,168,0,100);

//Temas para publicar
const char* dataTopic = "habitat1/data";
const char* statusTopic = "habitat1/status_out";
const char* pingTopic = "habitat1/ping";

// Objetos
WiFiClient espClient;
PubSubClient clientMQTT(espClient);
DHT dht(DHTPIN, DHTTYPE);

// Variables globales
long timeNow, timeLast, timeWatering, lastGetTime;
int wait = 10000;
int waitSend = 300000;
int waitWatering = 5000;
int waitGetTime = 60000;
DynamicJsonDocument defaultValue(1024);
float maxtemp = 30.0;
float mintemp = 22.0;
float minhum = 60.0;
int h_onUv[2] = {0,0};
int h_offUv[2] = {0,0};
int h_now[2] = {0,0};


// flags
int sendStatus = 0;
int onUv = 0;
int onCalor = 0;
int onPump = 0;
int watering = 0;

void callback(char* topic, byte* message, unsigned int length) {

  Serial.print("Llegó un mensaje en el tema: ");
  Serial.print(topic);


  String messageTemp;  
  for (int i = 0; i < length; i++) {
    messageTemp += (char)message[i];
  }

 
  Serial.println();
  Serial.print ("Mensaje recibido: ");
  Serial.println (messageTemp);

  if (String(topic) == "habitat1/calor") {
    if(messageTemp == "true"){
      Serial.println("Calor encendido");
      digitalWrite(calor , HIGH);
      onCalor = 1;
      sendStatus = 1;
    }
    else if(messageTemp == "false"){
      Serial.println("Calor apagado");
      digitalWrite(calor , LOW);
      onCalor = 0;
      sendStatus = 1;
    }
  }
  if (String(topic) == "habitat1/uv") {
    if(messageTemp == "true"){
      Serial.println("UV encendido");
      digitalWrite(uv , HIGH);
      onUv = 1;
      sendStatus = 1;
    }
    else if(messageTemp == "false"){
      Serial.println("UV apagado");
      digitalWrite(uv , LOW);
      onUv = 0;
      sendStatus = 1;
    }
  }
  if (String(topic) == "habitat1/pump") {
    if(messageTemp == "true"){
      Serial.println("Riego encendido");
      digitalWrite(agua , LOW);
      onPump = 1;
      sendStatus = 1;
      watering = 1;
      timeWatering = millis();
    }
    else if(messageTemp == "false"){
      Serial.println("Riego apagado");
      digitalWrite(agua , HIGH);
      onPump = 0;
      sendStatus = 1;
      watering = 0;
    }
  }

  if (String(topic) == "habitat1/status_in") {
    if(messageTemp == "true") {
        sendStatus = 1;
      }
    }

  if (String(topic) == "habitat1/default") {

      deserializeJson(defaultValue, messageTemp);

      maxtemp = defaultValue["maxtemp"];
      mintemp = defaultValue["mintemp"];
      minhum = defaultValue["minhum"];
      h_onUv[0] = defaultValue["h_on"][0];
      h_onUv[1] = defaultValue["h_on"][1];
      h_offUv[0] = defaultValue["h_off"][0];
      h_offUv[1] = defaultValue["h_off"][1];

      Serial.println("Valores default");
      Serial.println(maxtemp);
      Serial.println(mintemp);
      Serial.println(minhum);
      Serial.print(h_onUv[0]);
      Serial.print(":");
      Serial.println(h_onUv[1]);
      Serial.print(h_offUv[0]);
      Serial.print(":");
      Serial.print(h_offUv[1]);
    }
 }


void reconnect() {
  while (!clientMQTT.connected()) {
    Serial.print("Conectando al broker...");
    // Intentar reconexión
    if (clientMQTT.connect("habitat1")) {
      Serial.println("Conectado");
      
      clientMQTT.subscribe("habitat1/calor");
      Serial.print("suscripcion a habitat1/uv ");
      while (!clientMQTT.subscribe("habitat1/uv")) {
        Serial.print(".");
      }
      Serial.println(" Suscrito");
      
      clientMQTT.subscribe("habitat1/pump");
      clientMQTT.subscribe("habitat1/status_in");

      clientMQTT.subscribe("habitat1/default");
    }
    else { 
      Serial.print("Conexion fallida, Error rc=");
      Serial.print(clientMQTT.state());
      Serial.println(" Volviendo a intentar en 5 segundos");
      delay(wait);
      Serial.println (clientMQTT.connected ());
    }
  }
}

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

void getLocalTime(){
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    Serial.println("Failed to obtain time 1");
    return;
  }
  //Serial.println(&timeinfo, "%A, %B %d %Y %H:%M:%S zone %Z %z ");
  //Serial.println(&timeinfo, "%A, %B %d %Y %H:%M:%S");
  h_now[0] = timeinfo.tm_hour;
  
  h_now[1] = timeinfo.tm_min;
  Serial.print("Hora actual: ");
  Serial.print(h_now[0]);
  Serial.print(":");
  Serial.println(h_now[1]);
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

  Serial.print("Conectar a ");
  Serial.println(ssid);
 
  WiFi.begin(ssid, password); 
 
  while (WiFi.status() != WL_CONNECTED) { 
    delay(wait);
    Serial.print(".");  
    delay (5);
  }

  Serial.println();
  Serial.println("WiFi conectado");
  Serial.println("Direccion IP: ");
  Serial.println(WiFi.localIP());
  
  pinMode(calor , OUTPUT);
  pinMode(uv , OUTPUT);
  pinMode(agua , OUTPUT);

  delay (1000); 

  // Conexión con el broker MQTT
  clientMQTT.setServer(server, 1883);
  clientMQTT.setCallback(callback);
  delay(1500);

  timeLast = millis() - waitSend;
  timeWatering = millis();
  sendStatus = 1;

  Serial.println(F("Prueba de coenxion a sensor dht11"));
  dht.begin();

  digitalWrite(agua , HIGH);
  digitalWrite(uv , LOW);
  digitalWrite(calor , LOW);
  delay (5000);

  initTime("CST6CDT,M4.1.0,M10.5.0"); 
  delay (5000);
  lastGetTime = millis();
  getLocalTime();
}

void loop() {

  if (!clientMQTT.connected()) {
    reconnect();
  }
  clientMQTT.loop();

  if (millis() >= lastGetTime + waitGetTime) {

    lastGetTime = millis();
    getLocalTime();

    if (onUv && (h_now[0] == h_offUv[0] && h_now[1] == h_offUv[1])) {
      Serial.println("UV apagado");
      digitalWrite(uv , LOW);
      onUv = 0;
      sendStatus = 1;
    }
  
    if (!onUv && (h_now[0] == h_onUv[0] && h_now[1] == h_onUv[1])) {
      Serial.println("UV encendido");
      digitalWrite(uv , HIGH);
      onUv = 1;
      sendStatus = 1;
    }  
  }
  
  if (watering && millis() > timeWatering + waitWatering) {
    Serial.println("Riego apagado");
    digitalWrite(agua , HIGH);
    onPump = 0;
    sendStatus = 1;
    watering = 0;
  }
  
  if (sendStatus) {
      // Prepare payload string
      String statusPayload = "{\"uv\":";
      if (onUv) {
          statusPayload.concat("true,");
      } else {
          statusPayload.concat("false,");
      }
      statusPayload.concat("\"calor\":");

      if (onCalor) {
          statusPayload.concat("true,");
      } else {
          statusPayload.concat("false,");
      }

      statusPayload.concat("\"pump\":");

      if (onPump) {
          statusPayload.concat("true");
      } else {
          statusPayload.concat("false");
      }
      statusPayload.concat("}");
      char mqtt_payload_status[200];
      statusPayload.toCharArray( mqtt_payload_status, 200 );
      // Send payload
      Serial.println("sendDataTopic");
      Serial.println(statusPayload);
      clientMQTT.publish( statusTopic, mqtt_payload_status);
      sendStatus = 0;
    }

  if (millis() - timeLast > waitSend) {
    
    timeLast = timeNow;

    float t = dht.readTemperature();
    float h = dht.readHumidity();
    int n = 0;

    delay(10);  
    n = analogRead(NIVEL);

    n = (n * 100) / 1500;
    
    if ( isnan(t) || isnan(h)) {
        Serial.println(F("No hay conexion"));
        return;
  } else {
        Serial.print(F("Temperatura en °C: "));
        Serial.println(t);
        Serial.print(F("Humedad: "));
        Serial.println(h);
        Serial.print(F("Nivel del Agua: "));
        Serial.println(n);
     
        if (t <= mintemp && !onCalor) {
          Serial.println("Calor encendido");
          digitalWrite(calor , HIGH);
          onCalor = 1;
          sendStatus = 1;
        } else if( t >= maxtemp && onCalor) {
          Serial.println("Calor apagado");
          digitalWrite(calor , LOW);
          onCalor = 0;
          sendStatus = 1;   
        }

        if (h <= minhum) {
          Serial.println("Riego encendido");
          digitalWrite(agua , LOW);
          onPump = 1;
          watering = 1;
          sendStatus = 1;
          timeWatering = millis();
        }

        Serial.println("sendDataTopic");
        
        // Prepare payload string
        String datapayload = "{\"temp\":";
        datapayload.concat(t);
        datapayload.concat(",\"hum\":");
        datapayload.concat(h);
        datapayload.concat(",\"wlevel\":");
        datapayload.concat(n);
        datapayload.concat("}");

        Serial.println(datapayload);

        // Send payload
        char mqtt_payload_data[150];
        datapayload.toCharArray( mqtt_payload_data, 150 );
    
        
        
        // Send payload
        clientMQTT.publish( dataTopic, mqtt_payload_data);
        timeLast = millis();
    }
  }
  

}
