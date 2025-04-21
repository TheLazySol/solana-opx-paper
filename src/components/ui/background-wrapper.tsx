'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic import with fallback for Background component
const BackgroundComponent = dynamic(
  () => import('./background').then(mod => mod.Background),
  { 
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 -z-10 bg-black">
        <div 
          className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(56, 33, 146, 0.12), transparent 60%)' }}
        />
      </div>
    )
  }
);

export function BackgroundWrapper() {
  return (
    <React.Suspense fallback={
      <div className="fixed inset-0 -z-10 bg-black">
        <div 
          className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(56, 33, 146, 0.12), transparent 60%)' }}
        />
      </div>
    }>
      <BackgroundComponent />
    </React.Suspense>
  );
} 