import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '26ede18bf6524e29ac43a954d495b7fe',
  baseURL: 'https://playgroundbnd.openai.azure.com/openai/deployments/playground',
  defaultQuery: { 'api-version': '2024-08-01-preview' },
  defaultHeaders: { 'api-key': '26ede18bf6524e29ac43a954d495b7fe' },
});

export async function POST(req: Request) {
  try {
    const { script } = await req.json();
    
    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }
    
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a music selection expert for videos.',
        },
        {
          role: 'user',
          content: `Based on the following video script, suggest appropriate music moods and genres that would complement the content. Return your response as a JSON object with "moods" and "genres" arrays (3-5 items each).
          
          Script: ${script}`,
        },
      ],
      model: 'gpt-4',
      response_format: { type: 'json_object' },
    });
    
    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('Failed to generate music suggestions');
    }
    
    const suggestions = JSON.parse(content);
    
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating music suggestions:', error);
    return NextResponse.json({ error: 'Failed to generate music suggestions' }, { status: 500 });
  }
}
