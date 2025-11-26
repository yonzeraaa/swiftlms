'use client'

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from 'recharts'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-navy-900 p-3 rounded-lg shadow-elevation-3 border border-gold-500/20">
        <p className="text-sm font-medium text-navy-900 dark:text-gold-100">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm mt-1" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Colors for charts
const COLORS = {
  primary: '#FFD700',
  secondary: '#003366',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
}

const CHART_COLORS = [
  COLORS.primary,
  COLORS.info,
  COLORS.success,
  COLORS.purple,
  COLORS.warning,
  COLORS.pink,
  COLORS.error,
]

// Line Chart Component
interface LineChartProps {
  data: any[]
  lines: Array<{
    dataKey: string
    name: string
    color?: string
    strokeWidth?: number
  }>
  xAxisKey?: string
  height?: number
  showGrid?: boolean
  animated?: boolean
}

export function LineChartComponent({
  data,
  lines,
  xAxisKey = 'name',
  height = 300,
  showGrid = true,
  animated = true,
}: LineChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 215, 0, 0.1)" />
          )}
          <XAxis 
            dataKey={xAxisKey} 
            stroke="#B39700"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#B39700"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconType="line"
          />
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color || CHART_COLORS[index]}
              strokeWidth={line.strokeWidth || 2}
              dot={{ fill: line.color || CHART_COLORS[index], r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={animated ? 1500 : 0}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// Area Chart Component
interface AreaChartProps {
  data: any[]
  areas: Array<{
    dataKey: string
    name: string
    color?: string
    gradient?: boolean
  }>
  xAxisKey?: string
  height?: number
  stacked?: boolean
  animated?: boolean
}

export function AreaChartComponent({
  data,
  areas,
  xAxisKey = 'name',
  height = 300,
  stacked = false,
  animated = true,
}: AreaChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            {areas.map((area, index) => (
              <linearGradient key={area.dataKey} id={`gradient-${area.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={area.color || CHART_COLORS[index]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={area.color || CHART_COLORS[index]} stopOpacity={0.1}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 215, 0, 0.1)" />
          <XAxis 
            dataKey={xAxisKey} 
            stroke="#B39700"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#B39700"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconType="rect"
          />
          {areas.map((area, index) => (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              name={area.name}
              stackId={stacked ? "1" : undefined}
              stroke={area.color || CHART_COLORS[index]}
              fill={area.gradient ? `url(#gradient-${area.dataKey})` : area.color || CHART_COLORS[index]}
              animationDuration={animated ? 1500 : 0}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// Bar Chart Component
interface BarChartProps {
  data: any[]
  bars: Array<{
    dataKey: string
    name: string
    color?: string
  }>
  xAxisKey?: string
  height?: number
  horizontal?: boolean
  stacked?: boolean
  animated?: boolean
}

export function BarChartComponent({
  data,
  bars,
  xAxisKey = 'name',
  height = 300,
  horizontal = false,
  stacked = false,
  animated = true,
}: BarChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart 
          data={data} 
          layout={horizontal ? 'horizontal' : 'vertical'}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 215, 0, 0.1)" />
          {horizontal ? (
            <>
              <XAxis type="number" stroke="#B39700" style={{ fontSize: '12px' }} />
              <YAxis dataKey={xAxisKey} type="category" stroke="#B39700" style={{ fontSize: '12px' }} />
            </>
          ) : (
            <>
              <XAxis dataKey={xAxisKey} stroke="#B39700" style={{ fontSize: '12px' }} />
              <YAxis stroke="#B39700" style={{ fontSize: '12px' }} />
            </>
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconType="rect"
          />
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={bar.color || CHART_COLORS[index]}
              stackId={stacked ? "stack" : undefined}
              animationDuration={animated ? 1500 : 0}
              radius={[4, 4, 0, 0]}
            >
              <LabelList dataKey={bar.dataKey} position="top" style={{ fontSize: '11px', fill: '#B39700' }} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// Pie Chart Component
interface PieChartProps {
  data: any[]
  dataKey?: string
  nameKey?: string
  height?: number
  innerRadius?: number
  showLabel?: boolean
  animated?: boolean
}

export function PieChartComponent({
  data,
  dataKey = 'value',
  nameKey = 'name',
  height = 300,
  innerRadius = 0,
  showLabel = true,
  animated = true,
}: PieChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabel ? ({ value, percent }) => `${value} (${((percent || 0) * 100).toFixed(0)}%)` : false}
            outerRadius={80}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey={dataKey}
            animationBegin={0}
            animationDuration={animated ? 1500 : 0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// Radial Bar Chart Component
interface RadialBarChartProps {
  data: any[]
  dataKey?: string
  height?: number
  startAngle?: number
  endAngle?: number
  animated?: boolean
}

export function RadialBarChartComponent({
  data,
  dataKey = 'value',
  height = 300,
  startAngle = 90,
  endAngle = -270,
  animated = true,
}: RadialBarChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, rotate: -90 }}
      animate={{ opacity: 1, rotate: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart 
          cx="50%" 
          cy="50%" 
          innerRadius="10%" 
          outerRadius="90%" 
          data={data}
          startAngle={startAngle}
          endAngle={endAngle}
        >
          <RadialBar
            dataKey={dataKey}
            cornerRadius={10}
            fill="#FFD700"
            animationDuration={animated ? 1500 : 0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </RadialBar>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// Sparkline Component (mini chart)
interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  width?: number
  showTrend?: boolean
}

export function Sparkline({
  data,
  color = COLORS.primary,
  height = 40,
  width = 100,
  showTrend = false,
}: SparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }))
  const trend = data[data.length - 1] - data[0]
  
  return (
    <div className="flex items-center gap-2">
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={false}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
      {showTrend && (
        <div className={`flex items-center ${trend > 0 ? 'text-success-500' : trend < 0 ? 'text-error-500' : 'text-gray-500'}`}>
          {trend > 0 ? <TrendingUp className="w-4 h-4" /> : trend < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          <span className="text-xs ml-1">{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}