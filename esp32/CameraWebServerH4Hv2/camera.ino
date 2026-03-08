// ==========================================
// CAMERA HARDWARE INIT
// (HTTP streaming server is in app_httpd.cpp)
// ==========================================
void setupCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;

  // Stabilized values for streaming over mobile hotspot
  config.xclk_freq_hz = 15000000;
  config.frame_size   = FRAMESIZE_SXGA;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location  = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 10;
  config.fb_count     = 1;

  if (psramFound()) {
    config.jpeg_quality = 1;
    config.fb_count     = 2;
    config.grab_mode    = CAMERA_GRAB_LATEST;
  } else {
    config.frame_size  = FRAMESIZE_VGA;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return;
  }

  sensor_t *s = esp_camera_sensor_get();
  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_brightness(s, 1);
    s->set_saturation(s, -2);
  }
  s->set_framesize(s, FRAMESIZE_VGA);
  s->set_quality(s, 15);

#if defined(LED_GPIO_NUM)
  setupLedFlash(LED_GPIO_NUM);
#endif
}
