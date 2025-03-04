import React from 'react';
import Image from 'next/image';

export function Background() {
  return (

      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Image
          src="/WebPageBackground.png"
          alt="Background"
          fill
          priority
          quality={100}
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: 1,
          }}
        />
      </div>
  );
}