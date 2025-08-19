import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { debounceTime, switchMap } from 'rxjs/operators';
import { LocationApiService } from '../../services/location-api.service';
import { LocationDto } from '../../models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-search',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatListModule, MatButtonModule, MatIconModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent {
  q = new FormControl('');
  results: LocationDto[] = [];
  loading = false;

  constructor(private api: LocationApiService, private router: Router) {
    this.q.valueChanges.pipe(
      debounceTime(300),
      switchMap(v => {
        this.loading = true;
        return this.api.search(v || '');
      })
    ).subscribe(res => { this.results = res; this.loading = false; });
  }

  open(loc: LocationDto) { this.router.navigate(['/city', loc.id]); }
}
