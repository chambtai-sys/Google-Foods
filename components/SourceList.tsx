import React from 'react';
import { GroundingSource } from '../types';
import { Globe } from 'lucide-react';

interface SourceListProps {
  sources: GroundingSource[];
}

export const SourceList: React.FC<SourceListProps> = ({ sources }) => {
  if (sources.length === 0) return null;

  // Deduplicate sources by URI
  const uniqueSources = Array.from(
    new Map<string, GroundingSource>(
      sources.map((item) => [item.uri, item] as [string, GroundingSource])
    ).values()
  );

  return (
    <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
      <div className="flex items-center gap-2 mb-3 text-gray-700 font-medium">
        <Globe className="w-4 h-4" />
        <span className="text-sm uppercase tracking-wider">Sources from Google Search</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {uniqueSources.map((source, idx) => (
          <a
            key={idx}
            href={source.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors truncate max-w-[200px]"
            title={source.title}
          >
            <span className="truncate">{source.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
};