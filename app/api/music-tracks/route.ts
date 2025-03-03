import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Get all music tracks
export async function GET() {
  try {
    const tracks = await prisma.musicTrack.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(tracks);
  } catch (error) {
    console.error('Error fetching music tracks:', error);
    return NextResponse.json({ error: 'Failed to fetch music tracks' }, { status: 500 });
  }
}

// Create a new music track
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const mood = formData.get('mood') as string;
    const genre = formData.get('genre') as string;
    const duration = formData.get('duration') as string;
    const tagsString = formData.get('tags') as string;
    const file = formData.get('file') as File;
    
    if (!name || !description || !mood || !genre || !duration || !tagsString || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const tags = tagsString.split(',').map(tag => tag.trim());
    
    // Upload file to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `music/${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read',
      })
    );
    
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    
    // Create track in database
    const track = await prisma.musicTrack.create({
      data: {
        name,
        description,
        url,
        mood,
        genre,
        duration,
        tags,
      },
    });
    
    return NextResponse.json(track);
  } catch (error) {
    console.error('Error creating music track:', error);
    return NextResponse.json({ error: 'Failed to create music track' }, { status: 500 });
  }
} 