import { NextResponse } from 'next/server';
import { getGraphifyContext } from '@/lib/graphify';
import { getDemoContext } from '@/lib/bob-adapter';

export async function GET() {
  const context = getDemoContext();
  const changedPaths = context.filesChanged.map(f => f.path);
  const graphCtx = getGraphifyContext(changedPaths);
  return NextResponse.json(graphCtx);
}
