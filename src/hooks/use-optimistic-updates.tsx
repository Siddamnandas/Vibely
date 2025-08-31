"use client";

import { useState, useCallback, useRef } from "react";
import { useDevicePerformance } from "@/hooks/use-device-performance";

// Optimistic update hook for immediate UI feedback
export function useOptimisticAction<T, P>() {
  const [optimisticState, setOptimisticState] = useState<T | null>(null);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);
  const deviceProfile = useDevicePerformance();

  const executeOptimistic = useCallback(async (
    optimisticValue: T,
    action: (params: P) => Promise<T>,
    params: P,
    options: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      maxRetries?: number;
      retryDelay?: number;
    } = {}
  ) => {
    const { 
      onSuccess, 
      onError, 
      maxRetries = deviceProfile.isLowEndDevice ? 1 : 3,
      retryDelay = deviceProfile.isLowEndDevice ? 2000 : 1000 
    } = options;

    // Immediately update UI with optimistic value
    setOptimisticState(optimisticValue);
    setIsOptimistic(true);
    setError(null);
    retryCount.current = 0;

    const attemptAction = async (): Promise<void> => {
      try {
        const result = await action(params);
        
        // Success: replace optimistic value with real value
        setOptimisticState(result);
        setIsOptimistic(false);
        retryCount.current = 0;
        onSuccess?.(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Action failed');
        
        if (retryCount.current < maxRetries) {
          // Retry after delay
          retryCount.current++;
          setTimeout(attemptAction, retryDelay);
        } else {
          // Max retries exceeded: revert optimistic state
          setOptimisticState(null);
          setIsOptimistic(false);
          setError(error.message);
          onError?.(error);
        }
      }
    };

    // Start the actual action
    attemptAction();
  }, [deviceProfile.isLowEndDevice]);

  const clearOptimistic = useCallback(() => {
    setOptimisticState(null);
    setIsOptimistic(false);
    setError(null);
    retryCount.current = 0;
  }, []);

  return {
    optimisticState,
    isOptimistic,
    error,
    executeOptimistic,
    clearOptimistic
  };
}

// Optimistic list operations
export function useOptimisticList<T extends { id: string }>() {
  const [items, setItems] = useState<T[]>([]);
  const [optimisticItems, setOptimisticItems] = useState<T[]>([]);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const deviceProfile = useDevicePerformance();

  const addOptimistic = useCallback(async (
    newItem: T,
    action: (item: T) => Promise<T>
  ) => {
    // Add item optimistically
    setOptimisticItems(prev => [newItem, ...prev]);
    setPendingActions(prev => new Set(prev).add(newItem.id));

    try {
      const result = await action(newItem);
      
      // Success: move from optimistic to real items
      setOptimisticItems(prev => prev.filter(item => item.id !== newItem.id));
      setItems(prev => [result, ...prev]);
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(newItem.id);
        return next;
      });
    } catch (error) {
      // Error: remove optimistic item
      setOptimisticItems(prev => prev.filter(item => item.id !== newItem.id));
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(newItem.id);
        return next;
      });
      throw error;
    }
  }, []);

  const removeOptimistic = useCallback(async (
    itemId: string,
    action: (id: string) => Promise<void>
  ) => {
    // Find item to remove
    const itemToRemove = items.find(item => item.id === itemId);
    if (!itemToRemove) return;

    // Remove optimistically
    setItems(prev => prev.filter(item => item.id !== itemId));
    setPendingActions(prev => new Set(prev).add(itemId));

    try {
      await action(itemId);
      
      // Success: item stays removed
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    } catch (error) {
      // Error: restore item
      setItems(prev => [itemToRemove, ...prev]);
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      throw error;
    }
  }, [items]);

  const updateOptimistic = useCallback(async (
    itemId: string,
    updates: Partial<T>,
    action: (id: string, updates: Partial<T>) => Promise<T>
  ) => {
    // Update optimistically
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
    setPendingActions(prev => new Set(prev).add(itemId));

    try {
      const result = await action(itemId, updates);
      
      // Success: replace with server result
      setItems(prev => prev.map(item => 
        item.id === itemId ? result : item
      ));
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    } catch (error) {
      // Error: revert optimistic update (would need original item stored)
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      throw error;
    }
  }, []);

  const allItems = [...optimisticItems, ...items];
  
  return {
    items: allItems,
    pendingActions,
    addOptimistic,
    removeOptimistic,
    updateOptimistic,
    setItems
  };
}

// Optimistic toggle hook for like/favorite/follow actions
export function useOptimisticToggle(initialState: boolean = false) {
  const [state, setState] = useState(initialState);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const deviceProfile = useDevicePerformance();

  const toggle = useCallback(async (
    action: (newState: boolean) => Promise<boolean>
  ) => {
    const newState = !state;
    
    // Immediate UI feedback
    setState(newState);
    setIsOptimistic(true);

    try {
      const result = await action(newState);
      setState(result);
      setIsOptimistic(false);
    } catch (error) {
      // Revert on error
      setState(!newState);
      setIsOptimistic(false);
      throw error;
    }
  }, [state]);

  return {
    state,
    isOptimistic,
    toggle,
    setState
  };
}

// Optimistic counter hook for things like play counts, likes, etc.
export function useOptimisticCounter(initialValue: number = 0) {
  const [value, setValue] = useState(initialValue);
  const [optimisticDelta, setOptimisticDelta] = useState(0);
  const [isPending, setIsPending] = useState(false);

  const increment = useCallback(async (
    action: (delta: number) => Promise<number>,
    delta: number = 1
  ) => {
    // Immediate UI feedback
    setOptimisticDelta(prev => prev + delta);
    setIsPending(true);

    try {
      const result = await action(delta);
      setValue(result);
      setOptimisticDelta(0);
      setIsPending(false);
    } catch (error) {
      // Revert optimistic change
      setOptimisticDelta(prev => prev - delta);
      setIsPending(false);
      throw error;
    }
  }, []);

  const decrement = useCallback(async (
    action: (delta: number) => Promise<number>,
    delta: number = 1
  ) => {
    return increment(action, -delta);
  }, [increment]);

  return {
    value: value + optimisticDelta,
    isPending,
    increment,
    decrement,
    setValue
  };
}