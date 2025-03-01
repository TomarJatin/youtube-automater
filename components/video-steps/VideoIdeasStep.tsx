'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { VideoIdea, VideoStepData } from '@/types/video';

interface VideoIdeasStepProps {
	channelId: string;
	onNext: (data: { selectedIdea: VideoIdea; videoType: 'shorts' | 'long'; videoId: string; ideas: VideoIdea[] }) => void;
	videoData: VideoStepData;
}

export function VideoIdeasStep({ channelId, onNext, videoData }: VideoIdeasStepProps) {
	
	const [hasInitialIdeas, setHasInitialIdeas] = useState(videoData.selectedIdea ? true : false);
	console.log("hasIntialIdeas: ", hasInitialIdeas, videoData.selectedIdea ? true : false)
	const [loading, setLoading] = useState(false);
	const [ideas, setIdeas] = useState<VideoIdea[]>(videoData?.ideas || []);
	const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number | null>(
		videoData?.ideas && videoData.selectedIdea ? videoData?.ideas?.indexOf(videoData.selectedIdea) : null
	);
	const [videoType, setVideoType] = useState<'shorts' | 'long'>(videoData?.videoType || 'long');
	const [error, setError] = useState<string | null>(null);

	const fetchVideoIdeas = async () => {
		try {
			setLoading(true);
			setError(null);

			// First, fetch competitors
			const competitorsResponse = await fetch(`/api/channels/${channelId}/competitors`);
			if (!competitorsResponse.ok) throw new Error('Failed to fetch competitors');
			const competitors = await competitorsResponse.json();

			// Generate video ideas based on competitor videos
			const ideasResponse = await fetch(`/api/channels/${channelId}/videos`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					competitorVideos: competitors,
					generateIdeas: true,
				}),
			});

			if (!ideasResponse.ok) throw new Error('Failed to generate video ideas');
			const generatedIdeas = await ideasResponse.json();
			setIdeas(generatedIdeas);
		} catch (error) {
			console.error('Error:', error);
			setError('Failed to generate video ideas. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleGenerateIdeas = () => {
		fetchVideoIdeas();
		setHasInitialIdeas(true);
	};

	const handleNext = async () => {
		console.log("handing next...", selectedIdeaIndex, videoData.videoId, ideas, videoType);
		if (selectedIdeaIndex !== null && !videoData.videoId) {
			try {
				setLoading(true);
				// Create the initial video
				const response = await fetch(`/api/channels/${channelId}/videos`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						selectedIdea: ideas[selectedIdeaIndex],
						videoType,
					}),
				});

				if (!response.ok) throw new Error('Failed to create video');
				const video = await response.json();

				onNext({
					selectedIdea: ideas[selectedIdeaIndex],
					videoType,
					videoId: video.id,
					ideas,
				});
			} catch (error) {
				console.error('Error:', error);
				setError('Failed to create video. Please try again.');
			} finally {
				setLoading(false);
			}
		}
		else if (videoData.videoId && selectedIdeaIndex !== null) {
			onNext({
				selectedIdea: ideas[selectedIdeaIndex],
				videoType,
				videoId: videoData.videoId,
				ideas,
			});
		}
	};

	if (loading) {
		return (
			<div className='flex flex-col items-center justify-center space-y-4 p-8'>
				<Loader2 className='h-8 w-8 animate-spin' />
				<p>Analyzing competitor videos and generating ideas...</p>
				<p className='text-sm text-muted-foreground'>
					This may take a few moments as we analyze your competitors and generate unique video ideas.
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className='p-8 text-center text-destructive'>
				<p>{error}</p>
				<Button onClick={fetchVideoIdeas} className='mt-4'>
					Try Again
				</Button>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			{!hasInitialIdeas ? (
				<div className='flex flex-col items-center justify-center space-y-4 p-8'>
					<p className='text-lg font-semibold'>Ready to create a new video?</p>
					<p className='text-center text-muted-foreground'>
						Click the button below to analyze competitor videos and generate unique video ideas.
					</p>
					<Button onClick={handleGenerateIdeas} size='lg'>
						Generate Video Ideas
					</Button>
				</div>
			) : (
				<>
					<div className='space-y-4'>
						<h3 className='text-lg font-semibold'>Select Video Type</h3>
						<RadioGroup
							value={videoType}
							onValueChange={(value) => setVideoType(value as 'shorts' | 'long')}
							className='flex items-center space-x-4'
						>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='long' id='long' />
								<Label htmlFor='long'>Long Form Video</Label>
							</div>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='shorts' id='shorts' />
								<Label htmlFor='shorts'>YouTube Shorts (≤ 30s)</Label>
							</div>
						</RadioGroup>
					</div>

					<div className='space-y-4'>
						<h3 className='text-lg font-semibold'>Select a Video Idea</h3>
						<p className='text-muted-foreground'>
							Choose from the following AI-generated video ideas based on competitor analysis:
						</p>
					</div>

					<RadioGroup
						value={selectedIdeaIndex?.toString()}
						onValueChange={(value) => setSelectedIdeaIndex(parseInt(value))}
						className='space-y-4'
					>
						{ideas.map((idea, index) => (
							<Card
								key={index}
								className={`cursor-pointer p-4 transition-colors ${selectedIdeaIndex === index ? 'border-primary' : ''}`}
							>
								<div className='flex items-start space-x-4'>
									<RadioGroupItem value={index.toString()} id={`idea-${index}`} />
									<div className='flex-grow'>
										<Label htmlFor={`idea-${index}`} className='font-medium'>
											{idea.title}
										</Label>
										<p className='mt-1 text-sm text-muted-foreground'>{idea.idea}</p>
									</div>
								</div>
							</Card>
						))}
					</RadioGroup>

					<div className='flex justify-end pt-4'>
						<Button onClick={handleNext} disabled={selectedIdeaIndex === null}>
							Continue to Script
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
