#!/bin/bash

# Exit on error
set -eo pipefail

# Detect Node version
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is not installed"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

echo "🔍 Detected Node.js version: $NODE_VERSION"

if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Error: Node.js 18 or higher is required"
  echo "   Current version: $(node -v)"
  exit 1
fi

# Set Vite version based on Node version
if [ "$NODE_VERSION" -ge 20 ]; then
  VITE_VERSION="latest"
  echo "✅ Using Vite latest (Node 20+)"
else
  VITE_VERSION="5.4.11"
  echo "✅ Using Vite $VITE_VERSION (Node 18 compatible)"
fi

sed_inplace() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo "📦 pnpm not found. Installing pnpm..."
  npm install -g pnpm
fi

# Check if project name is provided
if [ -z "$1" ]; then
  echo "❌ Usage: $0 <project-name>"
  exit 1
fi

PROJECT_NAME="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPONENTS_TARBALL="$SCRIPT_DIR/shadcn-components.tar.gz"

# Check if components tarball exists
if [ ! -f "$COMPONENTS_TARBALL" ]; then
  echo "❌ Error: shadcn-components.tar.gz not found in script directory"
  echo "   Expected location: $COMPONENTS_TARBALL"
  exit 1
fi

echo "🚀 Creating new React + Vite project: $PROJECT_NAME"

# Create new Vite project (always use latest create-vite, pin vite version later)
pnpm create vite "$PROJECT_NAME" --template react-ts

ESCAPED_PROJECT_NAME=$(printf '%s\n' "$PROJECT_NAME" | sed 's/[&/\]/\\&/g')
cd "$PROJECT_NAME" || { echo "❌ Error: Failed to enter project directory"; exit 1; }

echo "🧹 Cleaning up Vite template..."
sed_inplace '/<link rel="icon".*vite\.svg/d' index.html
sed_inplace 's/<title>.*<\/title>/<title>'"$ESCAPED_PROJECT_NAME"'<\/title>/' index.html

echo "📦 Installing base dependencies..."
pnpm install

# Pin Vite version for Node 18
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "📌 Pinning Vite to $VITE_VERSION for Node 18 compatibility..."
  pnpm add -D vite@$VITE_VERSION
fi

echo "📦 Installing Tailwind CSS and dependencies..."
pnpm install -D tailwindcss@3.4.1 postcss autoprefixer @types/node tailwindcss-animate
pnpm install class-variance-authority clsx tailwind-merge lucide-react next-themes

echo "⚙️  Creating Tailwind and PostCSS configuration..."
cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

echo "📝 Configuring Tailwind with shadcn theme..."
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
EOF

# Add Tailwind directives and CSS variables to index.css
echo "🎨 Adding Tailwind directives and CSS variables..."
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
EOF

# Add path aliases to tsconfig.json
echo "🔧 Adding path aliases to tsconfig.json..."
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
config.compilerOptions = config.compilerOptions || {};
config.compilerOptions.baseUrl = '.';
config.compilerOptions.paths = { '@/*': ['./src/*'] };
fs.writeFileSync('tsconfig.json', JSON.stringify(config, null, 2));
"

# Add path aliases to tsconfig.app.json
echo "🔧 Adding path aliases to tsconfig.app.json..."
node -e "
const fs = require('fs');
const path = 'tsconfig.app.json';
const content = fs.readFileSync(path, 'utf8');
// Remove comments with robust regex approach
const cleanContent = content
  .replace(/\/\/.*$/gm, '')  // Remove // comments
  .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove /* */ comments
  .replace(/,(\s*[}\]])/g, '\$1');  // Fix trailing commas
const config = JSON.parse(cleanContent);
config.compilerOptions = config.compilerOptions || {};
config.compilerOptions.baseUrl = '.';
config.compilerOptions.paths = { '@/*': ['./src/*'] };
fs.writeFileSync(path, JSON.stringify(config, null, 2));
"

# Update vite.config.ts
echo "⚙️  Updating Vite configuration..."
cat > vite.config.ts << 'EOF'
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
EOF

# Install all shadcn/ui dependencies
# Tested versions: @radix-ui/*@^1, sonner@^1, cmdk@^1, vaul@^1, embla-carousel-react@^8, react-day-picker@^9, react-resizable-panels@^2, date-fns@^4, react-hook-form@^7, @hookform/resolvers@^3, zod@^3
echo "📦 Installing shadcn/ui dependencies..."
pnpm install @radix-ui/react-accordion@^1 @radix-ui/react-aspect-ratio@^1 @radix-ui/react-avatar@^1 @radix-ui/react-checkbox@^1 @radix-ui/react-collapsible@^1 @radix-ui/react-context-menu@^1 @radix-ui/react-dialog@^1 @radix-ui/react-dropdown-menu@^1 @radix-ui/react-hover-card@^1 @radix-ui/react-label@^1 @radix-ui/react-menubar@^1 @radix-ui/react-navigation-menu@^1 @radix-ui/react-popover@^1 @radix-ui/react-progress@^1 @radix-ui/react-radio-group@^1 @radix-ui/react-scroll-area@^1 @radix-ui/react-select@^1 @radix-ui/react-separator@^1 @radix-ui/react-slider@^1 @radix-ui/react-slot@^1 @radix-ui/react-switch@^1 @radix-ui/react-tabs@^1 @radix-ui/react-toast@^1 @radix-ui/react-toggle@^1 @radix-ui/react-toggle-group@^1 @radix-ui/react-tooltip@^1
pnpm install sonner@^1 cmdk@^1 vaul@^1 embla-carousel-react@^8 react-day-picker@^9 react-resizable-panels@^2 date-fns@^4 react-hook-form@^7 @hookform/resolvers@^3 zod@^3

# Extract shadcn components from tarball
echo "📦 Extracting shadcn/ui components..."
tar -xzf "$COMPONENTS_TARBALL" -C src/
TAR_EXIT=$?

if [ $TAR_EXIT -ne 0 ]; then
  echo "❌ Error: Failed to extract $COMPONENTS_TARBALL (exit code: $TAR_EXIT)"
  exit 1
fi

if [ ! -d "src/components/ui" ]; then
  echo "❌ Error: Expected extraction target 'src/components/ui' not found after tar extraction"
  exit 1
fi

# Create components.json for reference
echo "📝 Creating components.json config..."
cat > components.json << 'EOF'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
EOF

echo "✅ Setup complete! You can now use Tailwind CSS and shadcn/ui in your project."
echo ""
echo "📦 Included components (40+ total):"
echo "  - accordion, alert, aspect-ratio, avatar, badge, breadcrumb"
echo "  - button, calendar, card, carousel, checkbox, collapsible"
echo "  - command, context-menu, dialog, drawer, dropdown-menu"
echo "  - form, hover-card, input, label, menubar, navigation-menu"
echo "  - popover, progress, radio-group, resizable, scroll-area"
echo "  - select, separator, sheet, skeleton, slider, sonner"
echo "  - switch, table, tabs, textarea, toast, toggle, toggle-group, tooltip"
echo ""
echo "To start developing:"
echo "  cd $PROJECT_NAME"
echo "  pnpm dev"
echo ""
echo "📚 Import components like:"
echo "  import { Button } from '@/components/ui/button'"
echo "  import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'"
echo "  import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'"
