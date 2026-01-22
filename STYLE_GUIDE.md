# Style Guide - MRM Red Project

This document outlines all colors, styles, and graph configurations used in the MRM Red project to ensure consistency across all pages.

## Color System

The project uses a CSS variable-based color system with HSL values defined in `globals.css`. All colors are accessible via Tailwind CSS classes.

### Primary Colors

**Primary (Brand Red)**
- Light Mode: `hsl(347 72% 46%)` - `#CA2041`
- Dark Mode: `hsl(347 72% 46%)` - `#CA2041` (same)
- Usage: Main brand color, buttons, accents, primary actions
- Tailwind: `bg-primary`, `text-primary`, `border-primary`
- CSS Variable: `--primary`

**Primary Foreground**
- Light/Dark: `hsl(0 0% 100%)` - White
- Usage: Text on primary backgrounds
- Tailwind: `text-primary-foreground`
- CSS Variable: `--primary-foreground`

### Background Colors

**Background**
- Light Mode: `hsl(240 8% 95%)` - `#F2F2F5`
- Dark Mode: `hsl(222.2 84% 4.9%)` - Dark blue-gray
- Tailwind: `bg-background`
- CSS Variable: `--background`

**Foreground (Text)**
- Light Mode: `hsl(222.2 84% 4.9%)` - Dark text
- Dark Mode: `hsl(210 40% 98%)` - Light text
- Tailwind: `text-foreground`
- CSS Variable: `--foreground`

### Card Colors

**Card Background**
- Light Mode: `hsl(0 0% 100%)` - White
- Dark Mode: `hsl(222.2 84% 4.9%)` - Dark
- Tailwind: `bg-card`
- CSS Variable: `--card`

**Card Foreground**
- Light Mode: `hsl(222.2 84% 4.9%)` - Dark text
- Dark Mode: `hsl(210 40% 98%)` - Light text
- Tailwind: `text-card-foreground`
- CSS Variable: `--card-foreground`

### Secondary Colors

**Secondary**
- Light Mode: `hsl(240 6% 93%)` - `#E5E5ED`
- Dark Mode: `hsl(217.2 32.6% 17.5%)` - Dark blue-gray
- Usage: Secondary buttons, backgrounds
- Tailwind: `bg-secondary`, `text-secondary`
- CSS Variable: `--secondary`

**Secondary Foreground**
- Light Mode: `hsl(0 0% 9%)` - Very dark
- Dark Mode: `hsl(210 40% 98%)` - Light
- Tailwind: `text-secondary-foreground`
- CSS Variable: `--secondary-foreground`

### Muted Colors

**Muted**
- Light Mode: `hsl(240 6% 93%)` - `#E5E5ED`
- Dark Mode: `hsl(217.2 32.6% 17.5%)` - Dark blue-gray
- Usage: Subtle backgrounds, disabled states
- Tailwind: `bg-muted`
- CSS Variable: `--muted`

**Muted Foreground**
- Light Mode: `hsl(0 0% 45.1%)` - Medium gray
- Dark Mode: `hsl(215 20.2% 65.1%)` - Light gray
- Usage: Secondary text, labels, descriptions
- Tailwind: `text-muted-foreground`
- CSS Variable: `--muted-foreground`

### Accent Colors

**Accent**
- Light/Dark: `hsl(347 72% 46%)` - `#CA2041` (same as primary)
- Usage: Hover states, highlights
- Tailwind: `bg-accent`, `hover:bg-accent`
- CSS Variable: `--accent`

**Accent Foreground**
- Light/Dark: `hsl(0 0% 100%)` - White
- Tailwind: `text-accent-foreground`
- CSS Variable: `--accent-foreground`

### Destructive Colors

**Destructive**
- Light Mode: `hsl(0 84.2% 60.2%)` - Red
- Dark Mode: `hsl(0 62.8% 30.6%)` - Darker red
- Usage: Delete actions, errors
- Tailwind: `bg-destructive`, `text-destructive`
- CSS Variable: `--destructive`

**Destructive Foreground**
- Light/Dark: `hsl(0 0% 98%)` - Off-white
- Tailwind: `text-destructive-foreground`
- CSS Variable: `--destructive-foreground`

### Border & Input Colors

**Border**
- Light Mode: `hsl(0 0% 89.8%)` - Light gray
- Dark Mode: `hsl(217.2 32.6% 17.5%)` - Dark gray
- Tailwind: `border-border`
- CSS Variable: `--border`

**Input**
- Light Mode: `hsl(0 0% 89.8%)` - Light gray
- Dark Mode: `hsl(217.2 32.6% 17.5%)` - Dark gray
- Tailwind: `border-input`
- CSS Variable: `--input`

