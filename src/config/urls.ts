/**
 * URL Configuration
 * Centralizes all app and marketing URLs
 */

export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8081';
export const MARKETING_URL = import.meta.env.VITE_MARKETING_URL || 'http://localhost:3000';

// API endpoints (if needed)
export const API_BASE_URL = import.meta.env.VITE_API_URL || APP_URL;

