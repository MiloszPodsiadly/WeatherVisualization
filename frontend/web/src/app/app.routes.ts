import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
  { path: 'welcome', canActivate: [authGuard], loadComponent: () => import('./features/welcome/welcome.component').then(m => m.WelcomeComponent) },
  { path: 'search', canActivate: [authGuard], loadComponent: () => import('./features/search/search.component').then(m => m.SearchComponent) },
  { path: 'city/:id', canActivate: [authGuard], loadComponent: () => import('./features/city/city.component').then(m => m.CityComponent) },
  { path: 'history/:id', canActivate: [authGuard], loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent) },
  { path: 'forecast', canActivate: [authGuard], loadComponent: () => import('./features/forecast/forecast.component').then(m => m.ForecastComponent) },
  { path: 'air-quality/:id', canActivate: [authGuard], loadComponent: () => import('./features/air-quality/air-quality.component').then(m => m.AirQualityComponent) },
  { path: '**', redirectTo: 'login' }
];
