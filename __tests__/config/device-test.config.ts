/**
 * Device Testing Configuration
 * Sets up test environments for different mobile devices and platforms
 */

import { Config } from "jest";

// Device configurations for testing
export const DEVICE_TEST_CONFIGS = {
  "iPhone-SE": {
    testEnvironment: "jsdom",
    testEnvironmentOptions: {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 375, height: 667 },
      devicePixelRatio: 2,
    },
    setupFilesAfterEnv: ["<rootDir>/__tests__/setup/iphone-se-setup.ts"],
  },
  "iPhone-12": {
    testEnvironment: "jsdom",
    testEnvironmentOptions: {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 },
      devicePixelRatio: 3,
    },
    setupFilesAfterEnv: ["<rootDir>/__tests__/setup/iphone-12-setup.ts"],
  },
  "iPhone-14-Pro-Max": {
    testEnvironment: "jsdom",
    testEnvironmentOptions: {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 430, height: 932 },
      devicePixelRatio: 3,
    },
    setupFilesAfterEnv: ["<rootDir>/__tests__/setup/iphone-14-pro-max-setup.ts"],
  },
  "iPad-Air": {
    testEnvironment: "jsdom",
    testEnvironmentOptions: {
      userAgent:
        "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 820, height: 1180 },
      devicePixelRatio: 2,
    },
    setupFilesAfterEnv: ["<rootDir>/__tests__/setup/ipad-air-setup.ts"],
  },
  "Pixel-7": {
    testEnvironment: "jsdom",
    testEnvironmentOptions: {
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36",
      viewport: { width: 393, height: 852 },
      devicePixelRatio: 2.75,
    },
    setupFilesAfterEnv: ["<rootDir>/__tests__/setup/pixel-7-setup.ts"],
  },
  "Galaxy-S23": {
    testEnvironment: "jsdom",
    testEnvironmentOptions: {
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36",
      viewport: { width: 360, height: 780 },
      devicePixelRatio: 3,
    },
    setupFilesAfterEnv: ["<rootDir>/__tests__/setup/galaxy-s23-setup.ts"],
  },
  "OnePlus-11": {
    testEnvironment: "jsdom",
    testEnvironmentOptions: {
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; CPH2449) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36",
      viewport: { width: 412, height: 915 },
      devicePixelRatio: 3.5,
    },
    setupFilesAfterEnv: ["<rootDir>/__tests__/setup/oneplus-11-setup.ts"],
  },
  "Galaxy-Tab-S8": {
    testEnvironment: "jsdom",
    testEnvironmentOptions: {
      userAgent:
        "Mozilla/5.0 (Linux; Android 12; SM-X706B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
      viewport: { width: 712, height: 1138 },
      devicePixelRatio: 2.5,
    },
    setupFilesAfterEnv: ["<rootDir>/__tests__/setup/galaxy-tab-s8-setup.ts"],
  },
};

// Generate Jest projects for each device
export const generateDeviceProjects = (): Config["projects"] => {
  return Object.entries(DEVICE_TEST_CONFIGS).map(([deviceName, config]) => ({
    displayName: {
      name: deviceName,
      color: deviceName.includes("iPhone") || deviceName.includes("iPad") ? "blue" : "green",
    },
    testMatch: [
      `<rootDir>/__tests__/device-specific/${deviceName}/**/*.test.{js,ts,tsx}`,
      `<rootDir>/__tests__/cross-platform/**/*.test.{js,ts,tsx}`,
    ],
    ...config,
  }));
};

// Main Jest configuration for device testing
const deviceTestConfig: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",

  // Use projects for multi-device testing
  projects: generateDeviceProjects(),

  // Coverage configuration
  collectCoverageFrom: [
    "src/lib/mobile-*.ts",
    "src/lib/device-*.ts",
    "src/hooks/use-*.ts",
    "src/components/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],

  coverageReporters: ["text", "html", "json"],

  // Global setup and teardown
  globalSetup: "<rootDir>/__tests__/setup/global-setup.ts",
  globalTeardown: "<rootDir>/__tests__/setup/global-teardown.ts",

  // Module name mapping
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/__mocks__/(.*)$": "<rootDir>/__mocks__/$1",
    "^@/__tests__/(.*)$": "<rootDir>/__tests__/$1",
  },

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup/common-setup.ts"],

  // Transform configuration
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Test timeout
  testTimeout: 30000,

  // Reporters
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "test-results",
        outputName: "device-compatibility-results.xml",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],

  // Verbose output
  verbose: true,
};

export default deviceTestConfig;
