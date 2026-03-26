/**
 * Main API exports
 * Central point for importing all API services
 */

// Common exports
export * from './common';

// Events API (excluding MajorCategory to avoid conflict)
export * from './events';

// Majors API (MajorCategory is the canonical source)
export * from './majors';
