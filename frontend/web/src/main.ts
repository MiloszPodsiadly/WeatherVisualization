import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { Chart, TimeScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend, BarElement, BarController } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

Chart.register(
  TimeScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  zoomPlugin
);

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withFetch()),
    provideRouter(routes),
    provideAnimations(),
  ],
}).catch(err => console.error(err));
