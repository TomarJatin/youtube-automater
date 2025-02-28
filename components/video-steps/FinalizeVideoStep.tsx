'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, PlayCircle, PauseCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FinalizeStepData } from '@/types/video';
import Image from 'next/image';

interface FinalizeVideoStepProps {
	channelId: string;
	videoData: FinalizeStepData;
	onBack: () => void;
	onComplete: () => void;
}

interface AudioPlayerProps {
	url: string;
}

function AudioPlayer({ url }: AudioPlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const togglePlay = () => {
		if (audioRef.current) {
			if (isPlaying) {
				audioRef.current.pause();
			} else {
				audioRef.current.play();
			}
			setIsPlaying(!isPlaying);
		}
	};

	return (
		<div className='flex items-center space-x-2'>
			<Button size='icon' variant='ghost' onClick={togglePlay} className='text-primary'>
				{isPlaying ? <PauseCircle className='h-6 w-6' /> : <PlayCircle className='h-6 w-6' />}
			</Button>
			<audio ref={audioRef} src={url} onEnded={() => setIsPlaying(false)} />
		</div>
	);
}

export function FinalizeVideoStep({ channelId, videoData, onBack, onComplete }: FinalizeVideoStepProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [videoUrl, setVideoUrl] = useState<string | null>(null);

	const finalizeVideo = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch(`/api/channels/${channelId}/videos?videoId=${videoData.videoId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					selectedIdea: videoData.selectedIdea,
					script: videoData.script,
					cleanScript: videoData.cleanScript,
					images: videoData.images,
					voiceovers: videoData.voiceovers,
					music: videoData.music,
					videoType: videoData.videoType,
					status: 'completed',
				}),
			});

			if (!response.ok) throw new Error('Failed to save video');

			const data = await response.json();
			setVideoUrl(data.videoUrl);
			setSuccess(true);
			setTimeout(() => {
				onComplete();
			}, 2000);
		} catch (error) {
			console.error('Error:', error);
			setError('Failed to save video. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	if (success) {
		return (
			<div className='flex flex-col items-center justify-center space-y-4 p-8'>
				<CheckCircle2 className='h-16 w-16 text-primary' />
				<h3 className='text-xl font-semibold'>
					{videoData.videoType === 'shorts' ? 'Short' : 'Video'} Created Successfully!
				</h3>
				<p className='text-center text-muted-foreground'>
					Your {videoData.videoType === 'shorts' ? 'YouTube Short' : 'video'} has been generated successfully!
				</p>
				{videoUrl && (
					<div className='mt-4'>
						<video className='mx-auto w-full max-w-md rounded-lg shadow-lg' controls autoPlay muted>
							<source src={videoUrl} type='video/mp4' />
							Your browser does not support the video tag.
						</video>
					</div>
				)}
			</div>
		);
	}

	if (loading) {
		return (
			<div className='flex flex-col items-center justify-center space-y-4 p-8'>
				<Loader2 className='h-8 w-8 animate-spin' />
				<p>Finalizing your {videoData.videoType === 'shorts' ? 'short' : 'video'}...</p>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			<div className='space-y-4'>
				<h3 className='text-lg font-semibold'>Review & Finalize</h3>
				<p className='text-muted-foreground'>
					Review all components of your {videoData.videoType === 'shorts' ? 'YouTube Short' : 'video'} before
					finalizing.
				</p>
				{videoData.videoType === 'shorts' && (
					<p className='text-sm text-yellow-600'>
						Note: Your content has been optimized for short-form video (≤ 30 seconds).
					</p>
				)}
			</div>

			<div className='space-y-4'>
				<Card className='p-4'>
					<h4 className='mb-2 font-medium'>
						{videoData.videoType === 'shorts' ? 'Short' : 'Video'} Title & Description
					</h4>
					<p className='text-lg font-semibold text-primary'>{videoData.selectedIdea.title}</p>
					<p className='mt-2 text-sm text-muted-foreground'>{videoData.selectedIdea.idea}</p>
				</Card>

				<Card className='p-4'>
					<h4 className='mb-2 font-medium'>Script</h4>
					<ScrollArea className='h-[200px] w-full rounded-md border p-4'>
						<div className='whitespace-pre-wrap font-mono text-sm'>{videoData.cleanScript || videoData.script}</div>
					</ScrollArea>
				</Card>

				<Card className='p-4'>
					<h4 className='mb-2 font-medium'>Generated Images</h4>
					<div className='mt-4 grid grid-cols-2 gap-4 md:grid-cols-3'>
						{videoData.images.map((url, index) => (
							<div key={index} className='relative aspect-video overflow-hidden rounded-lg'>
								<Image src={url} alt={`Video image ${index + 1}`} fill className='object-cover' />
							</div>
						))}
					</div>
				</Card>

				<Card className='p-4'>
					<h4 className='mb-2 font-medium'>{videoData.videoType === 'shorts' ? 'Voiceover' : 'Voiceovers'}</h4>
					<div className='space-y-4'>
						{videoData.voiceovers.map((url, index) => (
							<div key={index} className='flex items-center justify-between'>
								<span className='text-sm'>
									{videoData.videoType === 'shorts' ? 'Main Voiceover' : `Section ${index + 1}`}
								</span>
								<AudioPlayer url={url} />
							</div>
						))}
					</div>
				</Card>

				<Card className='p-4'>
					<h4 className='mb-2 font-medium'>Background Music</h4>
					<div className='flex items-center justify-between'>
						<span className='text-sm'>{videoData.music.split('/').pop()}</span>
						<AudioPlayer url={videoData.music} />
					</div>
				</Card>

				{error && (
					<div className='text-center text-destructive'>
						<p>{error}</p>
					</div>
				)}

				<div className='flex justify-between pt-4'>
					<Button variant='outline' onClick={onBack}>
						Back to Music
					</Button>
					<Button onClick={finalizeVideo} disabled={loading}>
						Create {videoData.videoType === 'shorts' ? 'Short' : 'Video'}
					</Button>
				</div>
			</div>
		</div>
	);
}
