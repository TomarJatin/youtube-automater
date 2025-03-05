'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw, Wand2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageStepData, VideoStepData } from '@/types/video';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';

interface ImageGenerationStepProps {
	videoData: VideoStepData;
	onBack: () => void;
	onNext: (data: { images: string[] }) => void;
}

interface ImagePrompt {
	prompt: string;
	url?: string;
	loading: boolean;
	error?: string;
}

export function ImageGenerationStep({ videoData, onBack, onNext }: ImageGenerationStepProps) {
	const [imagePrompts, setImagePrompts] = useState<ImagePrompt[]>([]);
	const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
	const [isGeneratingAll, setIsGeneratingAll] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (videoData.images && videoData.images.length > 0) {
			// Initialize with existing images if any
			setImagePrompts(videoData.images.map(url => ({
				prompt: '', // We don't have the original prompts
				url,
				loading: false
			})));
		} else {
			// Generate new prompts on component mount
			generateAllPrompts();
		}
	}, []);

	const generateAllPrompts = async () => {
		try {
			setIsGeneratingPrompts(true);
			setError(null);

			const response = await fetch(`/api/channels/${videoData.channelId}/videos?videoId=${videoData.videoId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					script: videoData.cleanScript,
					generatePrompts: true,
				}),
			});

			if (!response.ok) throw new Error('Failed to generate prompts');

			const data = await response.json();
			if (!data.prompts) throw new Error('No prompts generated');

			setImagePrompts(data.prompts.map((prompt: string) => ({
				prompt,
				loading: false
			})));
		} catch (error) {
			console.error('Error:', error);
			setError('Failed to generate prompts');
		} finally {
			setIsGeneratingPrompts(false);
		}
	};

	const generateNewPrompt = async (index: number) => {
		try {
			setImagePrompts((prev) =>
				prev.map((img, i) => (i === index ? { ...img, loading: true, error: undefined } : img))
			);

			const response = await fetch(`/api/channels/${videoData.channelId}/videos?videoId=${videoData.videoId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					script: videoData.cleanScript,
					generatePrompts: true,
					singlePrompt: true,
				}),
			});

			if (!response.ok) throw new Error('Failed to generate prompt');

			const data = await response.json();
			if (!data.prompts || !data.prompts.length) throw new Error('No prompt generated');

			setImagePrompts((prev) =>
				prev.map((img, i) => (i === index ? { 
					...img, 
					loading: false, 
					prompt: data.prompts[0],
					error: undefined
				} : img))
			);
		} catch (error) {
			console.error('Error:', error);
			setImagePrompts((prev) =>
				prev.map((img, i) => (i === index ? { 
					...img, 
					loading: false, 
					error: 'Failed to generate new prompt'
				} : img))
			);
		}
	};

	const generateImageForPrompt = async (index: number) => {
		try {
			if (!imagePrompts[index].prompt.trim()) {
				throw new Error('Please enter a prompt first');
			}

			setImagePrompts((prev) =>
				prev.map((img, i) => (i === index ? { ...img, loading: true, error: undefined } : img))
			);

			const response = await fetch(`/api/channels/${videoData.channelId}/videos?videoId=${videoData.videoId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					script: imagePrompts[index].prompt,
					generateImage: true,
				}),
			});

			if (!response.ok) throw new Error('Failed to generate image');

			const data = await response.json();
			if (!data.imageUrl) throw new Error('No image generated');

			setImagePrompts((prev) =>
				prev.map((img, i) => (i === index ? { ...img, loading: false, url: data.imageUrl } : img))
			);
		} catch (error) {
			console.error('Error:', error);
			setImagePrompts((prev) =>
				prev.map((img, i) => (i === index ? { 
					...img, 
					loading: false, 
					error: error instanceof Error ? error.message : 'Failed to generate image'
				} : img))
			);
		}
	};

	const generateAllImages = async () => {
		setError(null);
		setIsGeneratingAll(true);
		try {
			for (let i = 0; i < imagePrompts.length; i++) {
				await generateImageForPrompt(i);
			}
		} finally {
			setIsGeneratingAll(false);
		}
	};

	const updatePrompt = (index: number, newPrompt: string) => {
		setImagePrompts((prev) =>
			prev.map((img, i) => (i === index ? { ...img, prompt: newPrompt } : img))
		);
	};

	const handleNext = () => {
		const allImages = imagePrompts.map((img) => img.url).filter((url): url is string => url !== undefined);
		onNext({ images: allImages });
	};

	const hasError = imagePrompts.some((img) => img.error);
	const isComplete = imagePrompts.every((img) => img.url);

	if (isGeneratingPrompts) {
		return (
			<div className='flex flex-col items-center justify-center space-y-4 p-8'>
				<Loader2 className='h-8 w-8 animate-spin' />
				<p>Generating image prompts...</p>
			</div>
		);
	}

	if (isGeneratingAll) {
		const progress = imagePrompts.filter((img) => img.url).length;
		return (
			<div className='flex flex-col items-center justify-center space-y-4 p-8'>
				<Loader2 className='h-8 w-8 animate-spin' />
				<p>Generating images for your {videoData.videoType === 'shorts' ? 'short' : 'video'}...</p>
				<p className='text-sm text-muted-foreground'>
					Generated {progress} of {imagePrompts.length} images
				</p>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			<div className='space-y-4'>
				<h3 className='text-lg font-semibold'>Generated Images</h3>
				<div className='space-y-2'>
					<p className='text-muted-foreground'>
						Review and edit the AI-generated prompts for your {videoData.videoType === 'shorts' ? 'short' : 'video'} images.
						Each prompt will be used to generate a unique image.
					</p>
					<p className='text-sm text-muted-foreground'>
						Tip: Make prompts detailed and specific for better results. You can edit and regenerate images as needed.
					</p>
				</div>
			</div>

			<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
				{imagePrompts.map((imagePrompt, index) => (
					<Card key={index} className='space-y-4 p-4'>
						<div className='space-y-2'>
							<div className='flex items-center justify-between'>
								<p className='text-sm font-medium'>Image {index + 1}</p>
								<Button 
									variant="ghost" 
									size="sm"
									onClick={() => generateNewPrompt(index)}
									className="h-6"
									disabled={imagePrompt.loading}
								>
									<Wand2 className='h-4 w-4 mr-1' />
									New Prompt
								</Button>
							</div>
							<div className="space-y-2">
								<Textarea
									value={imagePrompt.prompt}
									onChange={(e) => updatePrompt(index, e.target.value)}
									placeholder="Enter detailed image prompt..."
									className="min-h-[100px] font-mono text-sm"
								/>
								<div className="flex justify-end">
									<Button 
										variant="outline" 
										size="sm"
										onClick={() => generateImageForPrompt(index)}
										disabled={!imagePrompt.prompt.trim() || imagePrompt.loading}
									>
										{imagePrompt.url ? 'Regenerate with Prompt' : 'Generate with Prompt'}
									</Button>
								</div>
							</div>
						</div>

						<div className='relative aspect-video overflow-hidden rounded-lg bg-muted'>
							{imagePrompt.loading ? (
								<div className='absolute inset-0 flex items-center justify-center'>
									<Loader2 className='h-8 w-8 animate-spin' />
								</div>
							) : imagePrompt.error ? (
								<div className='absolute inset-0 flex flex-col items-center justify-center p-4'>
									<p className='mb-2 text-center text-sm text-destructive'>{imagePrompt.error}</p>
									<Button size='sm' onClick={() => generateImageForPrompt(index)}>
										Try Again
									</Button>
								</div>
							) : imagePrompt.url ? (
								<>
									<Image
										src={imagePrompt.url}
										alt={`Generated image ${index + 1}`}
										fill
										className='object-cover'
									/>
									<Button
										size='icon'
										variant='outline'
										className='absolute right-2 top-2'
										onClick={() => generateImageForPrompt(index)}
									>
										<RefreshCw className='h-4 w-4' />
									</Button>
								</>
							) : (
								<div className='absolute inset-0 flex items-center justify-center'>
									<Button 
										onClick={() => generateImageForPrompt(index)}
										disabled={!imagePrompt.prompt.trim()}
									>
										Generate Image
									</Button>
								</div>
							)}
						</div>
					</Card>
				))}
			</div>

			<div className='flex justify-between pt-4'>
				<Button variant='outline' onClick={onBack}>
					Back to Script
				</Button>
				<div className='space-x-2'>
					<Button 
						variant='outline' 
						onClick={generateAllImages} 
						disabled={isGeneratingAll || !imagePrompts.every(p => p.prompt.trim())}
					>
						Generate All Images
					</Button>
					<Button onClick={handleNext} disabled={isGeneratingAll || !isComplete}>
						Continue to Voiceover
					</Button>
				</div>
			</div>
		</div>
	);
}
