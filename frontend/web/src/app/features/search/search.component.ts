import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  startWith,
  switchMap,
  map,
  catchError,
  of,
  finalize,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LocationApiService } from '../../services/location-api.service';
import { LocationDto } from '../../models';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatOptionModule } from '@angular/material/core';

@Component({
  standalone: true,
  selector: 'app-search',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule,
    MatAutocompleteModule, MatChipsModule, MatCardModule, MatProgressSpinnerModule,
    MatOptionModule
  ],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent {
  private readonly api = inject(LocationApiService);
  private readonly router = inject(Router);

  readonly q = new FormControl<string>('', { nonNullable: true });

  loading = false;
  error: string | null = null;
  suggestions: LocationDto[] = [];
  results: LocationDto[] = [];

  private readonly RECENTS_KEY = 'recentLocations';
  private readonly MAX_RECENTS = 8;

  constructor() {
    this.q.valueChanges.pipe(
      startWith(this.q.value),
      map(v => (v ?? '').trim()),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term) {
          return of([] as LocationDto[]);
        }
        this.loading = true;
        this.error = null;
        return this.api.search(term, 10).pipe(
          map(list => this.uniqueById(list)),
          catchError(() => {
            this.error = 'Search failed';
            return of([] as LocationDto[]);
          }),
          finalize(() => { this.loading = false; })
        );
      }),
      takeUntilDestroyed()
    ).subscribe(list => {
      this.suggestions = list;
      this.results = list;
    });
  }

  searchNow(): void {
    const term = this.q.value.trim();
    if (!term) { this.results = []; return; }

    this.loading = true;
    this.error = null;

    this.api.search(term, 20).pipe(
      map(list => this.uniqueById(list)),
      catchError(() => {
        this.error = 'Search failed';
        return of([] as LocationDto[]);
      }),
      finalize(() => { this.loading = false; }),
      takeUntilDestroyed()
    ).subscribe(list => this.results = list);
  }

  selectSuggestion(name: string): void {
    this.q.setValue(name);
    this.searchNow();
  }

  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') this.q.setValue('');
  }

  openCity(loc: LocationDto): void { this.remember(loc); this.router.navigate(['/city', loc.id]); }
  openHistory(loc: LocationDto): void { this.remember(loc); this.router.navigate(['/history', loc.id]); }

  get recents(): LocationDto[] {
    try { return JSON.parse(localStorage.getItem(this.RECENTS_KEY) ?? '[]'); }
    catch { return []; }
  }

  trackById = (_: number, x: LocationDto) => x.id;

  private remember(loc: LocationDto): void {
    localStorage.setItem('lastLocationId', loc.id);
    const uniq = this.uniqueById([loc, ...this.recents]).slice(0, this.MAX_RECENTS);
    localStorage.setItem(this.RECENTS_KEY, JSON.stringify(uniq));
  }

  private uniqueById(list: LocationDto[]): LocationDto[] {
    const seen = new Set<string>();
    return list.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  }

  displayLoc = (value: string | null) => value ?? '';
}
