import { Component } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideCheck, lucideGithub, lucideSparkles, lucideZap } from '@ng-icons/lucide';
import { HlmButtonImports } from '../../libs/ui/button/src';
import { HlmCardImports } from '../../libs/ui/card/src';
import { HlmBadgeImports } from '../../libs/ui/badge/src';
import { HlmIconImports } from '../../libs/ui/icon/src';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmBadgeImports,
    ...HlmIconImports
  ],
  providers: [provideIcons({ lucideArrowRight, lucideCheck, lucideGithub, lucideSparkles, lucideZap })],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-background to-muted">
      <!-- Hero Section -->
      <section class="container mx-auto px-4 py-20 text-center">
        <div class="flex justify-center mb-6">
          <span hlmBadge variant="secondary" class="gap-2">
            <ng-icon hlm name="lucideSparkles" size="sm" />
            Built with Spartan UI
          </span>
        </div>
        
        <h1 class="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Welcome to Cirqapture
        </h1>
        
        <p class="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          A modern Angular application showcasing the power and elegance of Spartan UI components
        </p>
        
        <div class="flex flex-wrap gap-4 justify-center">
          <button hlmBtn size="lg" class="gap-2">
            Get Started
            <ng-icon hlm name="lucideArrowRight" size="sm" />
          </button>
          <button hlmBtn variant="outline" size="lg" class="gap-2">
            <ng-icon hlm name="lucideGithub" size="sm" />
            View on GitHub
          </button>
        </div>
      </section>

      <!-- Features Section -->
      <section class="container mx-auto px-4 py-20">
        <h2 class="text-3xl md:text-4xl font-bold text-center mb-12">
          Why Choose Spartan UI?
        </h2>
        
        <div class="grid md:grid-cols-3 gap-6">
          @for (feature of features; track feature.title) {
            <div hlmCard>
              <div hlmCardHeader>
                <div class="flex items-center gap-3 mb-2">
                  <div class="p-2 rounded-lg bg-primary/10">
                    <ng-icon hlm [name]="feature.icon" class="text-primary" />
                  </div>
                  <h3 hlmCardTitle>{{ feature.title }}</h3>
                </div>
                <p hlmCardDescription>{{ feature.description }}</p>
              </div>
              <div hlmCardContent>
                <ul class="space-y-2">
                  @for (point of feature.points; track point) {
                    <li class="flex items-start gap-2">
                      <ng-icon hlm name="lucideCheck" size="sm" class="text-primary mt-0.5" />
                      <span class="text-sm text-muted-foreground">{{ point }}</span>
                    </li>
                  }
                </ul>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- CTA Section -->
      <section class="container mx-auto px-4 py-20">
        <div hlmCard class="max-w-3xl mx-auto text-center">
          <div hlmCardHeader>
            <h2 hlmCardTitle class="text-3xl">Ready to Build Something Amazing?</h2>
            <p hlmCardDescription class="text-lg">
              Start creating beautiful, accessible Angular applications with Spartan UI today
            </p>
          </div>
          <div hlmCardFooter class="flex justify-center gap-4">
            <button hlmBtn size="lg">Start Building</button>
            <button hlmBtn variant="ghost" size="lg">Learn More</button>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: ``
})
export class LandingComponent {
  features = [
    {
      title: 'Modern Design',
      icon: 'lucideSparkles',
      description: 'Beautiful, accessible components built with Tailwind CSS',
      points: [
        'Fully customizable with Tailwind',
        'Dark mode support out of the box',
        'Responsive by default'
      ]
    },
    {
      title: 'Developer Experience',
      icon: 'lucideZap',
      description: 'Built for Angular developers, by Angular developers',
      points: [
        'Type-safe components',
        'Standalone components ready',
        'Excellent documentation'
      ]
    },
    {
      title: 'Accessible',
      icon: 'lucideCheck',
      description: 'WCAG compliant components for everyone',
      points: [
        'Keyboard navigation',
        'Screen reader friendly',
        'ARIA attributes included'
      ]
    }
  ];
}
