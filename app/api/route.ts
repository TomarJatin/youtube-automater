import { NextRequest, NextResponse } from 'next/server';
import { HttpStatusCode } from 'axios';

export const GET = async (req: NextRequest) => {
	console.log('Hello World');
	return NextResponse.json({ message: 'Hello World' }, { status: HttpStatusCode.Ok });
};
