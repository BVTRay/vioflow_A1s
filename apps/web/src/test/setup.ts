import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3009',
    hostname: 'localhost',
    origin: 'http://localhost:3009',
  },
  writable: true,
});




















