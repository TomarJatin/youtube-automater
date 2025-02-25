import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';

const oauth2Client = new google.auth.OAuth2(
	process.env.YOUTUBE_CLIENT_ID,
	process.env.YOUTUBE_CLIENT_SECRET,
	`${process.env.NEXTAUTH_URL}/api/auth/youtube/callback`
);

// Scopes required for YouTube Data API
const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload'];

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const channelId = searchParams.get('channelId');

		if (!channelId) {
			return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
		}

		// Generate OAuth URL
		const authUrl = oauth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: SCOPES,
			state: channelId, // Pass channelId as state to retrieve it in callback
		});

		return NextResponse.json({ url: authUrl });
	} catch (error) {
		console.error('Error generating auth URL:', error);
		return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
	}
}
