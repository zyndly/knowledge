# Spartan UI Landing Page Example

This landing page demonstrates how to use Spartan UI components in your Angular application.

## Components Used

- **HlmButton** - Call-to-action buttons with different variants
- **HlmCard** - Feature cards with header, content, and footer sections
- **HlmBadge** - Badge component for labels and tags
- **HlmIcon** - Icon component using Lucide icons

## Features Demonstrated

1. **Hero Section** - Eye-catching header with gradient text and CTA buttons
2. **Features Grid** - Responsive 3-column layout showcasing key features
3. **Icon Integration** - Using Lucide icons throughout the page
4. **Responsive Design** - Mobile-first approach with Tailwind CSS
5. **Dark Mode Ready** - Uses Tailwind's color system for automatic dark mode support

## Running the Application

```bash
cd cirqapture
npm start
```

Navigate to `http://localhost:4200` to see the landing page.

## Customization

### Adding More Components

You can add more Spartan UI components by importing them from your local libs:

```typescript
import { HlmAccordionImports } from '../../libs/ui/accordion/src';
import { HlmAvatarImports } from '../../libs/ui/avatar/src';
import { HlmSeparatorImports } from '../../libs/ui/separator/src';

// Then spread them in your imports array
imports: [
  ...HlmAccordionImports,
  ...HlmAvatarImports,
  ...HlmSeparatorImports
]
```

### Styling

The landing page uses Tailwind CSS classes. You can customize:
- Colors: Change `bg-primary`, `text-primary`, etc.
- Spacing: Adjust `py-20`, `px-4`, `gap-6`, etc.
- Typography: Modify `text-5xl`, `font-bold`, etc.

### Adding More Icons

Import additional Lucide icons:

```typescript
import { lucideHome, lucideUser, lucideSettings } from '@ng-icons/lucide';

// Add to providers
providers: [provideIcons({ lucideHome, lucideUser, lucideSettings })]
```

## Component Structure

```
landing.ts
├── Hero Section
│   ├── Badge with icon
│   ├── Gradient heading
│   ├── Description text
│   └── CTA buttons
├── Features Section
│   └── Grid of cards (3 columns)
│       ├── Card header with icon
│       ├── Card description
│       └── Feature points list
└── CTA Section
    └── Centered card with buttons
```

## Next Steps

- Add routing to other pages
- Implement actual functionality for buttons
- Add more sections (testimonials, pricing, etc.)
- Integrate with your backend API
- Add animations and transitions
