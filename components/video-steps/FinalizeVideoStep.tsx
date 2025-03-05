'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, PlayCircle, PauseCircle, RefreshCw, Upload, Youtube, Edit2, RotateCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FinalizeStepData, VideoUploadMetadata } from '@/types/video';
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
	const [videoGenerated, setVideoGenerated] = useState(false);
	const [videoUrl, setVideoUrl] = useState<string | null>(null);
	const [isPreviewMode, setIsPreviewMode] = useState(false);
	const [metadataGenerated, setMetadataGenerated] = useState(false);
	const [uploadMetadata, setUploadMetadata] = useState<VideoUploadMetadata & {
		editableTitle?: string;
		editableDescription?: string;
		editableTags?: string;
	} | null>(null);
	const [generatingMetadata, setGeneratingMetadata] = useState(false);
	const [isEditing, setIsEditing] = useState({
		title: false,
		description: false,
		tags: false
	});
	const [regeneratingStates, setRegeneratingStates] = useState({
		title: false,
		description: false,
		tags: false,
		thumbnail: false
	});
	const [isUploading, setIsUploading] = useState(false);
	const [uploadSuccess, setUploadSuccess] = useState(false);

	const generateUploadMetadata = async () => {
		try {
			setGeneratingMetadata(true);
			setError(null);
			const response = await fetch(`/api/channels/${channelId}/videos/${videoData.videoId}/metadata`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					title: videoData.selectedIdea.title,
					description: videoData.selectedIdea.idea,
					script: videoData.cleanScript,
					videoType: videoData.videoType,
				}),
			});

			if (!response.ok) throw new Error('Failed to generate metadata');

			const metadata = await response.json();
			setUploadMetadata(metadata);
			setMetadataGenerated(true);
		} catch (error) {
			console.error('Error generating metadata:', error);
			setError('Failed to generate video metadata');
		} finally {
			setGeneratingMetadata(false);
		}
	};

	const uploadToYouTube = async () => {
		if (!uploadMetadata || !videoUrl) return;

		try {
			setIsUploading(true);
			setError(null);

			// Prepare final metadata with edited values
			const finalMetadata = {
				...uploadMetadata,
				title: uploadMetadata.editableTitle || uploadMetadata.title,
				description: uploadMetadata.editableDescription || uploadMetadata.description,
				tags: uploadMetadata.editableTags ? 
					uploadMetadata.editableTags.split(',').map(tag => tag.trim()).filter(Boolean) : 
					uploadMetadata.tags
			};

			const response = await fetch(`/api/channels/${channelId}/videos/${videoData.videoId}/upload`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					videoUrl,
					...finalMetadata,
					videoType: videoData.videoType,
				}),
			});

			if (!response.ok) throw new Error('Failed to upload video');

			const data = await response.json();
			setUploadSuccess(true);
			setTimeout(() => {
				onComplete();
			}, 2000);
		} catch (error) {
			console.error('Error:', error);
			setError('Failed to upload video. Please try again.');
		} finally {
			setIsUploading(false);
		}
	};

	const generateVideo = async (isPreview = false) => {
		try {
			setLoading(true);
			setError(null);
			setRegeneratingStates({
				title: false,
				description: false,
				tags: false,
				thumbnail: false
			});

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
					status: isPreview ? 'preview' : 'completed',
				}),
			});

			if (!response.ok) throw new Error('Failed to generate video');

			const data = await response.json();
			setVideoUrl(data.videoUrl);
			
			if (!isPreview) {
				setVideoGenerated(true);
			} else {
				setIsPreviewMode(true);
			}
		} catch (error) {
			console.error('Error:', error);
			setError('Failed to generate video. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const finalizeVideo = async () => {
		await generateVideo(false);
	};

	const previewVideo = async () => {
		await generateVideo(true);
	};

	const regenerateVideo = async () => {
		setRegeneratingStates({
			title: true,
			description: true,
			tags: true,
			thumbnail: true
		});
		setVideoUrl(null);
		await generateVideo(true);
	};

	const exitPreviewMode = () => {
		setIsPreviewMode(false);
		setVideoUrl(null);
	};

	if (uploadSuccess) {
		return (
			<div className='flex flex-col items-center justify-center space-y-4 p-8'>
				<Youtube className='h-16 w-16 text-primary' />
				<h3 className='text-xl font-semibold'>Video Uploaded Successfully!</h3>
				<p className='text-center text-muted-foreground'>
					Your video has been uploaded to YouTube and will be available shortly.
				</p>
			</div>
		);
	}

	if (videoGenerated && videoUrl) {
		return (
			<div className='flex flex-col items-center justify-center space-y-4 p-8'>
				<CheckCircle2 className='h-16 w-16 text-primary' />
				<h3 className='text-xl font-semibold'>
					{videoData.videoType === 'shorts' ? 'Short' : 'Video'} Created Successfully!
				</h3>
				<div className='mt-4 w-full max-w-md space-y-4'>
					{videoUrl && (
						<video className='w-full rounded-lg shadow-lg' controls autoPlay muted>
							<source src={videoUrl} type='video/mp4' />
							Your browser does not support the video tag.
						</video>
					)}

			<Card className='p-4'>
				<div className='flex items-center justify-between mb-4'>
					<h4 className='font-medium'>Upload Details</h4>
					{!metadataGenerated && (
						<Button 
							onClick={generateUploadMetadata}
							disabled={generatingMetadata}
							className='gap-2'
						>
							{generatingMetadata ? (
								<>
									<Loader2 className='h-4 w-4 animate-spin' />
									Generating Metadata...
								</>
							) : (
								<>
									<Edit2 className='h-4 w-4' />
									Generate Metadata
								</>
							)}
						</Button>
					)}
				</div>
				<div className='space-y-6'>
					{/* Title Section */}
					<div className='space-y-2'>
						<div className='flex items-center justify-between'>
							<p className='text-sm font-medium'>Title</p>
							<div className='flex gap-2'>
								<Button 
									size='sm' 
									variant='ghost'
									onClick={() => setIsEditing({ ...isEditing, title: !isEditing.title })}
								>
									<Edit2 className='h-4 w-4' />
								</Button>
								<Button
									size='sm'
									variant='ghost'
									onClick={async () => {
										setRegeneratingStates(prev => ({ ...prev, title: true }));
										try {
											const response = await fetch(`/api/channels/${channelId}/videos/${videoData.videoId}/metadata`, {
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({
													title: videoData.selectedIdea.title,
													description: videoData.selectedIdea.idea,
													script: videoData.cleanScript,
													videoType: videoData.videoType,
													regenerateType: 'title'
												})
											});
											const data = await response.json();
											setUploadMetadata(prev => prev ? {
												...prev,
												title: data.title,
												editableTitle: data.title
											} : null);
										} catch (error) {
											console.error('Error regenerating title:', error);
										} finally {
											setRegeneratingStates(prev => ({ ...prev, title: false }));
										}
									}}
									disabled={regeneratingStates.title}
								>
									{regeneratingStates.title ? (
										<Loader2 className='h-4 w-4 animate-spin' />
									) : (
										<RotateCw className='h-4 w-4' />
									)}
								</Button>
							</div>
						</div>
						{uploadMetadata && (
							isEditing.title ? (
								<Input
									value={uploadMetadata.editableTitle || uploadMetadata.title}
									onChange={(e) => setUploadMetadata(prev => prev ? {
										...prev,
										editableTitle: e.target.value
									} : null)}
									className='w-full'
								/>
							) : (
								<p className='text-sm text-muted-foreground'>{uploadMetadata.editableTitle || uploadMetadata.title}</p>
							)
						)}
					</div>

					{/* Description Section */}
					<div className='space-y-2'>
						<div className='flex items-center justify-between'>
							<p className='text-sm font-medium'>Description</p>
							<div className='flex gap-2'>
								<Button 
									size='sm' 
									variant='ghost'
									onClick={() => setIsEditing({ ...isEditing, description: !isEditing.description })}
								>
									<Edit2 className='h-4 w-4' />
								</Button>
								<Button
									size='sm'
									variant='ghost'
									onClick={async () => {
										setRegeneratingStates(prev => ({ ...prev, description: true }));
										try {
											const response = await fetch(`/api/channels/${channelId}/videos/${videoData.videoId}/metadata`, {
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({
													title: videoData.selectedIdea.title,
													description: videoData.selectedIdea.idea,
													script: videoData.cleanScript,
													videoType: videoData.videoType,
													regenerateType: 'description'
												})
											});
											const data = await response.json();
											setUploadMetadata(prev => prev ? {
												...prev,
												description: data.description,
												editableDescription: data.description
											} : null);
										} catch (error) {
											console.error('Error regenerating description:', error);
										} finally {
											setRegeneratingStates(prev => ({ ...prev, description: false }));
										}
									}}
									disabled={regeneratingStates.description}
								>
									{regeneratingStates.description ? (
										<Loader2 className='h-4 w-4 animate-spin' />
									) : (
										<RotateCw className='h-4 w-4' />
									)}
								</Button>
							</div>
						</div>
						{uploadMetadata && (
							isEditing.description ? (
								<Textarea
									value={uploadMetadata.editableDescription || uploadMetadata.description}
									onChange={(e) => setUploadMetadata(prev => prev ? {
										...prev,
										editableDescription: e.target.value
									} : null)}
									className='min-h-[200px] w-full'
								/>
							) : (
								<p className='whitespace-pre-wrap text-sm text-muted-foreground'>
									{uploadMetadata.editableDescription || uploadMetadata.description}
								</p>
							)
						)}
					</div>

					{/* Tags Section */}
					<div className='space-y-2'>
						<div className='flex items-center justify-between'>
							<p className='text-sm font-medium'>Tags</p>
							<div className='flex gap-2'>
								<Button 
									size='sm' 
									variant='ghost'
									onClick={() => setIsEditing({ ...isEditing, tags: !isEditing.tags })}
								>
									<Edit2 className='h-4 w-4' />
								</Button>
								<Button
									size='sm'
									variant='ghost'
									onClick={async () => {
										setRegeneratingStates(prev => ({ ...prev, tags: true }));
										try {
											const response = await fetch(`/api/channels/${channelId}/videos/${videoData.videoId}/metadata`, {
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({
													title: videoData.selectedIdea.title,
													description: videoData.selectedIdea.idea,
													script: videoData.cleanScript,
													videoType: videoData.videoType,
													regenerateType: 'tags'
												})
											});
											const data = await response.json();
											setUploadMetadata(prev => prev ? {
												...prev,
												tags: data.tags,
												editableTags: data.tags.join(', ')
											} : null);
										} catch (error) {
											console.error('Error regenerating tags:', error);
										} finally {
											setRegeneratingStates(prev => ({ ...prev, tags: false }));
										}
									}}
									disabled={regeneratingStates.tags}
								>
									{regeneratingStates.tags ? (
										<Loader2 className='h-4 w-4 animate-spin' />
									) : (
										<RotateCw className='h-4 w-4' />
									)}
								</Button>
							</div>
						</div>
						{uploadMetadata && (
							isEditing.tags ? (
								<Input
									value={uploadMetadata.editableTags || uploadMetadata.tags.join(', ')}
									onChange={(e) => setUploadMetadata(prev => prev ? {
										...prev,
										editableTags: e.target.value,
										tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
									} : null)}
									placeholder='Enter tags separated by commas'
									className='w-full'
								/>
							) : (
								<div className='flex flex-wrap gap-2'>
									{uploadMetadata.tags.map((tag, index) => (
										<span key={index} className='rounded-full bg-secondary px-2 py-1 text-xs'>
											{tag}
										</span>
									))}
								</div>
							)
						)}
					</div>

					{/* Thumbnail Section */}
					<div className='space-y-2'>
						<div className='flex items-center justify-between'>
							<p className='text-sm font-medium'>Thumbnail</p>
							<Button
								size='sm'
								variant='ghost'
								onClick={async () => {
									setRegeneratingStates(prev => ({ ...prev, thumbnail: true }));
									try {
										const response = await fetch(`/api/channels/${channelId}/videos/${videoData.videoId}/metadata`, {
											method: 'POST',
											headers: { 'Content-Type': 'application/json' },
											body: JSON.stringify({
												title: videoData.selectedIdea.title,
												description: videoData.selectedIdea.idea,
												script: videoData.cleanScript,
												videoType: videoData.videoType,
												regenerateType: 'thumbnail'
											})
										});
										const data = await response.json();
										setUploadMetadata(prev => prev ? {
											...prev,
											thumbnail: data.thumbnail
										} : null);
									} catch (error) {
										console.error('Error regenerating thumbnail:', error);
									} finally {
										setRegeneratingStates(prev => ({ ...prev, thumbnail: false }));
									}
								}}
								disabled={regeneratingStates.thumbnail}
							>
								{regeneratingStates.thumbnail ? (
									<Loader2 className='h-4 w-4 animate-spin' />
								) : (
									<RotateCw className='h-4 w-4' />
								)}
							</Button>
						</div>
						{uploadMetadata && (
							<div className='relative aspect-video w-full overflow-hidden rounded-lg'>
								<Image
									src={uploadMetadata.thumbnail}
									alt='Video thumbnail'
									fill
									className='object-cover'
								/>
							</div>
						)}
					</div>
				</div>
			</Card>

					{metadataGenerated && uploadMetadata && (
						<Button 
							className='w-full' 
							onClick={() => {
								// Use the edited values for upload
								uploadToYouTube();
							}} 
							disabled={isUploading || Object.values(regeneratingStates).some(Boolean)}
						>
							{isUploading ? (
								<>
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									Uploading to YouTube...
								</>
							) : (
								<>
									<Upload className='mr-2 h-4 w-4' />
									Upload to YouTube
								</>
							)}
						</Button>
					)}

					{error && (
						<div className='text-center text-destructive'>
							<p>{error}</p>
						</div>
					)}
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className='flex flex-col items-center justify-center space-y-4 p-8'>
				<Loader2 className='h-8 w-8 animate-spin' />
				<p>
					{Object.values(regeneratingStates).some(Boolean)
						? 'Regenerating your video...'
						: isPreviewMode
						? 'Generating video preview...'
						: `Finalizing your ${videoData.videoType === 'shorts' ? 'short' : 'video'}...`}
				</p>
			</div>
		);
	}

	if (isPreviewMode && videoUrl) {
		return (
			<div className='space-y-6'>
				<div className='space-y-4'>
					<h3 className='text-lg font-semibold'>Video Preview</h3>
					<p className='text-muted-foreground'>
						Review your {videoData.videoType === 'shorts' ? 'YouTube Short' : 'video'} before finalizing.
					</p>
				</div>

				<div className='flex flex-col items-center space-y-6'>
					<div className='w-full max-w-md'>
						<video className='w-full rounded-lg shadow-lg' controls autoPlay>
							<source src={videoUrl} type='video/mp4' />
							Your browser does not support the video tag.
						</video>
					</div>

					{error && (
						<div className='text-center text-destructive'>
							<p>{error}</p>
						</div>
					)}

					<div className='flex w-full justify-between space-x-4'>
						<Button variant='outline' onClick={exitPreviewMode}>
							Back to Edit
						</Button>
						<Button variant='outline' onClick={regenerateVideo} disabled={loading} className='gap-2'>
							<RefreshCw className='h-4 w-4' />
							Regenerate Video
						</Button>
						<Button onClick={finalizeVideo} disabled={loading}>
							Finalize {videoData.videoType === 'shorts' ? 'Short' : 'Video'}
						</Button>
					</div>
				</div>
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
					<div className='space-x-3'>
						<Button variant='outline' onClick={previewVideo} disabled={loading}>
							Preview Video
						</Button>
						<Button onClick={finalizeVideo} disabled={loading}>
							Create {videoData.videoType === 'shorts' ? 'Short' : 'Video'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
