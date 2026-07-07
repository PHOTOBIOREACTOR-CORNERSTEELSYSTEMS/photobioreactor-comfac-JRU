PBR MQTT Recorder for Render Background Worker

Purpose:
- Subscribes to MQTT topic: pbr/scs-comfac/scs-comfac-pbr-jul6-9x7k2m/unit01/sensors
- Saves each valid JSON reading into Supabase table: pbr_records

Required Render environment variables:
MQTT_URL=mqtt://test.mosquitto.org:1883
MQTT_TOPIC=pbr/scs-comfac/scs-comfac-pbr-jul6-9x7k2m/unit01/sensors
SUPABASE_URL=your Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY=your Supabase service_role key

Render settings:
Service type: Background Worker
Runtime: Node
Build command: npm install
Start command: npm start

Important:
- Keep the SUPABASE_SERVICE_ROLE_KEY only in Render environment variables.
- Never put the service_role key in Netlify dashboard JavaScript.
