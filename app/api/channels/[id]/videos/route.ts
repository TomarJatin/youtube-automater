import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI, { AzureOpenAI } from 'openai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  VideoApiRequest,
  CompetitorVideo,
  VideoIdea,
  isGenerateIdeasRequest,
  isCreateVideoRequest,
  isGenerateImageRequest,
  isGenerateVoiceoverRequest,
  isFinalizeVideoRequest,
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

  console.log("existingVideos", existingVideos);
  console.log("competitorVideos", competitorVideos);

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

  console.log("video ideas...", completion.choices[0].message.content );

  return JSON.parse(completion.choices[0].message.content || '[]');
}

async function generateScript(title: string, idea: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are a professional YouTube script writer.',
      },
      {
        role: 'user',
        content: `Write a detailed script for a YouTube video titled "${title}" with this idea: "${idea}". Structure the script in clear sections separated by double newlines.`,
      },
    ],
    model: 'gpt-4',
  });

  return completion.choices[0].message.content || '';
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
    // Call ElevenLabs API to generate voice
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': 'sk_5fd60bb0b3a990d266acf7464350677e3810a67ea004ecda'
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
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    console.log("calling video api", params);
    const body = await req.json() as VideoApiRequest;
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    // Generate video ideas
    if (isGenerateIdeasRequest(body)) {
      console.log("calling generate video ideas", videoId);
      // Validate channelId
      if (!params.id || typeof params.id !== 'string' || params.id.length !== 24) {
        return NextResponse.json(
          { error: 'Invalid channel ID format' },
          { status: 400 }
        );
      }

      // Verify channel exists
      const channel = await prisma.channel.findUnique({
        where: { id: params.id }
      });

      if (!channel) {
        return NextResponse.json(
          { error: 'Channel not found' },
          { status: 404 }
        );
      }

      const ideas = await generateVideoIdeas(params.id, body.competitorVideos);
      console.log("ideas", ideas);
      return NextResponse.json(ideas);
    }
    

    // Create new video with selected idea
    if (isCreateVideoRequest(body)) {
      // Validate channelId
      if (!params.id || typeof params.id !== 'string' || params.id.length !== 24) {
        return NextResponse.json(
          { error: 'Invalid channel ID format' },
          { status: 400 }
        );
      }

      // Verify channel exists
      const channel = await prisma.channel.findUnique({
        where: { id: params.id }
      });

      if (!channel) {
        return NextResponse.json(
          { error: 'Channel not found' },
          { status: 404 }
        );
      }

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

      // Generate script for the newly created video
      const script = await generateScript(body.selectedIdea.title, body.selectedIdea.idea);
      
      // Update video with generated script
      const updatedVideo = await prisma.video.update({
        where: { id: video.id },
        data: { script },
      });

      return NextResponse.json(updatedVideo);
    }

    // Generate single image
    if (isGenerateImageRequest(body)) {
      console.log("calling generate image", body.script);
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
      const updatedVideo = await prisma.video.update({
        where: { id: videoId! },
        data: {
          script: body.script,
          images: body.images,
          voiceovers: body.voiceovers,
          music: body.music,
          status: body.status,
        },
      });
      return NextResponse.json(updatedVideo);
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
      return NextResponse.json(
        { error: 'Invalid channel ID format' },
        { status: 400 }
      );
    }

    // Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: params.id }
    });

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: 'Invalid channel ID format' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    // Validate videoId
    if (!videoId || typeof videoId !== 'string' || videoId.length !== 24) {
      return NextResponse.json(
        { error: 'Invalid video ID format' },
        { status: 400 }
      );
    }

    // Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: params.id }
    });

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Verify video exists and belongs to the channel
    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        channelId: params.id
      }
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found or does not belong to this channel' },
        { status: 404 }
      );
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