**Ring (Focus Ring)**
- Light/Dark: `hsl(217.2 91.2% 59.8%)` - Blue
- Usage: Focus states, selection indicators
- Tailwind: `ring-ring`, `focus-visible:ring-ring`
- CSS Variable: `--ring`

### Popover Colors

**Popover**
- Light Mode: `hsl(0 0% 100%)` - White
- Dark Mode: `hsl(222.2 84% 4.9%)` - Dark
- Tailwind: `bg-popover`
- CSS Variable: `--popover`

**Popover Foreground**
- Light Mode: `hsl(222.2 84% 4.9%)` - Dark text
- Dark Mode: `hsl(210 40% 98%)` - Light text
- Tailwind: `text-popover-foreground`
- CSS Variable: `--popover-foreground`

### Sidebar Colors

**Sidebar Background**
- Light Mode: `hsl(0 0% 98%)` - Off-white
- Dark Mode: `hsl(240 5.9% 10%)` - Very dark
- Tailwind: `bg-sidebar`
- CSS Variable: `--sidebar-background`

**Sidebar Foreground**
- Light Mode: `hsl(240 5.3% 26.1%)` - Dark gray
- Dark Mode: `hsl(240 4.8% 95.9%)` - Light gray
- Tailwind: `text-sidebar-foreground`
- CSS Variable: `--sidebar-foreground`

**Sidebar Primary**
- Light Mode: `hsl(240 5.9% 10%)` - Very dark
- Dark Mode: `hsl(224.3 76.3% 48%)` - Blue
- Tailwind: `bg-sidebar-primary`
- CSS Variable: `--sidebar-primary`

**Sidebar Accent**
- Light Mode: `hsl(240 4.8% 95.9%)` - Light gray
- Dark Mode: `hsl(240 3.7% 15.9%)` - Dark gray
- Tailwind: `bg-sidebar-accent`
- CSS Variable: `--sidebar-accent`

**Sidebar Border**
- Light Mode: `hsl(220 13% 91%)` - Light gray
- Dark Mode: `hsl(240 3.7% 15.9%)` - Dark gray
- Tailwind: `border-sidebar-border`
- CSS Variable: `--sidebar-border`

## Chart/Graph Colors

The project uses **Recharts** library for all charts. Chart colors are defined via CSS variables and can be accessed through Tailwind or directly via HSL.

### Chart Color Palette

**Chart 1** (Primary Red)
- Light/Dark: `hsl(347 72% 46%)` - `#CA2041`
- Usage: Primary data series, main charts
- Tailwind: `chart-1`
- CSS Variable: `--chart-1`
- Usage Example: `fill="hsl(var(--chart-1))"` or `stroke="hsl(var(--chart-1))"`

**Chart 2** (Primary Red - Duplicate)
- Light/Dark: `hsl(347 72% 46%)` - `#CA2041`
- Usage: Secondary data series
- Tailwind: `chart-2`
- CSS Variable: `--chart-2`

**Chart 3** (Dark Teal)
- Light/Dark: `hsl(197 37% 24%)` - Dark teal/blue
- Usage: Tertiary data series
- Tailwind: `chart-3`
- CSS Variable: `--chart-3`

**Chart 4** (Yellow)
- Light/Dark: `hsl(43 74% 66%)` - Yellow/gold
- Usage: Additional data series
- Tailwind: `chart-4`
- CSS Variable: `--chart-4`

**Chart 5** (Orange)
- Light/Dark: `hsl(27 87% 67%)` - Orange
- Usage: Additional data series
- Tailwind: `chart-5`
- CSS Variable: `--chart-5`

### Chart Styling Patterns

#### Area Charts
```tsx
<Area 
  type="monotone" 
  dataKey="value" 
  stroke="hsl(var(--primary))" 
  fill="hsl(var(--primary))" 
  fillOpacity={0.2} 
  strokeWidth={2} 
  strokeLinecap="round" 
  dot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
  activeDot={{ r: 8, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
/>
```

#### Bar Charts
```tsx
<BarChart data={chartData} layout="vertical">
  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
    <LabelList 
      dataKey="count" 
      position="right" 
      offset={10}
      formatter={(value: number) => (value > 0 ? value.toLocaleString() : '')} 
      style={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 'medium' }} 
    />
  </Bar>
</BarChart>
```

#### Chart Axes
- **X-Axis**: `tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}`
- **Y-Axis**: `tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}`
- **Grid Lines**: `strokeDasharray="3 3"` (dashed pattern)
- **Axis Lines**: Typically hidden (`axisLine={false}`, `tickLine={false}`)

