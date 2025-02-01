import { NextResponse } from "next/server";

// send notifications
export async function POST(request: Request) {
  try {
    const { to, title, body } = await request.json();
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer 9xfQPSNmbJcokgRyvrsgXgW5EdpV8kgGT4lFMDQU`,
      },
      body: JSON.stringify({
        to, // Directly insert the token
        "sound": "default",
        title, // Directly insert the title
        body, // Directly insert the body
      }),
    });

    const data = await response.json();
    if (data.errors) {
      throw new Error("Error sending push notification: " + JSON.stringify(data.errors));
    }
    return new NextResponse(JSON.stringify(data), { status: 200 });
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
