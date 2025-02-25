import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import CompetitorList from '@/components/CompetitorList';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
	params: {
		id: string;
	};
}

export default async function ChannelCompetitorsPage({ params }: PageProps) {
	const channel = await prisma.channel.findUnique({
		where: { id: params.id },
		include: {
			competitors: true,
		},
	});

	if (!channel) notFound();

	return (
		<main className='container mx-auto p-4'>
			<div className='mb-8'>
				<div className='flex items-center gap-4'>
					<Link href='/'>
						<Button variant='outline' size='icon'>
							<ArrowLeft className='h-4 w-4' />
						</Button>
					</Link>
					<div>
						<h1 className='text-3xl font-bold'>{channel.name}</h1>
						<p className='text-muted-foreground'>Competitor Management</p>
					</div>
				</div>
			</div>

			<div className='grid gap-8'>
				<div>
					<h2 className='mb-4 text-2xl font-semibold'>Competitors</h2>
					<Suspense fallback={<div>Loading competitors...</div>}>
						<CompetitorList initialCompetitors={channel.competitors} channelId={params.id} />
					</Suspense>
				</div>

				<div>
					<h2 className='mb-4 text-2xl font-semibold'>Next Steps</h2>
					<div className='rounded-lg border bg-card p-6 text-card-foreground'>
						<p className='mb-4'>Once you&apos;ve added your competitors, you can:</p>
						<ul className='ml-6 list-disc space-y-2'>
							<li>Analyze their most popular content to understand what works in your niche</li>
							<li>Generate video ideas based on successful content from your competitors</li>
							<li>Create unique content that stands out while learning from their strategies</li>
						</ul>
						<div className='mt-6'>
							<Link href={`/channels/${params.id}/videos`}>
								<Button>Go to Video Management</Button>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
