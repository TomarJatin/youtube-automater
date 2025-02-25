import { google } from 'googleapis';
import { prisma } from './prisma';
import { Readable } from 'stream';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI,
);

export async function getYouTubeClient(channelId: string) {
  try {
    // Get connected channel
    const connectedChannel = await prisma.connectedChannel.findUnique({
      where: { channelId },
    });

    if (!connectedChannel) {
      throw new Error('Channel not connected to YouTube');
    }

    // Set credentials
    oauth2Client.setCredentials({
      access_token: connectedChannel.accessToken,
      refresh_token: connectedChannel.refreshToken,
      expiry_date: connectedChannel.expiresAt.getTime(),
    });

    // Check if token needs refresh
    if (connectedChannel.expiresAt < new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update tokens in database
      await prisma.connectedChannel.update({
        where: { channelId },
        data: {
          accessToken: credentials.access_token!,
          refreshToken: credentials.refresh_token || connectedChannel.refreshToken,
          expiresAt: new Date(credentials.expiry_date!),
        },
      });

      // Update client credentials with new tokens
      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || connectedChannel.refreshToken,
        expiry_date: credentials.expiry_date,
      });
    }

    // Return initialized YouTube client
    return google.youtube({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.error('Error getting YouTube client:', error);
    throw error;
  }
}

export async function getChannelInfo(channelId: string) {
  try {
    const youtube = await getYouTubeClient(channelId);
    
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true,
    });

    return response.data.items?.[0];
  } catch (error) {
    console.error('Error getting channel info:', error);
    throw error;
  }
}

export async function uploadVideo(
  channelId: string,
  title: string,
  description: string,
  filePath: string,
  privacyStatus: 'private' | 'unlisted' | 'public' = 'private'
) {
  try {
    const youtube = await getYouTubeClient(channelId);
    
    const fileStream = Readable.from(filePath);

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
        },
        status: {
          privacyStatus,
        },
      },
      media: {
        body: fileStream,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
}
