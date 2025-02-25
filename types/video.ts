export interface VideoIdea {
  title: string;
  idea: string;
}

export interface CompetitorVideo {
  title: string;
  description: string;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
}

export interface Video {
  id: string;
  channelId: string;
  title: string;
  idea: string;
  script?: string;
  images: string[];
  voiceovers: string[];
  music?: string;
  status: VideoStatus;
  createdAt: string;
  updatedAt: string;
}

export type VideoStatus = 'in_progress' | 'completed';

// API Request Types
export interface GenerateVideoIdeasRequest {
  generateIdeas: true;
  competitorVideos: CompetitorVideo[];
}

export interface CreateVideoRequest {
  selectedIdea: VideoIdea;
}

export interface GenerateImageRequest {
  generateImage: true;
  script: string;
}

export interface GenerateVoiceoverRequest {
  generateVoiceover: true;
  script: string;
}

export interface UpdateVideoRequest {
  script?: string;
  images?: string[];
  voiceovers?: string[];
  music?: string;
  status?: VideoStatus;
}

export interface FinalizeVideoRequest {
  selectedIdea: VideoIdea;
  script: string;
  images: string[];
  voiceovers: string[];
  music: string;
  status: 'completed';
}

export type VideoApiRequest =
  | GenerateVideoIdeasRequest
  | CreateVideoRequest
  | GenerateImageRequest
  | GenerateVoiceoverRequest
  | UpdateVideoRequest
  | FinalizeVideoRequest;

// Step Data Types
export interface VideoStepData {
  selectedIdea?: VideoIdea;
  script?: string;
  images?: string[];
  voiceovers?: string[];
  music?: string;
}

export interface ScriptStepData extends VideoStepData {
  selectedIdea: VideoIdea;
}

export interface ImageStepData extends ScriptStepData {
  script: string;
}

export interface VoiceoverStepData extends ImageStepData {
  images: string[];
}

export interface MusicStepData extends VoiceoverStepData {
  voiceovers: string[];
}

export interface FinalizeStepData extends Required<VideoStepData> {}

// Type Guards
export function isGenerateIdeasRequest(body: VideoApiRequest): body is GenerateVideoIdeasRequest {
  return 'generateIdeas' in body && body.generateIdeas === true;
}

export function isCreateVideoRequest(body: VideoApiRequest): body is CreateVideoRequest {
  return 'selectedIdea' in body && !('status' in body);
}

export function isGenerateImageRequest(body: VideoApiRequest): body is GenerateImageRequest {
  return 'generateImage' in body && body.generateImage === true;
}

export function isGenerateVoiceoverRequest(body: VideoApiRequest): body is GenerateVoiceoverRequest {
  return 'generateVoiceover' in body && body.generateVoiceover === true;
}

export function isFinalizeVideoRequest(body: VideoApiRequest): body is FinalizeVideoRequest {
  return 'selectedIdea' in body && 'status' in body && body.status === 'completed';
}
