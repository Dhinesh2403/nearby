import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent }         from './app/app.component';
import { appConfig }            from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    document.getElementById('nb-splash')?.classList.add('nb-splash-done');
  })
  .catch(err => console.error(err));
