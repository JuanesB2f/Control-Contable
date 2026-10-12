"use client"

import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartConfiguration,
  type ChartType,
  type ScriptableContext,
  type TooltipItem,
} from "chart.js"
import { useTheme } from "next-themes"
import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
)
Chart.defaults.maintainAspectRatio = false

export type ChartTheme = {
  /** Same order as --chart-1 … --chart-5. */
  series: readonly [string, string, string, string, string]
  text: string
  grid: string
  tooltipBackground: string
  tooltipText: string
}

/** Canvas can't read CSS variables, so these mirror the --chart-* and text tokens in globals.css. */
const CHART_THEMES: Record<"light" | "dark", ChartTheme> = {
  light: {
    series: ["#2e7d32", "#81c784", "#fbc02d", "#1b5e20", "#a5b8a7"],
    text: "#414b43",
    grid: "rgba(20, 60, 25, 0.08)",
    tooltipBackground: "rgba(28, 36, 29, 0.92)",
    tooltipText: "#ffffff",
  },
  dark: {
    series: ["#66bb6a", "#a5d6a7", "#fbc02d", "#43a047", "#7d8a7f"],
    text: "#b9c4bb",
    grid: "rgba(255, 255, 255, 0.08)",
    tooltipBackground: "rgba(242, 246, 242, 0.95)",
    tooltipText: "#121612",
  },
}

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme()
  return CHART_THEMES[resolvedTheme === "dark" ? "dark" : "light"]
}

/** `#rrggbb` plus an opacity between 0 and 1. */
export function withAlpha(hex: string, opacity: number) {
  return `${hex}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`
}

/** Vertical fade under a line, from the line color to transparent. */
export function verticalFade(color: string) {
  return ({ chart }: ScriptableContext<"line">) => {
    const { chartArea, ctx } = chart
    if (!chartArea) return withAlpha(color, 0.15)
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
    gradient.addColorStop(0, withAlpha(color, 0.32))
    gradient.addColorStop(1, withAlpha(color, 0))
    return gradient
  }
}

export function cartesianScales(theme: ChartTheme, formatTick: (value: number) => string, stacked = false) {
  const font = { size: 11 }
  return {
    x: {
      stacked,
      grid: { display: false },
      border: { display: false },
      ticks: { color: theme.text, font, maxRotation: 0, autoSkipPadding: 16 },
    },
    y: {
      stacked,
      beginAtZero: true,
      grid: { color: theme.grid },
      border: { display: false },
      ticks: { color: theme.text, font, maxTicksLimit: 5, callback: (value: number | string) => formatTick(Number(value)) },
    },
  }
}

export function tooltipStyle<TType extends ChartType>(theme: ChartTheme, formatValue: (value: number) => string) {
  return {
    backgroundColor: theme.tooltipBackground,
    titleColor: theme.tooltipText,
    bodyColor: theme.tooltipText,
    footerColor: theme.tooltipText,
    padding: 10,
    cornerRadius: 12,
    boxPadding: 4,
    usePointStyle: true,
    callbacks: {
      label: (item: TooltipItem<TType>) =>
        ` ${item.chart.data.datasets[item.datasetIndex]?.label ?? item.label}: ${formatValue(typeof item.raw === "number" ? item.raw : 0)}`,
    },
  }
}

export function legendStyle(theme: ChartTheme) {
  return {
    position: "bottom" as const,
    labels: { color: theme.text, usePointStyle: true, pointStyle: "circle" as const, boxWidth: 8, boxHeight: 8, padding: 16 },
  }
}

/** A Chart.js configuration whose options are always spelled out, so updates replace them wholesale. */
export type ChartSpec<TType extends ChartType> = ChartConfiguration<TType> & { options: NonNullable<ChartConfiguration<TType>["options"]> }

type ChartCanvasProps<TType extends ChartType> = {
  config: ChartSpec<TType>
  /** Read by screen readers in place of the drawing. */
  label: string
  className?: string
}

/** Chart.js on a canvas that fills its box: give it a height through `className`. */
export function ChartCanvas<TType extends ChartType>({ config, label, className }: ChartCanvasProps<TType>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart<TType> | null>(null)

  useEffect(() => {
    const options = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? { ...config.options, animation: false as const } : config.options
    const chart = chartRef.current
    if (chart) {
      chart.data = config.data
      chart.options = options
      chart.update()
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    Chart.defaults.font.family = getComputedStyle(canvas).fontFamily
    chartRef.current = new Chart(canvas, { ...config, options })
  }, [config])

  useEffect(
    () => () => {
      chartRef.current?.destroy()
      chartRef.current = null
    },
    [],
  )

  return (
    <div className={cn("relative w-full", className)}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  )
}