#### Chart Container
- Uses `ChartContainer` component from `@/components/ui/chart`
- Standard height: `h-40` or `h-[120px]` for charts
- Full width: `w-full`

#### Chart Tooltips
- Uses `ChartTooltipContent` component
- Styled with: `bg-background`, `border-border`, `text-foreground`
- Font size: `text-xs`

## Typography

### Font Sizes
- **Card Title**: `text-lg font-semibold`
- **Card Description**: `text-sm text-muted-foreground`
- **Chart Labels**: `fontSize: 12`
- **Body Text**: Default (inherits from body)
- **Small Text**: `text-sm`

### Font Weights
- **Bold**: `font-bold` (for important numbers/stats)
- **Semibold**: `font-semibold` (for titles)
- **Medium**: `font-medium` (for labels)
- **Normal**: Default

## Border Radius

**Base Radius**
- CSS Variable: `--radius: 20px`
- Tailwind: `rounded-lg` = `var(--radius)` (20px)
- Tailwind: `rounded-md` = `calc(var(--radius) - 2px)` (18px)
- Tailwind: `rounded-sm` = `calc(var(--radius) - 4px)` (16px)

**Common Usage**
- Cards: `rounded-lg`
- Buttons: `rounded-md` or `rounded-full` (for pill buttons)
- Inputs: `rounded-md`
- Chart bars: `radius={[0, 8, 8, 0]}` or `radius={[8, 8, 0, 0]}`

## Component Styles

### Cards
```tsx
<Card className="rounded-lg border bg-card text-card-foreground shadow-sm">
  <CardHeader className="flex flex-col space-y-1.5 p-6">
    <CardTitle className="text-lg font-semibold">Title</CardTitle>
    <CardDescription className="text-sm text-muted-foreground">Description</CardDescription>
  </CardHeader>
  <CardContent className="p-6 pt-0">
    {/* Content */}
  </CardContent>
</Card>
```

### Buttons
- **Default**: `bg-primary text-primary-foreground hover:bg-primary/90`
- **Secondary**: `bg-secondary text-secondary-foreground hover:bg-secondary/80`
- **Outline**: `border border-input bg-background hover:bg-accent hover:text-accent-foreground`
- **Ghost**: `hover:bg-accent hover:text-accent-foreground`
- **Destructive**: `bg-destructive text-destructive-foreground hover:bg-destructive/90`
- **Sizes**: `h-10 px-4 py-2` (default), `h-9 px-3` (sm), `h-11 px-8` (lg)

### Inputs
- Background: `bg-background`
- Border: `border-input`
- Focus: `focus-visible:ring-2 focus-visible:ring-ring`
- Border radius: `rounded-md`

## Spacing

Standard Tailwind spacing scale is used:
- Card padding: `p-6`
- Card content padding: `p-6 pt-0`
- Card header spacing: `space-y-1.5`
- Chart margins: `margin={{ top: 10, right: 20, left: 20, bottom: 0 }}`

## Shadows

- Cards: `shadow-sm`
- Tooltips: `shadow-xl`
- Popovers: `shadow-lg`

## Animations

Defined in `tailwind.config.ts`:
- **Accordion**: `accordion-down` / `accordion-up` (0.2s ease-out)
- **Collapsible**: `collapsible-down` / `collapsible-up` (0.2s ease-out)
- **Toast Progress**: `toast-progress` (5s linear)
- **Bump In**: `bump-in` (0.3s ease-out) - scale animation

## Dark Mode

The project supports dark mode via the `dark` class. All colors automatically adapt when dark mode is active. Use Tailwind's `dark:` prefix for any dark-mode-specific overrides if needed.

## Usage Examples

### Creating a Chart
```tsx
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--primary))",
  },
};

<ChartContainer config={chartConfig} className="h-40 w-full">
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
    <Bar dataKey="value" fill="hsl(var(--chart-1))" />
  </BarChart>
</ChartContainer>
```

### Creating a Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Using Colors
```tsx
// Via Tailwind classes
<div className="bg-primary text-primary-foreground">Primary</div>
<div className="bg-card text-card-foreground">Card</div>
<div className="text-muted-foreground">Muted text</div>

// Via CSS variables (for inline styles or charts)
<div style={{ backgroundColor: "hsl(var(--primary))" }}>Primary</div>
<Bar fill="hsl(var(--chart-1))" />
```

## Key Files Reference

- **Color Definitions**: `src/app/globals.css`
- **Tailwind Config**: `tailwind.config.ts`
- **Chart Component**: `src/components/ui/chart.tsx`
- **Card Component**: `src/components/ui/card.tsx`
- **Button Component**: `src/components/ui/button.tsx`
