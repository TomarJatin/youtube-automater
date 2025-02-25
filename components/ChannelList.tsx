'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Channel, ConnectedChannel } from '@/types/db';
import { toast } from 'sonner';

type ChannelWithDetails = Channel & {
	connectedChannel: ConnectedChannel | null;
};

interface ChannelListProps {
	initialChannels: ChannelWithDetails[];
}

export default function ChannelList({ initialChannels }: ChannelListProps) {
	const [channels, setChannels] = useState(initialChannels);
	const router = useRouter();

	const handleConnectChannel = async (channelId: string) => {
		try {
			const response = await fetch(`/api/auth/youtube?channelId=${channelId}`);
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to initiate YouTube connection');
			}

			const { url } = await response.json();
			if (!url) throw new Error('No authorization URL received');

			// Redirect to YouTube OAuth
			window.location.href = url;
		} catch (error) {
			console.error('Error connecting to YouTube:', error);
			toast.error('Failed to connect to YouTube');
		}
	};

	const handleManageVideos = (channelId: string) => {
		router.push(`/channels/${channelId}/videos`);
	};

	const handleManageCompetitors = (channelId: string) => {
		router.push(`/channels/${channelId}/competitors`);
	};

	return (
		<div className='grid gap-4'>
			{channels.map((channel) => (
				<Card key={channel.id} className='overflow-hidden'>
					<CardHeader className='relative'>
						<Image
							src={channel.banner}
							alt={`${channel.name} banner`}
							width={800}
							height={200}
							className='absolute inset-0 h-32 w-full object-cover'
						/>
						<div className='relative mt-24 flex items-center gap-4'>
							<Image
								src={channel.profilePicture}
								alt={channel.name}
								width={80}
								height={80}
								className='rounded-full border-4 border-background'
							/>
							<div>
								<CardTitle>{channel.name}</CardTitle>
								<CardDescription className='line-clamp-2'>{channel.description}</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className='flex items-center gap-2'>
							<Badge variant={channel.connectedChannel ? 'default' : 'secondary'}>
								{channel.connectedChannel ? 'Connected' : 'Not Connected'}
							</Badge>
							<Badge variant='outline'>{channel.niche}</Badge>
						</div>
					</CardContent>
					<CardFooter className='flex gap-2'>
						{!channel.connectedChannel ? (
							<Button onClick={() => handleConnectChannel(channel.id)} variant='secondary'>
								Connect to YouTube
							</Button>
						) : (
							<>
								<Button onClick={() => handleManageVideos(channel.id)} variant='default'>
									Manage Videos
								</Button>
								<Button onClick={() => handleManageCompetitors(channel.id)} variant='outline'>
									Manage Competitors
								</Button>
							</>
						)}
					</CardFooter>
				</Card>
			))}
			{channels.length === 0 && (
				<div className='text-center text-muted-foreground'>
					No channels created yet. Create your first channel to get started!
				</div>
			)}
		</div>
	);
}
