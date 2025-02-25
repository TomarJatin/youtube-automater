import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI,
);

export async function GET(request: NextRequest) {
  try {
    console.log("hitting youtube callback...");
    // Get code and state from query params
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/error?message=Invalid authorization response`);
    }

    // Get channelId from state
    const { channelId } = JSON.parse(state);

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const { data } = await oauth2.userinfo.get();

    // Update or create ConnectedChannel
    await prisma.connectedChannel.upsert({
      where: { channelId },
      create: {
        channelId,
        avatarUrl: data.picture || '',
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: new Date(tokens.expiry_date!),
        status: 'connected',
      },
      update: {
        avatarUrl: data.picture || '',
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: new Date(tokens.expiry_date!),
        status: 'connected',
      },
    });

    // Redirect back to home page with success parameter
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}?success=true`);
  } catch (error) {
    console.error('Error in YouTube callback:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const errorMessage = encodeURIComponent('Failed to connect YouTube account');
    return NextResponse.redirect(`${baseUrl}?error=${errorMessage}`);
  }
}
