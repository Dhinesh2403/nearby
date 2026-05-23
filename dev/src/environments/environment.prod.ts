// src/environments/environment.prod.ts
// Values injected at build time via Vercel environment variables
export const environment = {
  production: true,
  apiUrl:    'https://nearby-backend.up.railway.app/api',  // update after Railway deploy
  socketUrl: 'https://nearby-backend.up.railway.app',
  appName:   'NearBy',
};
