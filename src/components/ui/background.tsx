import React from 'react';
import Image from 'next/image';

export function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/80"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(56, 33, 146, 0.12), transparent 60%)' }}
      />
      <Image
        src="/WebPageBackground.png"
        alt="Background"
        fill
        priority
        quality={90}
        style={{
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: 0.6,
        }}
        onError={(e) => {
          // If image fails to load, ensure it doesn't break the app
          console.error('Failed to load background image');
          if (e.target) {
            (e.target as HTMLImageElement).style.display = 'none';
          }
        }}
      />
    </div>
  );
}