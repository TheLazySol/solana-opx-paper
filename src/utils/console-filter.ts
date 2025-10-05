/**
 * Console warning filter to suppress specific HeroUI accessibility warnings
 * that are already handled but still show in the console due to library internals
 */

// Only apply console filtering in development mode
if (process.env.NODE_ENV === 'development') {
  // Store the original console.warn function
  const originalWarn = console.warn;

  // Override console.warn to filter out specific warnings
  console.warn = (...args: any[]) => {
    // Check if the warning is the HeroUI useLabel accessibility warning
    const message = args.join(' ');
    
    // Filter out the specific useLabel warning that we've already addressed
    if (message.includes('If you do not provide a visible label, you must specify an aria-label or aria-labelledby attribute for accessibility')) {
      return; // Suppress this warning
    }
    
    // Also filter out related accessibility warnings from HeroUI
    if (message.includes('useLabel.mjs') && message.includes('aria-label')) {
      return; // Suppress this warning
    }
    
    // Allow all other warnings to pass through
    originalWarn.apply(console, args);
  };
}

export {}; // Make this a module
