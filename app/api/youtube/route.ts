import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.YOUTUBE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
	try {
		// Get channelId from query params
		const searchParams = request.nextUrl.searchParams;
		const channelId = searchParams.get('channelId');

		if (!channelId) {
			return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
		}

		// Check if channel exists
		const channel = await prisma.channel.findUnique({
			where: { id: channelId },
		});

		if (!channel) {
			return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
		}

		// Define required scopes
		const scopes = [
			'https://www.googleapis.com/auth/youtube.upload',
			'https://www.googleapis.com/auth/youtube.readonly',
			'https://www.googleapis.com/auth/userinfo.email',
			'https://www.googleapis.com/auth/userinfo.profile',
		];

		// Generate auth URL
		const url = oauth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: scopes,
			state: JSON.stringify({ channelId }), // Pass channelId in state
		});

		return NextResponse.json({ url });
	} catch (error) {
		console.error('Error generating auth URL:', error);
		return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
	}
}
