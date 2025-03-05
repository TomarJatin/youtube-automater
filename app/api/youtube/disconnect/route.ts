import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const { channelId } = await request.json();

        if (!channelId) {
            return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
        }

        // Delete the connected channel record
        await prisma.connectedChannel.delete({
            where: { channelId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error disconnecting YouTube channel:', error);
        return NextResponse.json({ error: 'Failed to disconnect YouTube channel' }, { status: 500 });
    }
} 