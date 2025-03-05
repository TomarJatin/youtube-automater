import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI, { AzureOpenAI } from 'openai';

const openai = new OpenAI({
	apiKey: '26ede18bf6524e29ac43a954d495b7fe',
	baseURL: 'https://playgroundbnd.openai.azure.com/openai/deployments/playground',
	defaultQuery: { 'api-version': '2024-08-01-preview' },
	defaultHeaders: { 'api-key': '26ede18bf6524e29ac43a954d495b7fe' },
});

async function generateTitle(title: string, description: string, script: string, videoType: string) {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are a YouTube SEO expert specializing in creating engaging, clickable titles.',
      },
      {
        role: 'user',
        content: `Generate an optimized YouTube title (max 100 chars) for a ${videoType} video about: "${title}". Make it engaging and SEO-friendly. Return only the title text.`,
      },
    ],
    model: 'gpt-4',
  });

  console.log("generated title response: ", completion.choices[0].message.content);

  return completion.choices[0].message.content?.trim() || title;
}

async function generateDescription(title: string, description: string, script: string, videoType: string) {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are a YouTube content writer specializing in engaging video descriptions.',
      },
      {
        role: 'user',
        content: `Create an optimized YouTube description (max 5000 chars) for a ${videoType} video titled: "${title}" with content: "${script}". Include sections, emojis, and timestamps if it's a long video. Make it engaging and SEO-friendly.`,
      },
    ],
    model: 'gpt-4',
  });

  return completion.choices[0].message.content?.trim() || description;
}

async function generateTags(title: string, description: string, script: string, videoType: string) {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are a YouTube SEO expert specializing in tag optimization.',
      },
      {
        role: 'user',
        content: `Generate relevant tags (max 500 chars total) for a ${videoType} video titled: "${title}" about: "${description}". Return as a JSON array of strings.`,
      },
    ],
    model: 'gpt-4',
  });

  const tags = JSON.parse(completion.choices[0].message.content || '[]');
  return Array.isArray(tags) ? tags : [];
}

async function generateThumbnail(title: string, description: string, videoType: string) {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are an expert at creating eye-catching YouTube thumbnail prompts.',
      },
      {
        role: 'user',
        content: `Create a detailed prompt for an eye-catching thumbnail for a ${videoType} video titled: "${title}" about: "${description}". The thumbnail should be attention-grabbing and relevant.`,
      },
    ],
    model: 'gpt-4',
  });

  const thumbnailPrompt = completion.choices[0].message.content?.trim() || '';
  
  const imageOpenai = new AzureOpenAI({
	apiVersion: '2024-05-01-preview',
	endpoint: 'https://bindle-prod.openai.azure.com/',
	apiKey: process.env.AZURE_OPENAI_API_KEY,
});

  const imageResponse = await imageOpenai.images.generate({
    model: 'Dalle3',
    prompt: thumbnailPrompt,
    size: '1792x1024',
    quality: 'standard',
    n: 1,
  });

  return imageResponse.data[0].url;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string; videoId: string } }
) {
  try {
    const { title, description, script, videoType, regenerateType } = await req.json();

    // Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: params.id },
      include: { connectedChannel: true },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    if (!channel.connectedChannel) {
      return NextResponse.json(
        { error: 'Channel not connected to YouTube' },
        { status: 400 }
      );
    }

    // Get existing metadata
    const existingVideo = await prisma.video.findUnique({
      where: { id: params.videoId },
      select: { title: true, description: true, tags: true, thumbnail: true },
    });

    let newMetadata: any = { ...existingVideo };

    // Only regenerate specified component if regenerateType is provided
    if (regenerateType) {
      switch (regenerateType) {
        case 'title':
          newMetadata.title = await generateTitle(title, description, script, videoType);
          break;
        case 'description':
          newMetadata.description = await generateDescription(title, description, script, videoType);
          break;
        case 'tags':
          newMetadata.tags = await generateTags(title, description, script, videoType);
          break;
        case 'thumbnail':
          newMetadata.thumbnail = await generateThumbnail(title, description, videoType);
          break;
        default:
          break;
      }
    } else {
      // Generate all metadata if no specific type is specified
      newMetadata = {
        title: await generateTitle(title, description, script, videoType),
        description: await generateDescription(title, description, script, videoType),
        tags: await generateTags(title, description, script, videoType),
        thumbnail: await generateThumbnail(title, description, videoType),
      };
    }

    // Update video with new metadata
    await prisma.video.update({
      where: { id: params.videoId },
      data: newMetadata,
    });

    return NextResponse.json(newMetadata);
	} catch (error) {
		console.error('Error generating metadata:', error);
		return NextResponse.json(
			{ error: 'Failed to generate metadata' },
			{ status: 500 }
		);
	}
}
