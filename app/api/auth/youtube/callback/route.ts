import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';

const oauth2Client = new google.auth.OAuth2(
	process.env.YOUTUBE_CLIENT_ID,
	process.env.YOUTUBE_CLIENT_SECRET,
	`${process.env.NEXTAUTH_URL}/api/auth/youtube/callback`
);

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const code = searchParams.get('code');
		const state = searchParams.get('state'); // This contains the channelId

		if (!code || !state) {
			return NextResponse.redirect('/error?message=Invalid authorization');
		}

		// Exchange code for tokens
		const { tokens } = await oauth2Client.getToken(code);
		oauth2Client.setCredentials(tokens);

		// Get YouTube channel info
		const youtube = google.youtube('v3');
		const response = await youtube.channels.list({
			auth: oauth2Client,
			part: ['snippet'],
			mine: true,
		});

		const youtubeChannel = response.data.items?.[0];
		if (!youtubeChannel) {
			return NextResponse.redirect('/error?message=No YouTube channel found');
		}

		// Save or update connected channel
		await prisma.connectedChannel.upsert({
			where: {
				channelId: state,
			},
			create: {
				channelId: state,
				avatarUrl: youtubeChannel.snippet?.thumbnails?.default?.url || '',
				accessToken: tokens.access_token!,
				refreshToken: tokens.refresh_token!,
				expiresAt: new Date(Date.now() + (tokens.expiry_date || 3600000)),
				status: 'connected',
			},
			update: {
				avatarUrl: youtubeChannel.snippet?.thumbnails?.default?.url || '',
				accessToken: tokens.access_token!,
				refreshToken: tokens.refresh_token!,
				expiresAt: new Date(Date.now() + (tokens.expiry_date || 3600000)),
				status: 'connected',
			},
		});

		return NextResponse.redirect('/');
	} catch (error) {
		console.error('Error in YouTube callback:', error);
		return NextResponse.redirect('/error?message=Failed to connect YouTube account');
	}
}
