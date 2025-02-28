'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import { VideoIdeasStep } from '@/components/video-steps/VideoIdeasStep';
import { ScriptGenerationStep } from '@/components/video-steps/ScriptGenerationStep';
import { ImageGenerationStep } from '@/components/video-steps/ImageGenerationStep';
import { VoiceoverGenerationStep } from '@/components/video-steps/VoiceoverGenerationStep';
import { MusicSelectionStep } from '@/components/video-steps/MusicSelectionStep';
import { FinalizeVideoStep } from '@/components/video-steps/FinalizeVideoStep';
import {
	VideoIdea,
	VideoStepData,
	ScriptStepData,
	ImageStepData,
	VoiceoverStepData,
	MusicStepData,
	FinalizeStepData,
} from '@/types/video';

const steps = [
	{ title: 'Video Ideas' },
	{ title: 'Script' },
	{ title: 'Images' },
	{ title: 'Voiceover' },
	{ title: 'Music' },
	{ title: 'Finalize' },
];

interface CreateVideoStepperProps {
	channelId: string;
	onComplete: () => void;
}

type StepData = {
	1: VideoStepData;
	2: ScriptStepData;
	3: ImageStepData;
	4: VoiceoverStepData;
	5: MusicStepData;
	6: FinalizeStepData;
};

export function CreateVideoStepper({ channelId, onComplete }: CreateVideoStepperProps) {
	const [currentStep, setCurrentStep] = useState(1);
	const [videoData, setVideoData] = useState<VideoStepData>({});

	const updateVideoData = (data: Partial<VideoStepData>) => {
		setVideoData((prev) => ({ ...prev, ...data }));
	};

	const handleNext = () => {
		setCurrentStep((prev) => Math.min(prev + 1, steps.length));
	};

	const handleBack = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 1));
	};

	const validateStepData = <T extends keyof StepData>(step: T, data: VideoStepData): data is StepData[T] => {
		switch (step) {
			case 2:
				return (
					'selectedIdea' in data && 
					'videoType' in data && 
					'videoId' in data &&
					data.selectedIdea !== undefined && 
					data.videoType !== undefined &&
					data.videoId !== undefined
				);
			case 3:
				return (
					'selectedIdea' in data && 
					'videoType' in data && 
					'videoId' in data &&
					'script' in data && 
					'cleanScript' in data && 
					data.selectedIdea !== undefined && 
					data.videoType !== undefined && 
					data.videoId !== undefined &&
					data.script !== undefined && 
					data.cleanScript !== undefined
				);
			case 4:
				return (
					'selectedIdea' in data &&
					'videoType' in data &&
					'videoId' in data &&
					'script' in data &&
					'cleanScript' in data &&
					'images' in data &&
					data.selectedIdea !== undefined &&
					data.videoType !== undefined &&
					data.videoId !== undefined &&
					data.script !== undefined &&
					data.cleanScript !== undefined &&
					data.images !== undefined
				);
			case 5:
				return (
					'selectedIdea' in data &&
					'videoType' in data &&
					'videoId' in data &&
					'script' in data &&
					'cleanScript' in data &&
					'images' in data &&
					'voiceovers' in data &&
					data.selectedIdea !== undefined &&
					data.videoType !== undefined &&
					data.videoId !== undefined &&
					data.script !== undefined &&
					data.cleanScript !== undefined &&
					data.images !== undefined &&
					data.voiceovers !== undefined
				);
			case 6:
				return (
					'selectedIdea' in data &&
					'videoType' in data &&
					'videoId' in data &&
					'script' in data &&
					'cleanScript' in data &&
					'images' in data &&
					'voiceovers' in data &&
					'music' in data &&
					data.selectedIdea !== undefined &&
					data.videoType !== undefined &&
					data.videoId !== undefined &&
					data.script !== undefined &&
					data.cleanScript !== undefined &&
					data.images !== undefined &&
					data.voiceovers !== undefined &&
					data.music !== undefined
				);
			default:
				return true;
		}
	};

	const renderStep = () => {
		switch (currentStep) {
			case 1:
				return (
					<VideoIdeasStep
						channelId={channelId}
						onNext={(data: { selectedIdea: VideoIdea; videoType: 'shorts' | 'long'; videoId: string }) => {
							console.log('data in video ideas step...', data, channelId);
							updateVideoData({
								...data,
								channelId,
								videoId: data.videoId, // Store the videoId from initial creation
							});
							handleNext();
						}}
					/>
				);
			case 2:
				if (!validateStepData(2, videoData)) {
					handleBack();
					return null;
				}
				return (
					<ScriptGenerationStep
						videoData={{
							...videoData,
							channelId,
						}}
						onBack={handleBack}
          onNext={(data: { script: string; cleanScript: string; videoId: string }) => {
            updateVideoData({
              ...videoData,
              script: data.script,
              cleanScript: data.cleanScript,
              videoId: data.videoId,
            });
            handleNext();
          }}
					/>
				);
			case 3:
				if (!validateStepData(3, videoData)) {
					handleBack();
					return null;
				}
				return (
					<ImageGenerationStep
						videoData={videoData}
						onBack={handleBack}
						onNext={(data: { images: string[] }) => {
							updateVideoData({
								...videoData,
								images: data.images,
							});
							handleNext();
						}}
					/>
				);
			case 4:
				if (!validateStepData(4, videoData)) {
					handleBack();
					return null;
				}
				return (
					<VoiceoverGenerationStep
						videoData={videoData}
						onBack={handleBack}
						onNext={(data: { voiceovers: string[] }) => {
							updateVideoData({
								...videoData,
								voiceovers: data.voiceovers,
							});
							handleNext();
						}}
					/>
				);
			case 5:
				if (!validateStepData(5, videoData)) {
					handleBack();
					return null;
				}
				return (
					<MusicSelectionStep
						videoData={videoData}
						onBack={handleBack}
						onNext={(data: { music: string }) => {
							updateVideoData({
								...videoData,
								music: data.music,
							});
							handleNext();
						}}
					/>
				);
			case 6:
				if (!validateStepData(6, videoData)) {
					handleBack();
					return null;
				}
				return (
					<FinalizeVideoStep
						channelId={channelId}
						videoData={videoData as FinalizeStepData}
						onBack={handleBack}
						onComplete={onComplete}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<div className='space-y-8 py-4'>
			<div className='flex w-full flex-col items-center'>
				<Stepper steps={steps} currentStep={currentStep} className='px-4' />
			</div>
			<Card className='mt-8'>
				<div className='p-6'>{renderStep()}</div>
			</Card>
		</div>
	);
}
