# GhostChannel - Cyberpunk Design System

## 🎨 Design Philosophy
A fusion of **cyberpunk hacker aesthetics** and **business formal professionalism**, creating a secure, futuristic encrypted messaging platform.

## Color Palette

### Dark Foundation
- `cyber-black`: #0a0a0f - Primary background
- `cyber-dark`: #121218 - Secondary background
- `cyber-darker`: #1a1a24 - Card backgrounds
- `cyber-slate`: #1e1e2e - Input backgrounds
- `cyber-gray`: #2a2a3a - Borders and dividers

### Neon Accents
- `neon-cyan`: #00ffff - Primary accent (encryption, security)
- `neon-magenta`: #ff00ff - Secondary accent (alerts, highlights)
- `neon-green`: #00ff41 - Success states, online indicators
- `neon-blue`: #0080ff - Info states

### Gradients
- Primary Button: Cyan to Blue (`from-cyan-500 to-blue-600`)
- Danger Button: Pink to Red (`from-pink-500 to-red-600`)

## Typography

### Font Families
- **Monospace**: JetBrains Mono, Fira Code - Used for technical elements, usernames, status text
- **Sans-serif**: Inter - Used for body text, general UI

### Usage
- Terminal-style text: `.font-mono`
- Professional text: `.font-sans`

## Components

### Button
```tsx
<Button variant="primary" size="md">
  Enter Secure Channel
</Button>
```

**Variants:**
- `primary` - Cyan gradient with neon glow
- `secondary` - Outlined cyan
- `danger` - Pink gradient
- `ghost` - Transparent with hover

### Input
```tsx
<Input 
  label="Email Address"
  placeholder="user@ghostchannel.io"
  helperText="Required for authentication"
/>
```

### Card
```tsx
<Card variant="glass" scanlines>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

**Variants:**
- `default` - Standard card
- `hover` - Animated border on hover
- `glass` - Glassmorphism effect

## Visual Effects

### Neon Glow
- `.shadow-neon-cyan` - Cyan glow effect
- `.shadow-neon-magenta` - Magenta glow effect
- `.shadow-neon-green` - Green glow effect

### Text Effects
- `.neon-text-cyan` - Cyan text with glow
- `.neon-text-magenta` - Magenta text with glow
- `.glitch` - Glitch animation effect

### Backgrounds
- `.grid-bg` - Cyberpunk grid pattern
- `.scanlines` - CRT scanline effect

### Animations
- `animate-pulse-slow` - Slow pulsing effect
- `animate-glow` - Glowing animation
- `animate-flicker` - Flickering effect

## Page Layouts

### Login/Register
- Centered authentication card
- Animated background gradients
- Grid background with scanlines
- Corner accent borders
- Status indicator (bottom-right)

### Chat Interface
- **Sidebar** (320px): User profile, conversation list
- **Main Panel**: Chat header, messages, composer
- Dark cyberpunk theme throughout
- Neon accent highlights for active states
- Monospace fonts for technical elements

## Best Practices

1. **Consistency**: Use defined color variables for all color references
2. **Accessibility**: Maintain sufficient contrast ratios
3. **Performance**: Use CSS transforms for animations
4. **Responsiveness**: Test on mobile devices (sidebar should collapse)
5. **Professional**: Balance cyberpunk flair with usability

## Custom CSS Variables

```css
--cyber-black: #0a0a0f;
--cyber-dark: #121218;
--neon-cyan: #00ffff;
--neon-magenta: #ff00ff;
```

Access via Tailwind: `bg-cyber-black`, `text-neon-cyan`, etc.

## Installation

```bash
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms
npm install @headlessui/react clsx
```

## Development

```bash
npm run dev
```

The design system is fully integrated with Tailwind CSS and requires no additional build steps.
