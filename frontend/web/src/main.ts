import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import 'chartjs-adapter-date-fns';

// Chart.js registracja (ważne!)
import { Chart, TimeScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

Chart.register(TimeScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend, zoomPlugin);

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withFetch()),
    provideRouter(routes),
  ],
}).catch(err => console.error(err));
