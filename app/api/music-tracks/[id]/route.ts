import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Delete a music track
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    // Get the track to find the S3 URL
    const track = await prisma.musicTrack.findUnique({
      where: { id },
    });
    
    if (!track) {
      return NextResponse.json({ error: 'Music track not found' }, { status: 404 });
    }
    
    // Extract the key from the URL
    const url = new URL(track.url);
    const key = url.pathname.substring(1); // Remove leading slash
    
    // Delete from S3
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: key,
        })
      );
    } catch (s3Error) {
      console.error('Error deleting from S3:', s3Error);
      // Continue with database deletion even if S3 deletion fails
    }
    
    // Delete from database
    await prisma.musicTrack.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting music track:', error);
    return NextResponse.json({ error: 'Failed to delete music track' }, { status: 500 });
  }
} 