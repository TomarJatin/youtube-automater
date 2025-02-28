'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, PlayCircle, PauseCircle, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceoverStepData } from '@/types/video';

interface VoiceoverGenerationStepProps {
	videoData: VoiceoverStepData;
	onBack: () => void;
	onNext: (data: { voiceovers: string[] }) => void;
}

interface SectionVoiceover {
	url?: string;
	loading: boolean;
	error?: string;
	isPlaying?: boolean;
}

interface AudioPlayerProps {
	url: string;
	onRegenerate: () => void;
}

function AudioPlayer({ url, onRegenerate }: AudioPlayerProps) {
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

	useEffect(() => {
		const audio = audioRef.current;
		if (audio) {
			audio.addEventListener('ended', () => setIsPlaying(false));
			return () => {
				audio.removeEventListener('ended', () => setIsPlaying(false));
				audio.pause();
			};
		}
	}, []);

	return (
		<div className='flex items-center space-x-2'>
			<Button size='icon' variant='ghost' onClick={togglePlay} className='text-primary'>
				{isPlaying ? <PauseCircle className='h-6 w-6' /> : <PlayCircle className='h-6 w-6' />}
			</Button>
			<audio ref={audioRef} src={url} />
			<Button size='icon' variant='outline' onClick={onRegenerate} className='ml-auto'>
				<RefreshCw className='h-4 w-4' />
			</Button>
		</div>
	);
}

