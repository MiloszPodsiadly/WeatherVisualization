import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { WeatherApiService } from '../../services/weather-api.service';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ScatterDataPoint } from 'chart.js';

@Component({
  standalone: true,
  selector: 'app-history',
  imports: [
    CommonModule, FormsModule, MatCardModule,
    MatDatepickerModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatNativeDateModule,
    NgChartsModule
  ],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(WeatherApiService);

  locationId!: string;
  from: Date = new Date(Date.now() - 48 * 60 * 60 * 1000);
  to: Date = new Date();
  interval = '1h';

  data: ChartConfiguration<'line', (number | ScatterDataPoint | null)[]>['data'] = { datasets: [] };
  options: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    parsing: false,
    scales: {
      x: { type: 'time' },
      y: { position: 'left' },
      y1: { position: 'right', grid: { drawOnChartArea: false } }
    }
  };

  ngOnInit(): void {
    this.locationId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  private toPointOrNull(xIso: string, yVal: number | null | undefined): ScatterDataPoint | null {
    if (yVal == null) return null;
    return { x: new Date(xIso).getTime(), y: yVal };
  }

  load() {
    this.api.history(this.locationId, this.from.toISOString(), this.to.toISOString(), this.interval)
      .subscribe(res => {
        const temp = res.points.map(p => this.toPointOrNull(p.recordedAt, p.temperature));
        const hum  = res.points.map(p => this.toPointOrNull(p.recordedAt, p.humidity));
        const rain = res.points.map(p => this.toPointOrNull(p.recordedAt, p.precipitation));

        this.data = {
          datasets: [
            { label: 'Temp (°C)',        data: temp, pointRadius: 0, tension: 0.2 },
            { label: 'Wilgotność (%)',   data: hum,  pointRadius: 0, tension: 0.2, yAxisID: 'y1' },
            { label: 'Opad (mm)',        data: rain, pointRadius: 0, tension: 0.2 }
          ]
        };
      });
  }
}
