export interface Channel {
	id: string;
	niche: string;
	name: string;
	description: string;
	profilePicture: string;
	banner: string;
	createdAt: Date;
	updatedAt: Date;
	connectedChannel?: ConnectedChannel | null;
}

export interface ConnectedChannel {
	id: string;
	channelId: string;
	avatarUrl: string;
	accessToken: string;
	refreshToken: string;
	expiresAt: Date;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface CompetitorChannel {
	id: string;
	channelId: string;
	name: string;
	url: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface Video {
	id: string;
	channelId: string;
	title: string;
	idea: string;
	script?: string | null;
	images: string[];
	voiceovers: string[];
	music?: string | null;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}
