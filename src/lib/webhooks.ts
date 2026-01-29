// Webhook utility functions

const WEBHOOK_URL = 'https://petzap-n8n.slfjaq.easypanel.host/webhook/create';

export interface WebhookPayload {
  action: 'create';
  pet_name: string;
  service: string;
  start_date: string;
  end_date: string;
  client_name: string;
}

export const sendCreateWebhook = async (payload: WebhookPayload): Promise<boolean> => {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Webhook failed:', response.status, response.statusText);
      return false;
    }

    console.log('Webhook sent successfully:', payload);
    return true;
  } catch (error) {
    console.error('Webhook error:', error);
    return false;
  }
};
