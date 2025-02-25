'use client';

import { useState } from 'react';
import { Video } from '@/types/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import Image from 'next/image';
import { Trash2, Play } from 'lucide-react';

interface VideoListProps {
	initialVideos: Video[];
	channelId: string;
}

export default function VideoList({ initialVideos, channelId }: VideoListProps) {
	const [videos, setVideos] = useState(initialVideos);
	const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

	const handleDeleteVideo = async (videoId: string) => {
		try {
			const response = await fetch(`/api/channels/${channelId}/videos?videoId=${videoId}`, {
				method: 'DELETE',
			});

			if (!response.ok) throw new Error('Failed to delete video');

			setVideos(videos.filter((video) => video.id !== videoId));
			toast.success('Video deleted successfully');
		} catch (error) {
			toast.error('Failed to delete video');
			console.error(error);
		}
	};

	return (
		<div className='space-y-4'>
			{videos.map((video) => (
				<Card key={video.id}>
					<CardHeader className='flex flex-row items-center justify-between'>
						<div>
							<CardTitle>{video.title}</CardTitle>
							<CardDescription>{video.idea}</CardDescription>
						</div>
						<div className='flex items-center gap-2'>
							<Badge variant={video.status === 'completed' ? 'default' : 'secondary'}>
								{video.status === 'completed' ? 'Completed' : 'In Progress'}
							</Badge>
							<Dialog>
								<DialogTrigger asChild>
									<Button variant='outline' size='icon' onClick={() => setSelectedVideo(video)}>
										<Play className='h-4 w-4' />
									</Button>
								</DialogTrigger>
								<DialogContent className='max-w-4xl'>
									<DialogHeader>
										<DialogTitle>{video.title}</DialogTitle>
										<DialogDescription>Video Details</DialogDescription>
									</DialogHeader>
									<ScrollArea className='h-[600px]'>
										<div className='space-y-6 p-4'>
											<div>
												<h3 className='mb-2 font-semibold'>Script</h3>
												<div className='whitespace-pre-wrap rounded-lg border p-4'>{video.script}</div>
											</div>
											<div>
												<h3 className='mb-2 font-semibold'>Generated Images</h3>
												<div className='grid gap-4 md:grid-cols-2'>
													{video.images.map((image, index) => (
														<div key={index} className='relative aspect-video overflow-hidden rounded-lg border'>
															<Image src={image} alt={`Scene ${index + 1}`} fill className='object-cover' />
														</div>
													))}
												</div>
											</div>
											<div>
												<h3 className='mb-2 font-semibold'>Voiceovers</h3>
												<div className='space-y-2'>
													{video.voiceovers.map((voiceover, index) => (
														<div key={index} className='rounded-lg border p-2'>
															<audio src={voiceover} controls className='w-full' />
														</div>
													))}
												</div>
											</div>
											{video.music && (
												<div>
													<h3 className='mb-2 font-semibold'>Background Music</h3>
													<div className='rounded-lg border p-2'>
														<audio src={video.music} controls className='w-full' />
													</div>
												</div>
											)}
										</div>
									</ScrollArea>
								</DialogContent>
							</Dialog>
							<Button variant='destructive' size='icon' onClick={() => handleDeleteVideo(video.id)}>
								<Trash2 className='h-4 w-4' />
							</Button>
						</div>
					</CardHeader>
				</Card>
			))}
			{videos.length === 0 && (
				<div className='text-center text-muted-foreground'>
					No videos created yet. Click the "Create New Video" button to get started!
				</div>
			)}
		</div>
	);
}
