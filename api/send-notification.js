// Vercel Serverless Function: send patient push notification via OneSignal

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { patientId, message, title, data } = req.body || {};

    if (!patientId || !message) {
      return res.status(400).json({ error: 'patientId ve message zorunludur' });
    }

    const APP_ID = process.env.ONESIGNAL_APP_ID;
    const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!APP_ID || !REST_API_KEY) {
      return res.status(500).json({ error: 'Sunucu yapılandırması eksik (ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY)'});
    }

    const payload = {
      app_id: APP_ID,
      include_external_user_ids: [String(patientId)],
      channel_for_external_user_ids: 'push',
      headings: { en: title || '💬 Yeni Mesaj' },
      contents: { en: String(message).slice(0, 200) },
      url: 'https://lipodem-takip-paneli.vercel.app/patient_nutrition.html',
      ios_sound: 'default',
      android_sound: 'default',
      data: {
        type: 'chat_message',
        patient_id: patientId,
        ...data
      }
    };

    const resp = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${REST_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const result = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'OneSignal error', details: result });
    }

    return res.status(200).json({ ok: true, id: result.id, recipients: result.recipients });

  } catch (err) {
    console.error('send-notification error', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err?.message });
  }
}
