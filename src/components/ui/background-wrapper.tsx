'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic import with fallback for Background component
const BackgroundComponent = dynamic(
  () => import('./background').then(mod => mod.Background),
  { 
    ssr: false,
    loading: () => <div className="fixed inset-0 -z-10 bg-black" />
  }
);

export function BackgroundWrapper() {
  return <BackgroundComponent />;
} 