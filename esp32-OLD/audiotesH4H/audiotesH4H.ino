#include <ESP_I2S.h>

I2SClass I2S;

void setup() {
  Serial.begin(115200);
  delay(500);

  // XIAO ESP32S3 Sense onboard PDM mic pins
  I2S.setPinsPdmRx(42, 41);

  // PDM RX, 16 kHz, 16-bit, mono
  if (!I2S.begin(I2S_MODE_PDM_RX, 16000, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) {
    Serial.println("Failed to initialize I2S!");
    while (1) {}
  }

  Serial.println("PDM mic ready");
}

void loop() {
  int sample = I2S.read();
  if (sample && sample != -1 && sample != 1) {
    Serial.println(sample);
  }
}
