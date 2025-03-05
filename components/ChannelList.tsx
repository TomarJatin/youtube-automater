'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Channel, ConnectedChannel } from '@/types/db';
import { toast } from 'sonner';
import { Loading } from '@/components/ui/loading';

type ChannelWithDetails = Channel & {
	connectedChannel: ConnectedChannel | null;
};

interface ChannelListProps {
	initialChannels: ChannelWithDetails[];
}

export default function ChannelList({ initialChannels }: ChannelListProps) {
	const [channels, setChannels] = useState(initialChannels);
	const [loading, setLoading] = useState<string | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const router = useRouter();

	const refreshChannels = useCallback(async () => {
		try {
			setIsRefreshing(true);
			const response = await fetch('/api/channels');
			if (!response.ok) throw new Error('Failed to fetch channels');
			const updatedChannels = await response.json();
			setChannels(updatedChannels);
		} catch (error) {
			console.error('Error refreshing channels:', error);
			toast.error('Failed to refresh channels');
		} finally {
			setIsRefreshing(false);
		}
	}, []);

	// Check for returning from YouTube OAuth
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const error = urlParams.get('error');
		const success = urlParams.get('success');

		if (error) {
			toast.error(decodeURIComponent(error));
		} else if (success) {
			toast.success('Successfully connected to YouTube');
			refreshChannels();
		}
	}, [refreshChannels]);

	// Refresh channels when component mounts
	useEffect(() => {
		refreshChannels();
	}, [refreshChannels]);

	const handleConnectChannel = async (channelId: string) => {
		setLoading(channelId);
		try {
			const response = await fetch(`/api/youtube?channelId=${channelId}`, {
				headers: {
					Accept: 'application/json',
				},
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to initiate YouTube connection');
			}

			const { url } = await response.json();
			if (!url) throw new Error('No authorization URL received');

			// Store the current channel ID for post-redirect state
			localStorage.setItem('connecting_channel_id', channelId);

			// Redirect to YouTube OAuth
			window.location.href = url;
		} catch (error) {
			console.error('Error connecting to YouTube:', error);
			toast.error('Failed to connect to YouTube');
		} finally {
			setLoading(null);
		}
	};

	const handleDisconnectChannel = async (channelId: string) => {
		setLoading(channelId);
		try {
			const response = await fetch('/api/youtube/disconnect', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ channelId }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to disconnect YouTube channel');
			}

			toast.success('Successfully disconnected from YouTube');
			refreshChannels();
		} catch (error) {
			console.error('Error disconnecting from YouTube:', error);
			toast.error('Failed to disconnect from YouTube');
		} finally {
			setLoading(null);
		}
	};

	const handleManageVideos = (channelId: string) => {
		router.push(`/channels/${channelId}/videos`);
	};

	const handleManageCompetitors = (channelId: string) => {
		router.push(`/channels/${channelId}/competitors`);
	};

	if (isRefreshing && channels.length === 0) {
		return <Loading message='Loading channels...' />;
	}

	return (
		<div className='grid gap-4'>
			{isRefreshing && (
				<div className='col-span-full'>
					<div className='h-1 w-full overflow-hidden rounded-full bg-secondary'>
						<div className='h-full w-1/3 animate-slide bg-primary'></div>
					</div>
				</div>
			)}
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
								<CardTitle className=''>{channel.name}</CardTitle>
								<CardDescription className='mt-2 line-clamp-2 text-white'>{channel.description}</CardDescription>
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
							<Button
								onClick={() => handleConnectChannel(channel.id)}
								variant='secondary'
								disabled={loading === channel.id}
							>
								{loading === channel.id ? 'Connecting...' : 'Connect to YouTube'}
							</Button>
						) : (
							<>
								<Button onClick={() => handleManageVideos(channel.id)} variant='default'>
									Manage Videos
								</Button>
								<Button onClick={() => handleManageCompetitors(channel.id)} variant='outline'>
									Manage Competitors
								</Button>
								<Button 
									onClick={() => handleDisconnectChannel(channel.id)}
									variant='destructive'
									disabled={loading === channel.id}
								>
									{loading === channel.id ? 'Disconnecting...' : 'Disconnect'}
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
