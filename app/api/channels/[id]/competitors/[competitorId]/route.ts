import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: { id: string; competitorId: string } }) {
	try {
		await prisma.competitorChannel.delete({
			where: {
				id: params.competitorId,
				channelId: params.id,
			},
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting competitor:', error);
		return NextResponse.json({ error: 'Failed to delete competitor' }, { status: 500 });
	}
}
