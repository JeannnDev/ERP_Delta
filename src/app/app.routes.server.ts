import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // PO UI usa localStorage internamente (PoLanguageService),
    // que não existe no Node.js / SSR. Usar Client render evita o crash.
    path: '**',
    renderMode: RenderMode.Client,
  },
];
