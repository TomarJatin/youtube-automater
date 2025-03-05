import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import axios from 'axios';
import { Readable, PassThrough } from 'stream';

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.YOUTUBE_REDIRECT_URI
);

const youtube = google.youtube('v3');

export async function POST(
	req: Request,
	{ params }: { params: { id: string; videoId: string } }
) {
	try {
		const { videoUrl, title, description, tags, thumbnail, videoType } = await req.json();
        console.log("uploading video: ", videoUrl, title, description, tags, thumbnail, videoType);

		// Verify channel exists and is connected
		const channel = await prisma.channel.findUnique({
			where: { id: params.id },
			include: { connectedChannel: true },
		});

        console.log("uploading to channel: ", channel);

		if (!channel?.connectedChannel) {
			return NextResponse.json(
				{ error: 'Channel not found or not connected' },
				{ status: 404 }
			);
		}

		// Set up OAuth2 client with access token
		oauth2Client.setCredentials({
			access_token: channel.connectedChannel.accessToken,
		});

		// Download video from S3 with content length
		const videoResponse = await axios.get(videoUrl, {
			responseType: 'arraybuffer',
			headers: { 'Accept': 'video/mp4' }
		});
		const videoBuffer = Buffer.from(videoResponse.data);
		const videoStream = new PassThrough();
		videoStream.end(videoBuffer);

		// Download thumbnail with content length
		const thumbnailResponse = await axios.get(thumbnail, {
			responseType: 'arraybuffer',
			headers: { 'Accept': 'image/jpeg' }
		});
		const thumbnailBuffer = Buffer.from(thumbnailResponse.data);
		const thumbnailStream = new PassThrough();
		thumbnailStream.end(thumbnailBuffer);

		// Create a resumable upload session
		const response = await youtube.videos.insert({
			auth: oauth2Client,
			part: ['snippet', 'status'],
			requestBody: {
				snippet: {
					title,
					description,
					tags,
					categoryId: '22', // People & Blogs
				},
				status: {
					privacyStatus: 'private',
					selfDeclaredMadeForKids: false,
				},
			},
			media: {
				body: videoStream,
				mimeType: 'video/mp4'
			},
		});

		const videoId = response.data.id;
        console.log("video upload response: ", response.data);

		if (!videoId) {
			throw new Error('Failed to upload video');
		}

		// Upload thumbnail
		await youtube.thumbnails.set({
			auth: oauth2Client,
			videoId,
			media: {
				body: thumbnailStream,
				mimeType: 'image/jpeg'
			},
		});

		// If it's a Short, set the proper category and vertical metadata
		if (videoType === 'shorts') {
			await youtube.videos.update({
				auth: oauth2Client,
				part: ['status'],
				requestBody: {
					id: videoId,
					status: {
						selfDeclaredMadeForKids: false,
						madeForKids: false,
						license: 'youtube',
					},
				},
			});
		}

		// Update video in database
		await prisma.video.update({
			where: { id: params.videoId },
			data: {
				status: 'uploaded',
				uploadStatus: 'completed',
				uploadedUrl: `https://youtube.com/watch?v=${videoId}`,
			},
		});

		return NextResponse.json({
			success: true,
			youtubeUrl: `https://youtube.com/watch?v=${videoId}`,
		});
	} catch (error: any) {
		console.error('Error uploading video:', {
			error: error.message,
			code: error.code,
			details: error.response?.data || error.details,
			stack: error.stack
		});

		// Add more detailed error logging
		if (error.response?.data) {
			console.error('YouTube API Error Details:', error.response.data);
		}

		// Update video status to failed with error details
		await prisma.video.update({
			where: { id: params.videoId },
			data: {
				uploadStatus: 'failed',
				description: `Upload failed: ${error.message || 'Unknown error occurred during upload'}`
			},
		});

		return NextResponse.json(
			{ 
				error: 'Failed to upload video to YouTube',
				details: error.message || 'Unknown error occurred during upload'
			},
			{ status: 500 }
		);
	}
}
