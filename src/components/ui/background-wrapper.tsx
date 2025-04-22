'use client';

import React from 'react';

export function BackgroundWrapper() {
  return (
    <div className="fixed inset-0 -z-10 bg-black">
      <div 
        className="absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(56, 33, 146, 0.12), transparent 60%)' }}
      />
    </div>
  );
} 