// Type definitions for @neural-trader/features
import type { JsBar } from '@neural-trader/core';

export { JsBar };

export function calculateSma(prices: number[], period: number): number[];
export function calculateRsi(prices: number[], period: number): number[];
export function calculateIndicator(bars: JsBar[], indicator: string, params: string): Promise<any>;
