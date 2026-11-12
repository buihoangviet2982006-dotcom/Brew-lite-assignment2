import '@testing-library/jest-dom/vitest';

// Enable React 18 act() environment support in jsdom
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
