import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import axios from 'axios';
import { Readable, PassThrough } from 'stream';
import sharp from 'sharp';

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

		// Download video from S3
		const videoResponse = await axios.get(videoUrl, {
			responseType: 'arraybuffer',
			headers: { 'Accept': 'video/mp4' }
		});
		const videoBuffer = Buffer.from(videoResponse.data);

		// Initialize resumable upload session
		const initializeResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${channel.connectedChannel.accessToken}`,
				'Content-Type': 'application/json',
				'X-Upload-Content-Type': 'video/mp4',
				'X-Upload-Content-Length': videoBuffer.length.toString(),
			},
			body: JSON.stringify({
				snippet: {
					title,
					description,
					tags,
					categoryId: '22', // People & Blogs
				},
				status: {
					privacyStatus: 'public',
					selfDeclaredMadeForKids: false,
				},
			}),
		});

		if (!initializeResponse.ok) {
			throw new Error(`Failed to initialize upload: ${await initializeResponse.text()}`);
		}

		// Get the resumable upload URL
		const uploadUrl = initializeResponse.headers.get('location');
		if (!uploadUrl) {
			throw new Error('No upload URL received');
		}

		// Perform the actual upload
		const uploadResponse = await fetch(uploadUrl, {
			method: 'PUT',
			headers: {
				'Content-Type': 'video/mp4',
				'Content-Length': videoBuffer.length.toString(),
			},
			body: videoBuffer,
		});

		if (!uploadResponse.ok) {
			throw new Error(`Upload failed: ${await uploadResponse.text()}`);
		}

		const uploadResult = await uploadResponse.json();
		const videoId = uploadResult.id;
		console.log("uploadResult", uploadResult);

		if (!videoId) {
			throw new Error('Failed to get video ID from upload response');
		}

		console.log("Video upload successful, ID:", videoId);

		// Upload thumbnail if provided
		if (thumbnail) {
			console.log("Uploading thumbnail...");
			const thumbnailResponse = await axios.get(thumbnail, {
				responseType: 'arraybuffer',
				headers: { 'Accept': 'image/jpeg' }
			});
			
			// Resize and optimize the thumbnail
			const resizedThumbnailBuffer = await sharp(Buffer.from(thumbnailResponse.data))
				.resize(1280, 720, { // YouTube thumbnail dimensions
					fit: 'contain',
					background: { r: 255, g: 255, b: 255, alpha: 1 }
				})
				.jpeg({
					quality: 80, // Adjust quality to meet size requirements
					progressive: true
				})
				.toBuffer();

			// Check if the resized image is still too large
			if (resizedThumbnailBuffer.length > 2000000) { // Leave some buffer below 2MB
				console.log("Thumbnail still too large, reducing quality further");
				// Try again with lower quality
				const furtherResizedThumbnailBuffer = await sharp(Buffer.from(thumbnailResponse.data))
					.resize(1280, 720, {
						fit: 'contain',
						background: { r: 255, g: 255, b: 255, alpha: 1 }
					})
					.jpeg({
						quality: 60,
						progressive: true
					})
					.toBuffer();
				
				if (furtherResizedThumbnailBuffer.length > 2000000) {
					console.log("Skipping thumbnail upload - image too large even after compression");
					// Skip thumbnail upload if still too large
					return;
				}
			}

			const thumbnailStream = new PassThrough();
			thumbnailStream.end(resizedThumbnailBuffer);

			await youtube.thumbnails.set({
				auth: oauth2Client,
				videoId,
				media: {
					body: thumbnailStream,
					mimeType: 'image/jpeg'
				},
			});

			console.log("Thumbnail uploaded successfully");
		}

		// If it's a Short, set the proper category and metadata
		if (videoType === 'shorts') {
			console.log("Setting category and metadata for Short...");
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
			console.log("Category and metadata set successfully");
		}

		console.log("Updating video status in database...");

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

		if (error.response?.data) {
			console.error('YouTube API Error Details:', error.response.data);
		}

		// Update video status to failed
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
