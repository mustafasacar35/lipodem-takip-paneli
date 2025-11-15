// Vercel Serverless Function: send admin push notification via OneSignal

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { patientId, patientName, message } = req.body || {};

    if (!patientId || !message) {
      return res.status(400).json({ error: 'patientId ve message zorunludur' });
    }

    const APP_ID = process.env.ONESIGNAL_APP_ID;
    const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!APP_ID || !REST_API_KEY) {
      return res.status(500).json({ error: 'Sunucu yapılandırması eksik (ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY)'});
    }

    // Mesajı kısalt
    const shortMessage = String(message).slice(0, 50) + (message.length > 50 ? '...' : '');
    const displayName = patientName || `Hasta #${patientId}`;

    const payload = {
      app_id: APP_ID,
      
      // Sadece admin tag'ine sahip kullanıcılara gönder
      included_segments: ['All'],
      filters: [
        { field: 'tag', key: 'user_type', relation: '=', value: 'admin' }
      ],
      
      // Bildirim içeriği
      headings: { en: '💬 Yeni Hasta Mesajı' },
      contents: { en: `${displayName}: ${shortMessage}` },
      
      url: 'https://lipodem-takip-paneli.vercel.app/admin_chat.html',
      ios_sound: 'default',
      android_sound: 'default',
      
      // Data
      data: {
        type: 'patient_message',
        patient_id: patientId,
        patient_name: displayName,
        message_preview: shortMessage
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

    if (!resp.ok || result.errors) {
      return res.status(resp.status || 500).json({ error: 'OneSignal error', details: result });
    }

    return res.status(200).json({ 
      ok: true, 
      id: result.id, 
      recipients: result.recipients 
    });

  } catch (err) {
    console.error('send-admin-notification error', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err?.message });
  }
}
