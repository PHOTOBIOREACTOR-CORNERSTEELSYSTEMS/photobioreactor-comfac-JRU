const mqtt = require("mqtt");
const { createClient } = require("@supabase/supabase-js");

const MQTT_URL = process.env.MQTT_URL || "mqtt://test.mosquitto.org:1883";
const MQTT_TOPIC =
  process.env.MQTT_TOPIC ||
  "pbr/scs-comfac/scs-comfac-pbr-jul6-9x7k2m/unit01/sensors";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function numberOrNull(value) {
  const n = Number(value);
  return value === undefined || value === null || Number.isNaN(n) ? null : n;
}

function normalizeRecord(payload) {
  const nowMs = Date.now();
  const co2Ppm = numberOrNull(payload.co2);

  // Correct formula: CO2 % v/v = CO2 ppm / 10000.
  // If co2 is present, it is the source of truth.
  const co2PercentVv = co2Ppm !== null
    ? co2Ppm / 10000
    : numberOrNull(payload.co2Percent);

  return {
    device_id: payload.deviceId || "pbr-unit01",
    reading_id: payload.readingId || "auto-" + String(payload.timestampEpochMs || nowMs),
    timestamp_iso: payload.timestampISO || new Date().toISOString(),
    timestamp_epoch_ms: numberOrNull(payload.timestampEpochMs) || nowMs,
    ph: numberOrNull(payload.ph),
    ph_voltage: numberOrNull(payload.phVoltage),
    temperature: numberOrNull(payload.temperature),
    dissolved_oxygen: numberOrNull(payload.dissolvedOxygen),
    do_mg_l: numberOrNull(payload.doMgL),
    do_voltage: numberOrNull(payload.doVoltage),
    co2_ppm: co2Ppm,
    co2_percent_vv: co2PercentVv,
    water_level: numberOrNull(payload.waterLevel),
    water_level_cm: numberOrNull(payload.waterLevelCm),
    water_a2_voltage: numberOrNull(payload.waterA2Voltage),
    led_target_par: numberOrNull(payload.ledTargetPAR),
    cycle_remaining_ms: numberOrNull(payload.cycleRemainingMs),
    reading_source: payload.readingSource || "MQTT",
    raw_payload: payload
  };
}

const mqttClient = mqtt.connect(MQTT_URL, {
  clientId: "pbr-cloud-recorder-" + Math.random().toString(16).slice(2),
  clean: true,
  reconnectPeriod: 5000,
  connectTimeout: 15000,
  keepalive: 60
});

mqttClient.on("connect", () => {
  console.log("Connected to MQTT:", MQTT_URL);
  mqttClient.subscribe(MQTT_TOPIC, { qos: 1 }, (err) => {
    if (err) {
      console.error("MQTT subscribe failed:", err.message);
      return;
    }
    console.log("Subscribed to:", MQTT_TOPIC);
  });
});

mqttClient.on("message", async (topic, message) => {
  try {
    const text = message.toString();
    const payload = JSON.parse(text);
    const row = normalizeRecord(payload);

    const { error } = await supabase
      .from("pbr_records")
      .upsert(row, { onConflict: "reading_id" });

    if (error) {
      console.error("Supabase upsert failed:", error.message);
      return;
    }

    console.log(
      "Saved:", row.reading_id,
      "| pH:", row.ph,
      "| Temp:", row.temperature,
      "| CO2 ppm:", row.co2_ppm,
      "| CO2 % v/v:", row.co2_percent_vv
    );
  } catch (err) {
    console.error("Invalid MQTT message:", err.message);
  }
});

mqttClient.on("reconnect", () => console.log("Reconnecting to MQTT..."));
mqttClient.on("error", (err) => console.error("MQTT error:", err.message));
mqttClient.on("close", () => console.log("MQTT connection closed."));
