// call from proxy api
export async function sendNotification(to: string, title: string, body: string) {
  try {
    const response = await fetch('/api/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, title, body }), // Send data to API
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send notification');
    }

    console.log('Notification sent successfully:', data);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}