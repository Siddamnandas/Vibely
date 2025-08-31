"use client";

import React from "react";

// Thin wrapper around React.lazy to keep a consistent import path
export function lazy<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return React.lazy(importer);
}

