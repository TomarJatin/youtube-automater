import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
	try {
		const body = await req.json();
		const { competitors } = body;

		const createdCompetitors = await Promise.all(
			competitors.map((competitor: { name: string; url: string }) =>
				prisma.competitorChannel.create({
					data: {
						channelId: params.id,
						name: competitor.name,
						url: competitor.url,
					},
				})
			)
		);

		return NextResponse.json(createdCompetitors);
	} catch (error) {
		console.error('Error adding competitors:', error);
		return NextResponse.json({ error: 'Failed to add competitors' }, { status: 500 });
	}
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
	try {
		const competitors = await prisma.competitorChannel.findMany({
			where: {
				channelId: params.id,
			},
		});

		return NextResponse.json(competitors);
	} catch (error) {
		console.error('Error fetching competitors:', error);
		return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
	}
}
