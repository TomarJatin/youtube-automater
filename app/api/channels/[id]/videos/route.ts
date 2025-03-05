import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI, { AzureOpenAI } from 'openai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
import {
	VideoApiRequest,
	CompetitorVideo,
	VideoIdea,
	isGenerateIdeasRequest,
	isCreateVideoRequest,
	isGenerateImageRequest,
	isGenerateVoiceoverRequest,
	isFinalizeVideoRequest,
	isGeneratePromptsRequest,
} from '@/types/video';

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

async function generateVideoIdeas(channelId: string, competitorVideos: CompetitorVideo[]): Promise<VideoIdea[]> {
	const existingVideos = await prisma.video.findMany({
		where: { channelId },
		select: { title: true },
	});

	console.log('existingVideos', existingVideos);
	console.log('competitorVideos', competitorVideos);

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
					existingVideos.map((v) => v.title)
				)}, generate 10 unique video ideas. Format the response as a JSON array of objects with 'title' and 'idea' properties. Before sending response make sure you are providing proper json format only. Also make sure you only provide the json response otherwise I will get error because I am only expecting a json response for example:
        
        [
  {
    "title": "Unseen Artifacts: Mysteries from Ancient Civilizations",
    "idea": "Explore rare and lesser-known artifacts from ancient civilizations, discussing their historical significance and the mysteries they hold."
  },
  {
    "title": "Forgotten Battles: Turning Points of History",
    "idea": "Highlight pivotal but often forgotten battles that changed the course of history, analyzing their impact and the strategies used."
  },
  {
    "title": "The Rise and Fall of Lost Kingdoms",
    "idea": "Investigate ancient kingdoms that once ruled vast territories but have since faded into obscurity, revealing their achievements and downfalls."
  },
  {
    "title": "Inventors Ahead of Their Time",
    "idea": "Chronicle the lives and breakthroughs of historical inventors whose ideas were centuries ahead of their time."
  },
  {
    "title": "Unsolved Mysteries of Monumental Architecture",
    "idea": "Delve into the construction techniques, purpose, and enigmas of monumental historical structures like the Great Pyramids, Stonehenge, and more."
  },
  {
    "title": "Historic Figures Who Vanished Without a Trace",
    "idea": "Investigate the mysterious disappearances of significant historical figures and the theories that surround their vanishing."
  },
]`,
			},
		],
		model: 'gpt-4',
	});

	console.log('video ideas...', completion.choices[0].message.content);

	return JSON.parse(completion.choices[0].message.content || '[]');
}

async function generateScript(title: string, idea: string, videoType: 'shorts' | 'long'): Promise<string> {
	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: 'You are a professional YouTube script writer.',
			},
			{
				role: 'user',
				content: `Write a ${videoType === 'shorts' ? 'concise script (25 seconds when spoken)' : 'detailed script'} for a YouTube ${videoType === 'shorts' ? 'Short' : 'video'} titled "${title}" with this idea: "${idea}". ${
					videoType === 'shorts'
						? 'Keep it extremely concise, engaging, and suitable for vertical short-form video. The script should be speakable within 25 seconds to allow for transitions.'
						: 'Structure the script in clear sections separated by double newlines.'
				}`,
			},
		],
		model: 'gpt-4',
	});

	return completion.choices[0].message.content || '';
}

async function generateImagePrompts(script: string, singlePrompt: boolean = false): Promise<string[]> {
	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: 'You are an expert at creating detailed image prompts for AI image generation. Create prompts that will result in high-quality, visually appealing images that match the script sections.'
			},
			{
				role: 'user',
				content: singlePrompt 
					? `Generate 1 detailed image prompt based on this script: "${script}". The prompt should be descriptive and specific, focusing on visual elements that would make a compelling video content. Format the response as a JSON array with a single string. Make sure the prompt is detailed enough to generate a high-quality image.`
					: `Generate 4 detailed image prompts based on this script: "${script}". Each prompt should be descriptive and specific, focusing on visual elements that would make compelling video content. Format the response as a JSON array of strings, with each string being a complete image prompt. Make sure each prompt is detailed enough to generate a high-quality image.`
			},
		],
		model: 'gpt-4',
	});

	const prompts = JSON.parse(completion.choices[0].message.content || '[]');
	return prompts;
}

async function generateImage(prompt: string): Promise<string> {
	const response = await imageOpenai.images.generate({
		model: 'Dalle3',
		prompt,
		size: '1024x1024',
		quality: 'standard',
		n: 1,
	});

	const imageUrl = response.data[0].url;
	if (!imageUrl) throw new Error('Failed to generate image');

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

	return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

async function generateVoiceover(text: string): Promise<string> {
	try {
		// Use environment variable for API key instead of hardcoding
		const apiKey = process.env.ELEVENLABS_API_KEY || 'sk_540872f6e2e1a64ba6444148db1452c90090a66e7fc42354';
		
		console.log("Calling ElevenLabs API with text length:", text.length);
		
		const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'xi-api-key': apiKey
			},
			body: JSON.stringify({
				text: text,
				model_id: "eleven_monolingual_v1",
				voice_settings: {
					stability: 0.5,
					similarity_boost: 0.75
				}
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`ElevenLabs API error (${response.status}): ${errorText}`);
			throw new Error(`ElevenLabs API error: ${response.statusText} (${response.status})`);
		}

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

		return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
	} catch (error) {
		console.error('Error generating voiceover:', error);
		throw error;
	}
}

// Add new function to upload music track to S3
async function uploadMusicTrack(file: Buffer, contentType: string): Promise<string> {
	try {
		const key = `music/${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;

		await s3Client.send(
			new PutObjectCommand({
				Bucket: process.env.AWS_BUCKET_NAME!,
				Key: key,
				Body: file,
				ContentType: contentType,
				ACL: 'public-read',
			})
		);

		return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
	} catch (error) {
		console.error('Error uploading music track:', error);
		throw error;
	}
}

