import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import ChannelList from '@/components/ChannelList';
import CreateChannelForm from '@/components/CreateChannelForm';

export default async function Home() {
	const channels = await prisma.channel.findMany({
		include: {
			connectedChannel: true,
			competitors: true,
			videos: true,
		},
	});

	return (
		<main className='container mx-auto p-4'>
			<div className='grid gap-8 md:grid-cols-2'>
				<div>
					<h2 className='mb-4 text-2xl font-semibold'>Create New Channel</h2>
					<CreateChannelForm />
				</div>
				<div>
					<h2 className='mb-4 text-2xl font-semibold'>Your Channels</h2>
					<Suspense fallback={<div>Loading channels...</div>}>
						<ChannelList initialChannels={channels} />
					</Suspense>
				</div>
			</div>

			<div className='mt-12 rounded-lg border bg-card p-6 text-card-foreground'>
				<h2 className='mb-4 text-2xl font-semibold'>Getting Started</h2>
				<div className='space-y-4'>
					<p>Welcome to YouTube Channel Automater! Here&apos;s how to get started:</p>
					<ol className='ml-6 list-decimal space-y-2'>
						<li>
							Create a new channel by providing a niche and optionally letting AI generate your channel name and
							description
						</li>
						<li>Connect your YouTube account to enable automated content creation</li>
						<li>Add competitor channels to analyze their content and generate video ideas</li>
						<li>Create videos with AI-generated scripts, images, and voiceovers</li>
					</ol>
				</div>
			</div>
		</main>
	);
}
