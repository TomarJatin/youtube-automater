import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI, { AzureOpenAI } from 'openai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const openai = new OpenAI({
	apiKey: '26ede18bf6524e29ac43a954d495b7fe',
	baseURL: 'https://playgroundbnd.openai.azure.com/openai/deployments/playground',
	defaultQuery: { 'api-version': '2024-08-01-preview' },
	defaultHeaders: { 'api-key': '26ede18bf6524e29ac43a954d495b7fe' },
});

const imageOpenai = new AzureOpenAI({
	apiVersion: '2024-05-01-preview',
	endpoint: 'https://bindle-prod.openai.azure.com/',
	apiKey: process.env.AZURE_OPENAI_API_KEY,
});

const s3Client = new S3Client({
	region: process.env.AWS_REGION!,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

async function generateVideoIdeas(channelId: string, competitorVideos: any[]) {
	const existingVideos = await prisma.video.findMany({
		where: { channelId },
		select: { title: true },
	});

	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: 'You are a YouTube content strategy expert.',
			},
			{
				role: 'user',
				content: `Based on these competitor videos: ${JSON.stringify(
					competitorVideos
				)} and avoiding these existing video titles: ${JSON.stringify(
					existingVideos.map((v: { title: string }) => v.title)
				)}, generate 10 unique video ideas. Format the response as a JSON array of objects with 'title' and 'idea' properties.`,
			},
		],
		model: 'gpt-4',
	});

	return JSON.parse(completion.choices[0].message.content || '[]');
}

async function generateScript(title: string, idea: string) {
	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: 'You are a professional YouTube script writer.',
			},
			{
				role: 'user',
				content: `Write a detailed script for a YouTube video titled "${title}" with this idea: "${idea}". Structure the script in clear sections.`,
			},
		],
		model: 'gpt-4',
	});

	return completion.choices[0].message.content || '';
}

async function generateImages(script: string): Promise<string[]> {
	const sections = script.split('\n\n');
	const imagePrompts = sections.map((section) => `Create a visual representation for this script section: ${section}`);

	const imageUrls: string[] = [];

	for (const prompt of imagePrompts) {
		const response = await imageOpenai.images.generate({
			model: 'Dalle3',
			prompt,
			size: '1024x1024',
			quality: 'standard',
			n: 1,
		});

		const imageUrl = response.data[0].url;
		if (!imageUrl) continue;

		const imageResponse = await fetch(imageUrl);
		const imageBuffer = await imageResponse.arrayBuffer();

		const key = `video-images/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

		await s3Client.send(
			new PutObjectCommand({
				Bucket: process.env.AWS_BUCKET_NAME!,
				Key: key,
				Body: Buffer.from(imageBuffer),
				ContentType: 'image/png',
				ACL: 'public-read',
			})
		);

		const url = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;

		imageUrls.push(url);
	}

	return imageUrls;
}

async function generateVoiceovers(script: string): Promise<string[]> {
	const sections = script.split('\n\n');
	const voiceoverUrls: string[] = [];

	for (const section of sections) {
		const response = await openai.audio.speech.create({
			model: 'tts-1',
			voice: 'alloy',
			input: section,
		});

		const audioBuffer = await response.arrayBuffer();
		const key = `voiceovers/${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;

		await s3Client.send(
			new PutObjectCommand({
				Bucket: process.env.AWS_BUCKET_NAME!,
				Key: key,
				Body: Buffer.from(audioBuffer),
				ContentType: 'audio/mpeg',
				ACL: 'public-read',
			})
		);

		//
		const url = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;

		voiceoverUrls.push(url);
	}

	return voiceoverUrls;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
	try {
		const body = await req.json();
		const { competitorVideos, selectedIdea } = body;

		if (selectedIdea) {
			// Create video with selected idea
			const script = await generateScript(selectedIdea.title, selectedIdea.idea);
			const images = await generateImages(script);
			const voiceovers = await generateVoiceovers(script);

			const video = await prisma.video.create({
				data: {
					channelId: params.id,
					title: selectedIdea.title,
					idea: selectedIdea.idea,
					script,
					images,
					voiceovers,
					status: 'in_progress',
				},
			});

			return NextResponse.json(video);
		} else {
			// Generate video ideas
			const ideas = await generateVideoIdeas(params.id, competitorVideos);
			return NextResponse.json(ideas);
		}
	} catch (error) {
		console.error('Error processing video:', error);
		return NextResponse.json({ error: 'Failed to process video' }, { status: 500 });
	}
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
	try {
		const videos = await prisma.video.findMany({
			where: {
				channelId: params.id,
			},
		});

		return NextResponse.json(videos);
	} catch (error) {
		console.error('Error fetching videos:', error);
		return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
	}
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	try {
		const { searchParams } = new URL(req.url);
		const videoId = searchParams.get('videoId');

		if (!videoId) {
			return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
		}

		await prisma.video.delete({
			where: {
				id: videoId,
			},
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting video:', error);
		return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
	}
}