// Add new function to create subtitle file
async function createSubtitleFile(text: string, voiceoverPath: string, outputPath: string): Promise<string> {
	try {
		// Get audio duration
		const { stdout: durationStr } = await execAsync(
			`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${voiceoverPath}"`
		);
		const totalDuration = parseFloat(durationStr);
		
		// Split text into words
		const words = text.split(/\s+/);
		const wordDuration = totalDuration / words.length;
		
		// Create SRT subtitle file
		let srtContent = '';
		words.forEach((word, index) => {
			const startTime = index * wordDuration;
			const endTime = (index + 1) * wordDuration;
			
			// Format time as HH:MM:SS,mmm
			const formatTime = (time: number) => {
				const hours = Math.floor(time / 3600);
				const minutes = Math.floor((time % 3600) / 60);
				const seconds = Math.floor(time % 60);
				const milliseconds = Math.floor((time % 1) * 1000);
				
				return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
			};
			
			srtContent += `${index + 1}\n`;
			srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
			srtContent += `${word}\n\n`;
		});
		
		await fs.promises.writeFile(outputPath, srtContent);
		return outputPath;
	} catch (error) {
		console.error('Error creating subtitle file:', error);
		throw error;
	}
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
	try {
		console.log('calling video api', params);
		const body = (await req.json()) as VideoApiRequest;
		const { searchParams } = new URL(req.url);
		const videoId = searchParams.get('videoId');

		// Generate video ideas
		if (isGenerateIdeasRequest(body)) {
			console.log('calling generate video ideas', videoId);
			// Validate channelId
			if (!params.id || typeof params.id !== 'string' || params.id.length !== 24) {
				return NextResponse.json({ error: 'Invalid channel ID format' }, { status: 400 });
			}

			// Verify channel exists
			const channel = await prisma.channel.findUnique({
				where: { id: params.id },
			});

			if (!channel) {
				return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
			}

			const ideas = await generateVideoIdeas(params.id, body.competitorVideos);
			console.log('ideas', ideas);
			return NextResponse.json(ideas);
		}

		// Create new video with selected idea or update existing video with script
		if (isCreateVideoRequest(body)) {
			// Validate channelId
			if (!params.id || typeof params.id !== 'string' || params.id.length !== 24) {
				return NextResponse.json({ error: 'Invalid channel ID format' }, { status: 400 });
			}

			// Verify channel exists
			const channel = await prisma.channel.findUnique({
				where: { id: params.id },
			});

			if (!channel) {
				return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
			}

			// Check if videoId is provided in query params
			const { searchParams } = new URL(req.url);
			const videoId = searchParams.get('videoId');

			if (videoId) {
				// If videoId exists, update the existing video with the script
				const script = await generateScript(body.selectedIdea.title, body.selectedIdea.idea, body.videoType || 'long');

				const updatedVideo = await prisma.video.update({
					where: { id: videoId },
					data: { script },
				});

				return NextResponse.json(updatedVideo);
			} else {
				// If no videoId, create a new video
				const video = await prisma.video.create({
					data: {
						channelId: params.id,
						title: body.selectedIdea.title,
						idea: body.selectedIdea.idea,
						status: 'in_progress',
						images: [],
						voiceovers: [],
					},
				});

				return NextResponse.json(video);
			}
		}

		// Generate image prompts
		if (isGeneratePromptsRequest(body)) {
			console.log('generating image prompts for script:', body.script);
			const prompts = await generateImagePrompts(body.script, body.singlePrompt);
			return NextResponse.json({ prompts });
		}

		// Generate single image
		if (isGenerateImageRequest(body)) {
			console.log('calling generate image', body.script);
			const imageUrl = await generateImage(body.script);
			return NextResponse.json({ imageUrl });
		}

		// Generate single voiceover
		if (isGenerateVoiceoverRequest(body)) {
			const voiceoverUrl = await generateVoiceover(body.script);
			return NextResponse.json({ voiceoverUrl });
		}

		// Finalize video
		if (isFinalizeVideoRequest(body)) {
			try {
				// Create temporary directory
				console.log("generating videos...", body);
				const tempDir = path.join(os.tmpdir(), `video-${Date.now()}`);
				await fs.promises.mkdir(tempDir, { recursive: true });

				// Download all assets
				console.log('Processing images array:', body.images);
				const imageFiles = await Promise.all(
					body.images.map(async (url, i) => {
						console.log(`Processing image ${i}:`, url);
						const response = await fetch(url);
						const buffer = await response.arrayBuffer();
						const filePath = path.join(tempDir, `image-${i}.png`);
						await fs.promises.writeFile(filePath, Buffer.from(buffer));
						console.log(`Saved image ${i} to:`, filePath);
						return filePath;
					})
				);
				console.log('Downloaded image files:', imageFiles);

				console.log('Processing voiceovers array:', body.voiceovers);
				const voiceoverFiles = await Promise.all(
					body.voiceovers.map(async (url, i) => {
						console.log(`Processing voiceover ${i}:`, url);
						const response = await fetch(url);
						const buffer = await response.arrayBuffer();
						const filePath = path.join(tempDir, `voiceover-${i}.mp3`);
						await fs.promises.writeFile(filePath, Buffer.from(buffer));
						console.log(`Saved voiceover ${i} to:`, filePath);
						return filePath;
					})
				);
				console.log('Downloaded voiceover files:', voiceoverFiles);

				// Download background music if provided
				let musicPath = '';
				if (body.music) {
					const response = await fetch(body.music);
					const buffer = await response.arrayBuffer();
					musicPath = path.join(tempDir, 'background-music.mp3');
					await fs.promises.writeFile(musicPath, Buffer.from(buffer));
				}

				// Generate video segments
				console.log('Starting video segment generation');
				console.log('Number of images:', imageFiles.length);

				// Get total duration from voiceover
				const { stdout: voiceoverDurationStr } = await execAsync(
					`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${voiceoverFiles[0]}"`
				);
				const voiceoverDuration = parseFloat(voiceoverDurationStr);
				const durationPerImage = voiceoverDuration / imageFiles.length;
				console.log(`Duration per image: ${durationPerImage} seconds`);

				// Process segments sequentially to ensure proper ordering
				const segmentFiles = [];
				for (let i = 0; i < imageFiles.length; i++) {
					console.log(`\nProcessing segment ${i + 1} of ${imageFiles.length}`);
					const outputPath = path.join(tempDir, `segment-${i}.mp4`);
					const imagePath = imageFiles[i];
						
					try {
						console.log(`Processing image: ${imagePath}`);

						const frames = Math.floor(durationPerImage * 30); // 30fps

						// Create more effective animations while maintaining vertical orientation
						const animations = [
							// Simple zoom in
							`scale=1080:1920,zoompan=z='if(lte(zoom,1.5),zoom+0.002,zoom)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:fps=30`,
							
							// Simple zoom out
							`scale=1080:1920,zoompan=z='if(gte(zoom,1.0),zoom-0.002,zoom)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:fps=30`,
							
							// Simple pan up
							`scale=1080:1920,zoompan=z=1.2:x='iw/2-(iw/zoom/2)':y='if(lte(n,${frames}),n/8,n/8)':d=${frames}:fps=30`,
							
							// Simple pan down
							`scale=1080:1920,zoompan=z=1.2:x='iw/2-(iw/zoom/2)':y='if(lte(n,${frames}),${frames}/8-n/8,0)':d=${frames}:fps=30`,
							
							// Simple pan left to right
							`scale=1080:1920,zoompan=z=1.2:x='if(lte(n,${frames}),n/8,n/8)':y='ih/2-(ih/zoom/2)':d=${frames}:fps=30`,
							
							// Simple pan right to left
							`scale=1080:1920,zoompan=z=1.2:x='if(lte(n,${frames}),${frames}/8-n/8,0)':y='ih/2-(ih/zoom/2)':d=${frames}:fps=30`
						];
						
						// Select a random animation
						const randomAnimation = animations[1];
						console.log("Random animation:", randomAnimation);
						
						// Create segment with image and animation only
						await execAsync(
							`ffmpeg -loop 1 -i "${imagePath}" -c:v libx264 ` +
							`-t ${durationPerImage} -vf "${randomAnimation}" ` +
							`-pix_fmt yuv420p "${outputPath}"`
						);

						segmentFiles.push(outputPath);
						console.log(`Successfully generated segment ${i + 1}`);
					} catch (error) {
						console.error(`Error generating segment ${i + 1}:`, error);
						throw error; // Stop processing if any segment fails
					}
				}

				// Filter out any null segments and create transition videos between valid segments
				const validSegmentFiles = segmentFiles.filter((file): file is string => file !== null);
				console.log('Valid segment files:', validSegmentFiles);
				const transitionFiles = [];
				
				for (let i = 0; i < validSegmentFiles.length - 1; i++) {
					const transitionPath = path.join(tempDir, `transition-${i}.mp4`);
					
					try {
						// Get first frame of next segment
						const nextSegmentFirstFrame = path.join(tempDir, `next-segment-${i}-first-frame.png`);
						await execAsync(`ffmpeg -i "${validSegmentFiles[i+1]}" -vframes 1 "${nextSegmentFirstFrame}"`);
						
						// Get last frame of current segment
						const currentSegmentLastFrame = path.join(tempDir, `current-segment-${i}-last-frame.png`);
						await execAsync(`ffmpeg -sseof -0.1 -i "${validSegmentFiles[i]}" -update 1 -q:v 1 "${currentSegmentLastFrame}"`);
						
						// Create 0.5 second crossfade transition
						await execAsync(
							`ffmpeg -loop 1 -t 0.5 -i "${currentSegmentLastFrame}" -loop 1 -t 0.5 -i "${nextSegmentFirstFrame}" ` +
							`-filter_complex "xfade=transition=fade:duration=0.5:offset=0,scale=1080:1920" ` +
							`-c:v libx264 -pix_fmt yuv420p "${transitionPath}"`
						);
						
						transitionFiles.push(transitionPath);
					} catch (error) {
						console.error(`Error creating transition ${i}:`, error);
						continue;
					}
				}

				// Create a new list file that includes transitions
				const listFile = path.join(tempDir, 'segments.txt');
				let fileContent = `file '${validSegmentFiles[0]}'\n`;
				for (let i = 0; i < transitionFiles.length; i++) {
					if (transitionFiles[i] && validSegmentFiles[i+1]) {
						fileContent += `file '${transitionFiles[i]}'\n`;
						fileContent += `file '${validSegmentFiles[i+1]}'\n`;
					}
				}
				await fs.promises.writeFile(listFile, fileContent);

				// Concatenate video segments
				const concatenatedVideoPath = path.join(tempDir, 'concatenated.mp4');
				await execAsync(`ffmpeg -f concat -safe 0 -i "${listFile}" -c copy "${concatenatedVideoPath}"`);

				// Create subtitle file
				const subtitlePath = path.join(tempDir, 'subtitles.srt');
				await createSubtitleFile(body.cleanScript, voiceoverFiles[0], subtitlePath);

				// Add voiceover and subtitles to the video
				const withVoiceoverPath = path.join(tempDir, 'with-voiceover.mp4');
				// Adjust subtitle styling based on video type
				const subtitleStyle = body.videoType === 'shorts' 
					? 'Fontsize=28,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=40'  // Larger text for shorts
					: 'Fontsize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=30'; // Standard size for long videos

				// Escape the subtitle path for ffmpeg
				const escapedSubtitlePath = subtitlePath.replace(/'/g, "'\\''");

				await execAsync(
					`ffmpeg -i "${concatenatedVideoPath}" -i "${voiceoverFiles[0]}" -vf "subtitles='${escapedSubtitlePath}':force_style='${subtitleStyle}'" ` +
					`-c:a aac -strict experimental "${withVoiceoverPath}"`
				);

				// Final video path
				const finalVideoPath = path.join(tempDir, 'final.mp4');

				// Add background music if provided
				if (musicPath) {
					await execAsync(
						`ffmpeg -i "${withVoiceoverPath}" -i "${musicPath}" -filter_complex ` +
						`"[1:a]volume=0.2,aloop=loop=-1:size=0,atrim=0:${voiceoverDuration}[a1];` +
						`[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]" ` +
						`-map 0:v -map "[aout]" -c:v copy -c:a aac -strict experimental "${finalVideoPath}"`
					);
				} else {
					await fs.promises.copyFile(withVoiceoverPath, finalVideoPath);
				}

				// Upload to S3
				const videoBuffer = await fs.promises.readFile(finalVideoPath);
				const key = `videos/${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;

				await s3Client.send(
					new PutObjectCommand({
						Bucket: process.env.AWS_BUCKET_NAME!,
						Key: key,
						Body: videoBuffer,
						ContentType: 'video/mp4',
						ACL: 'public-read',
					})
				);

				const videoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;

				console.log('generated video ...', videoUrl);

				// Only update the database if this is not a preview
				if (body.status === 'completed') {
					// Update video in database
					const updatedVideo = await prisma.video.update({
						where: { id: videoId! },
						data: {
							script: body.script,
							images: body.images,
							voiceovers: body.voiceovers,
							music: body.music,
							status: body.status,
							videoUrl: videoUrl,
						},
					});
				}

				// Cleanup
				await fs.promises.rm(tempDir, { recursive: true, force: true });

				return NextResponse.json({
					videoUrl,
					cleanScript: body.cleanScript,
					videoType: body.videoType,
				});
			} catch (error) {
				console.error('Error generating video:', error);
				throw error;
			}
		}

		// Update existing video
		if (videoId) {
			const updatedVideo = await prisma.video.update({
				where: { id: videoId },
				data: {
					...(body.script && { script: body.script }),
					...(body.images && { images: body.images }),
					...(body.voiceovers && { voiceovers: body.voiceovers }),
					...(body.music && { music: body.music }),
					...(body.status && { status: body.status }),
				},
			});
			return NextResponse.json(updatedVideo);
		}

		throw new Error('Invalid request');
	} catch (error) {
		console.error('Error processing video:', error);
		return NextResponse.json({ error: 'Failed to process video' }, { status: 500 });
	}
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
	try {
		// Validate channelId
		if (!params.id || typeof params.id !== 'string' || params.id.length !== 24) {
			return NextResponse.json({ error: 'Invalid channel ID format' }, { status: 400 });
		}

		// Verify channel exists
		const channel = await prisma.channel.findUnique({
			where: { id: params.id },
		});

		if (!channel) {
			return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
		}

		const videos = await prisma.video.findMany({
			where: {
				channelId: params.id,
			},
			orderBy: {
				createdAt: 'desc',
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
		// Validate channelId
		if (!params.id || typeof params.id !== 'string' || params.id.length !== 24) {
			return NextResponse.json({ error: 'Invalid channel ID format' }, { status: 400 });
		}

		const { searchParams } = new URL(req.url);
		const videoId = searchParams.get('videoId');

		// Validate videoId
		if (!videoId || typeof videoId !== 'string' || videoId.length !== 24) {
			return NextResponse.json({ error: 'Invalid video ID format' }, { status: 400 });
		}

		// Verify channel exists
		const channel = await prisma.channel.findUnique({
			where: { id: params.id },
		});

		if (!channel) {
			return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
		}

		// Verify video exists and belongs to the channel
		const video = await prisma.video.findFirst({
			where: {
				id: videoId,
				channelId: params.id,
			},
		});

		if (!video) {
			return NextResponse.json({ error: 'Video not found or does not belong to this channel' }, { status: 404 });
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
