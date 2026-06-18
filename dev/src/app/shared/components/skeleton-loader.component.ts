import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrapper">
      @switch (type()) {
        @case ('card') {
          <div class="skeleton-card">
            <div class="skeleton-image"></div>
            <div class="skeleton-content">
              <div class="skeleton-line skeleton-lg"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
            </div>
          </div>
        }
        @case ('text') {
          <div class="skeleton-line"></div>
        }
        @case ('avatar') {
          <div class="skeleton-avatar"></div>
        }
        @case ('provider') {
          <div class="skeleton-provider">
            <div class="skeleton-header"></div>
            <div class="skeleton-body">
              <div class="skeleton-avatar"></div>
              <div class="skeleton-info">
                <div class="skeleton-line skeleton-lg"></div>
                <div class="skeleton-line"></div>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    @keyframes shimmer {
      0%   { background-position: 200% center; }
      100% { background-position: -200% center; }
    }

    .skeleton-wrapper { width: 100%; }

    .skeleton-line, .skeleton-image, .skeleton-avatar, .skeleton-header {
      background: linear-gradient(90deg,
        var(--nb-border) 25%,
        #f0ede6 50%,
        var(--nb-border) 75%
      );
      background-size: 400% 100%;
      animation: shimmer 1.6s ease-in-out infinite;
      border-radius: var(--radius-sm);
    }

    .skeleton-line {
      height: 12px;
      margin-bottom: 8px;
    }

    .skeleton-line.skeleton-lg {
      height: 18px;
      margin-bottom: 12px;
      width: 75%;
    }

    .skeleton-card {
      background: var(--nb-surface);
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid var(--nb-border);
    }

    .skeleton-image {
      width: 100%;
      height: 160px;
      border-radius: 0;
    }

    .skeleton-content { padding: 16px; }

    .skeleton-avatar {
      width: 48px;
      height: 48px;
      min-width: 48px;
      border-radius: 50%;
    }

    .skeleton-provider {
      background: var(--nb-surface);
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid var(--nb-border);
    }

    .skeleton-header {
      width: 100%;
      height: 120px;
      border-radius: 0;
    }

    .skeleton-body {
      padding: 16px;
      display: flex;
      gap: 12px;
    }

    .skeleton-info { flex: 1; }
  `]
})
export class SkeletonLoaderComponent {
  type = input<'card' | 'text' | 'avatar' | 'provider'>('card');
}