export function VoiceoverGenerationStep({ videoData, onBack, onNext }: VoiceoverGenerationStepProps) {
	// Use cleanScript if available, otherwise fall back to regular script
	const scriptToUse = videoData.cleanScript || videoData.script;
	const scriptSections = scriptToUse.split('\n\n').filter((section) => section.trim());

	const [sectionVoiceovers, setSectionVoiceovers] = useState<SectionVoiceover[]>(
		scriptSections.map(() => ({ loading: false }))
	);
	const [error, setError] = useState<string | null>(null);

	const generateAllVoiceovers = async () => {
		setError(null);
		try {
			// Set all sections to loading
			setSectionVoiceovers((prev) => prev.map((vo) => ({ ...vo, loading: true, error: undefined })));

			// For shorts, we'll generate one voiceover for the entire script
			// For long videos, we'll generate separate voiceovers for each section
			if (videoData.videoType === 'shorts') {
				const response = await fetch(`/api/channels/${videoData.channelId}/videos?videoId=${videoData.videoId}`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						script: scriptToUse,
						generateVoiceover: true,
						videoType: 'shorts',
					}),
				});

				if (!response.ok) throw new Error('Failed to generate voiceover');

				const data = await response.json();
				if (!data.voiceoverUrl) throw new Error('No voiceover generated');

				// Set the same URL for all sections since it's one continuous audio
				setSectionVoiceovers((prev) =>
					prev.map((vo) => ({
						loading: false,
						url: data.voiceoverUrl,
					}))
				);
			} else {
				// For long videos, generate separate voiceovers for each section
				for (let i = 0; i < scriptSections.length; i++) {
					await generateVoiceoverForSection(i, scriptSections[i]);
				}
			}
		} catch (error) {
			console.error('Error:', error);
			setSectionVoiceovers((prev) =>
				prev.map((vo) => ({
					loading: false,
					error: 'Failed to generate voiceover',
				}))
			);
			setError('Failed to generate voiceovers');
		}
	};

	const generateVoiceoverForSection = async (sectionIndex: number, section: string) => {
		try {
			setSectionVoiceovers((prev) =>
				prev.map((vo, i) => (i === sectionIndex ? { ...vo, loading: true, error: undefined } : vo))
			);

			const response = await fetch(`/api/channels/${videoData.channelId}/videos?videoId=${videoData.videoId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					script: section,
					generateVoiceover: true,
					videoType: videoData.videoType,
				}),
			});

			if (!response.ok) throw new Error('Failed to generate voiceover');

			const data = await response.json();
			if (!data.voiceoverUrl) throw new Error('No voiceover generated');

			setSectionVoiceovers((prev) =>
				prev.map((vo, i) => (i === sectionIndex ? { loading: false, url: data.voiceoverUrl } : vo))
			);
		} catch (error) {
			console.error('Error:', error);
			setSectionVoiceovers((prev) =>
				prev.map((vo, i) => (i === sectionIndex ? { loading: false, error: 'Failed to generate voiceover' } : vo))
			);
		}
	};

	const handleNext = () => {
		const allVoiceovers = sectionVoiceovers.map((vo) => vo.url).filter((url): url is string => url !== undefined);

		// if (allVoiceovers.length === scriptSections.length) {
		//   onNext({ voiceovers: allVoiceovers });
		// }
		onNext({ voiceovers: allVoiceovers });
	};

	const isGenerating = sectionVoiceovers.some((vo) => vo.loading);
	const hasError = sectionVoiceovers.some((vo) => vo.error);
	const isComplete = sectionVoiceovers.every((vo) => vo.url);

	if (isGenerating) {
		const progress = sectionVoiceovers.filter((vo) => vo.url).length;
		return (
			<div className='flex flex-col items-center justify-center space-y-4 p-8'>
				<Loader2 className='h-8 w-8 animate-spin' />
				<p>Generating voiceovers for your {videoData.videoType === 'shorts' ? 'short' : 'video'}...</p>
				<p className='text-sm text-muted-foreground'>
					{videoData.videoType === 'shorts'
						? 'Generating a concise voiceover for your short'
						: `Generated ${progress} of ${scriptSections.length} voiceovers`}
				</p>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			<div className='space-y-4'>
				<h3 className='text-lg font-semibold'>Generated Voiceovers</h3>
				<p className='text-muted-foreground'>
					Review the AI-generated voiceovers for your {videoData.videoType === 'shorts' ? 'short' : 'video'}.
					{videoData.videoType === 'shorts'
						? ' The voiceover has been optimized for a short-form video.'
						: ' Each audio clip corresponds to a section of your script.'}
				</p>
			</div>

			<div className='space-y-4'>
				{scriptSections.map((section, index) => (
					<Card key={index} className='space-y-4 p-4'>
						<div className='space-y-2'>
							<p className='text-sm font-medium'>
								{videoData.videoType === 'shorts' ? 'Short Script' : `Section ${index + 1}`}
							</p>
							<ScrollArea className='h-[100px] w-full rounded-md border p-2'>
								<p className='text-sm text-muted-foreground'>{section}</p>
							</ScrollArea>
						</div>

						<div className='h-12'>
							{sectionVoiceovers[index].loading ? (
								<div className='flex h-full items-center justify-center'>
									<Loader2 className='h-4 w-4 animate-spin' />
								</div>
							) : sectionVoiceovers[index].error ? (
								<div className='flex items-center justify-between'>
									<p className='text-sm text-destructive'>{sectionVoiceovers[index].error}</p>
									<Button size='sm' onClick={() => generateVoiceoverForSection(index, section)}>
										Try Again
									</Button>
								</div>
							) : sectionVoiceovers[index].url ? (
								<AudioPlayer
									url={sectionVoiceovers[index].url!}
									onRegenerate={() =>
										videoData.videoType === 'shorts'
											? generateAllVoiceovers()
											: generateVoiceoverForSection(index, section)
									}
								/>
							) : (
								<div className='flex h-full items-center justify-center'>
									<Button
										onClick={() =>
											videoData.videoType === 'shorts'
												? generateAllVoiceovers()
												: generateVoiceoverForSection(index, section)
										}
									>
										Generate Voiceover
									</Button>
								</div>
							)}
						</div>
					</Card>
				))}
			</div>

			<div className='flex justify-between pt-4'>
				<Button variant='outline' onClick={onBack}>
					Back to Images
				</Button>
				<div className='space-x-2'>
					<Button variant='outline' onClick={generateAllVoiceovers} disabled={isGenerating}>
						Regenerate {videoData.videoType === 'shorts' ? 'Voiceover' : 'All Voiceovers'}
					</Button>
					<Button
						onClick={handleNext}
						// disabled={!isComplete || isGenerating}
						disabled={isGenerating}
					>
						Continue to Music
					</Button>
				</div>
			</div>
		</div>
	);
}
