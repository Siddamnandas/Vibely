import { track as trackEvent } from "@/lib/analytics";

// Hook for measuring specific operations
export function usePerformanceMeasure() {
  const measureOperation = <T>(
    operationName: string,
    operation: () => T | Promise<T>,
  ): Promise<{ result: T; duration: number }> => {
    return new Promise(async (resolve) => {
      const startTime = performance.now();

      try {
        const result = await operation();
        const duration = performance.now() - startTime;

        trackEvent("operation_performance", {
          operation: operationName,
          duration,
          success: true,
        });

        resolve({ result, duration });
      } catch (error) {
        const duration = performance.now() - startTime;

        trackEvent("operation_performance", {
          operation: operationName,
          duration,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        throw error;
      }
    });
  };

  return { measureOperation };
}
