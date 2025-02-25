import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI, { AzureOpenAI } from 'openai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

async function generateImage(prompt: string): Promise<string> {
	const response = await imageOpenai.images.generate({
		model: 'Dalle3',
		prompt,
		size: '1024x1024',
		quality: 'standard',
		n: 1,
	});

	const imageUrl = response.data[0].url;
	console.log(imageUrl);
	if (!imageUrl) throw new Error('Failed to generate image');

	// Download image and upload to S3
	const imageResponse = await fetch(imageUrl);
	const imageBuffer = await imageResponse.arrayBuffer();

	const key = `channel-images/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

	await s3Client.send(
		new PutObjectCommand({
			Bucket: process.env.AWS_BUCKET_NAME!,
			Key: key,
			Body: Buffer.from(imageBuffer),
			// ContentType: "image/png",
			ACL: 'public-read',
		})
	);

	const url = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;

	return url;
}

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { niche, name, description, generateAI } = body;

		let channelName = name;
		let channelDescription = description;

		if (generateAI) {
			const completionModel = new OpenAI({
				apiKey: '26ede18bf6524e29ac43a954d495b7fe',
				baseURL: 'https://playgroundbnd.openai.azure.com/openai/deployments/playground',
				defaultQuery: { 'api-version': '2024-08-01-preview' },
				defaultHeaders: { 'api-key': '26ede18bf6524e29ac43a954d495b7fe' },
			});
			// Generate channel name and description using OpenAI
			const completion = await completionModel.chat.completions.create({
				messages: [
					{
						role: 'system',
						content:
							'You are a YouTube channel naming expert. Respond only with a JSON object containing name and description keys.',
					},
					{
						role: 'user',
						content: `Generate a catchy YouTube channel name and description for a channel in the ${niche} niche. Respond with ONLY a JSON object in this exact format, no other text: {"name": "channel name", "description": "channel description"}`,
					},
				],
				model: 'playground',
			});

			// Safely parse the response with a fallback
			let response;
			try {
				const content = completion.choices[0].message.content?.trim() || '{}';
				response = JSON.parse(content);
			} catch (error) {
				console.error('Error parsing OpenAI response:', error);
				response = {
					name: `${niche} Channel`,
					description: `A channel about ${niche}`,
				};
			}
			channelName = response.name;
			channelDescription = response.description;
		}

		// Generate profile picture and banner using DALL-E
		const profilePicture = await generateImage(
			`Create a professional, modern YouTube channel profile picture for a ${niche} channel named "${channelName}". The image should be iconic and memorable.`
		);

		const banner = await generateImage(
			`Create a YouTube channel banner for a ${niche} channel named "${channelName}". The banner should be visually appealing and represent the channel's theme.`
		);

		// Create channel in database
		const channel = await prisma.channel.create({
			data: {
				niche,
				name: channelName,
				description: channelDescription,
				profilePicture,
				banner,
			},
		});

		return NextResponse.json(channel);
	} catch (error) {
		console.error('Error creating channel:', error);
		return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
	}
}

export async function GET() {
	try {
		const channels = await prisma.channel.findMany({
			include: {
				connectedChannel: true,
				competitors: true,
				videos: true,
			},
		});

		return NextResponse.json(channels);
	} catch (error) {
		console.error('Error fetching channels:', error);
		return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
	}
}
