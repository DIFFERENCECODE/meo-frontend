// src/app/api/chat/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

// This is the main function that handles incoming POST requests from our frontend
export async function POST(request: Request) {
  try {
    // 1. Get the data from the frontend's request
    const body = await request.json();
    const { query, session_id } = body;

    // 2. Get the backend URL from our Vercel environment variables
    // Note: We are using MEO_API_URL, which is the correct name in our project
    const backendApiUrl = process.env.MEO_API_URL;

    if (!backendApiUrl) {
      console.error("MEO_API_URL environment variable is not set on Vercel.");
      throw new Error("Backend API URL is not configured on the server.");
    }

    console.log(`Proxying request for session ${session_id} to: ${backendApiUrl}/chat`);

    // 3. Forward the request to our real backend on EC2
    const backendResponse = await fetch(`${backendApiUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The body here perfectly matches what our FastAPI endpoint expects
      body: JSON.stringify({ message: query, session_id }),
    });

    // 4. Handle the response from the backend
    if (!backendResponse.ok) {
      // If the backend returned an error, forward it to the frontend
      const errorData = await backendResponse.json();
      console.error("Backend returned an error:", errorData);
      return NextResponse.json({ detail: errorData.detail || 'Error from backend service' }, { status: backendResponse.status });
    }

    // If successful, get the JSON data and send it back to the frontend
    const data = await backendResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    // This catches any other errors, like network issues
    console.error('An unexpected error occurred in the API route:', error);
    return NextResponse.json({ detail: 'An internal server error occurred in the proxy.' }, { status: 500 });
  }
}