'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScriptStepData, VideoStepData } from '@/types/video';

interface ScriptGenerationStepProps {
	videoData: VideoStepData;
	onBack: () => void;
	onNext: (data: { script: string; cleanScript: string; videoId: string }) => void;
}

export function ScriptGenerationStep({ videoData, onBack, onNext }: ScriptGenerationStepProps) {
	const [loading, setLoading] = useState(false);
	const [script, setScript] = useState<string>(videoData?.script || '');
	const [videoId, setVideoId] = useState(videoData?.videoId || '');
	const [error, setError] = useState<string | null>(null);

	const cleanScript = (rawScript: string): string => {
		// Split script into lines
		const lines = rawScript.split('\n');

		// Filter out instruction lines (lines starting with common instruction markers)
		const cleanedLines = lines.filter((line) => {
			const trimmedLine = line.trim().toLowerCase();
			return !(
				trimmedLine.startsWith('note:') ||
				trimmedLine.startsWith('instruction:') ||
				trimmedLine.startsWith('direction:') ||
				trimmedLine.startsWith('->') ||
				trimmedLine.startsWith('*') ||
				trimmedLine.startsWith('[') ||
				trimmedLine.startsWith('(')
			);
		});

		// Join the lines back together
		let cleanedScript = cleanedLines.join('\n').trim();

		// For shorts, ensure script is not too long (rough approximation)
		if (videoData.videoType === 'shorts') {
			// Assuming average speaking rate of 150 words per minute
			// and targeting 25-second video (leaving 5 seconds for transitions)
			const maxWords = 62; // 150 words/minute * (25/60) minutes
			const words = cleanedScript.split(/\s+/);
			if (words.length > maxWords) {
				cleanedScript = words.slice(0, maxWords).join(' ') + '...';
			}
		}

		return cleanedScript;
	};

	const generateScript = async () => {
		try {
			setLoading(true);
			setError(null);

			// Ensure we have a videoId
			if (!videoData.videoId) {
				throw new Error('No video ID provided');
			}

			const response = await fetch(`/api/channels/${videoData.channelId}/videos?videoId=${videoData.videoId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					selectedIdea: videoData.selectedIdea,
					videoType: videoData.videoType,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to generate script');
			}

			const data = await response.json();
			if (!data.script) throw new Error('No script generated');

			setScript(data.script);
			// Keep using the existing videoId
			setVideoId(videoData.videoId);
		} catch (error) {
			console.error('Error:', error);
			setError('Failed to generate script. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleNext = () => {
		if (script) {
			const cleanedScript = cleanScript(script);
			onNext({ script, cleanScript: cleanedScript, videoId });
		}
	};

	if (loading) {
		return (
			<div className='flex flex-col items-center justify-center space-y-4 p-8'>
				<Loader2 className='h-8 w-8 animate-spin' />
				<p>Generating video script...</p>
				<p className='text-sm text-muted-foreground'>
					Our AI is crafting a compelling {videoData.videoType === 'shorts' ? 'short-form' : 'long-form'} script based
					on your selected idea:
					<span className='mt-2 block font-medium'>{videoData.selectedIdea?.idea}</span>
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className='p-8 text-center text-destructive'>
				<p>{error}</p>
				<div className='mt-4 flex justify-center space-x-4'>
					<Button variant='outline' onClick={onBack}>
						Back to Ideas
					</Button>
					<Button onClick={generateScript}>Try Again</Button>
				</div>
			</div>
		);
	}

	if (!script) {
		return (
			<div className='space-y-6'>
				<div className='space-y-4'>
					<h3 className='text-lg font-semibold'>Generate Script</h3>
					<p className='text-muted-foreground'>
						Generate a {videoData.videoType === 'shorts' ? 'short-form' : 'long-form'} script for your video titled "{videoData.selectedIdea?.title}"
					</p>
					{videoData.videoType === 'shorts' && (
						<p className='text-sm text-yellow-600'>
							Note: The script will be automatically trimmed to ensure the final video is under 30 seconds.
						</p>
					)}
				</div>

				<div className='flex justify-between pt-4'>
					<Button variant='outline' onClick={onBack}>
						Back to Ideas
					</Button>
					<Button onClick={generateScript}>
						Generate Script
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			<div className='space-y-4'>
				<h3 className='text-lg font-semibold'>Review Generated Script</h3>
				<p className='text-muted-foreground'>
					Review the AI-generated {videoData.videoType === 'shorts' ? 'short-form' : 'long-form'} script for your video
					titled "{videoData.selectedIdea?.title}"
				</p>
				{videoData.videoType === 'shorts' && (
					<p className='text-sm text-yellow-600'>
						Note: The script will be automatically trimmed to ensure the final video is under 30 seconds.
					</p>
				)}
			</div>

			<Card className='p-4'>
				<ScrollArea className='h-[400px] w-full rounded-md border p-4'>
					<div className='whitespace-pre-wrap font-mono text-sm'>{script}</div>
				</ScrollArea>
			</Card>

			<div className='flex justify-between pt-4'>
				<Button variant='outline' onClick={onBack}>
					Back to Ideas
				</Button>
				<div className='space-x-2'>
					<Button variant='outline' onClick={generateScript}>
						Regenerate Script
					</Button>
					<Button onClick={handleNext} disabled={!script}>
						Continue to Images
					</Button>
				</div>
			</div>
		</div>
	);
}
