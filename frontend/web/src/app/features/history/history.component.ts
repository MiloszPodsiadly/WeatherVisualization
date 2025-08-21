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
import { ChartConfiguration, ChartData, ChartDataset, ScatterDataPoint } from 'chart.js';

type MixedType = 'line';
type Point = number | ScatterDataPoint | null;

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

  data: ChartData<MixedType, Point[], unknown> = { datasets: [] };

  options: ChartConfiguration<MixedType>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    parsing: false,
    interaction: { mode: 'nearest', intersect: false },
    scales: {
      x: { type: 'time' },
      y: { position: 'left', ticks: { callback: v => `${v}°C` as any } },
      y1: {
        position: 'right',
        grid: { drawOnChartArea: false },
        min: 0, max: 100,
        ticks: { callback: v => `${v}%` as any }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: { usePointStyle: true }
      },
      tooltip: {
        callbacks: {
          label: (ctx: import('chart.js').TooltipItem<MixedType>) => {
            const ds = ctx.chart.data.datasets?.[ctx.datasetIndex] as ChartDataset<MixedType, Point[]> | undefined;
            const raw = ds?.label;
            const seriesLabel = Array.isArray(raw) ? raw.join(', ') : (raw ?? '');
            const v = ctx.parsed.y as number;

            if (seriesLabel.includes('Temp'))         return `${seriesLabel}: ${v} °C`;
            if (seriesLabel.includes('Humidity'))   return `${seriesLabel}: ${v} %`;
            if (seriesLabel.includes('Cloudy')) return `${seriesLabel}: ${v} %`;
            return `${seriesLabel}: ${v}`;
          }
        }
      }
    },
    layout: { padding: { top: 0, right: 8, bottom: 0, left: 0 } }
  };

  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      const id = pm.get('id');
      if (!id) return;
      this.locationId = id;
      this.load();
    });
  }

  private toPointOrNull(xIso: string, yVal: number | null | undefined): ScatterDataPoint | null {
    if (yVal == null) return null;
    return { x: new Date(xIso).getTime(), y: yVal };
  }

  load() {
    if (!this.locationId) return;
    this.api.history(this.locationId, this.from.toISOString(), this.to.toISOString(), this.interval)
      .subscribe(res => {
        const temp  = res.points.map(p => this.toPointOrNull(p.recordedAt, p.temperature));
        const hum   = res.points.map(p => this.toPointOrNull(p.recordedAt, p.humidity));
        const cloud = res.points.map(p => this.toPointOrNull(p.recordedAt, p.cloudCover));

        const datasets: ChartDataset<MixedType, Point[]>[] = [
          { label: 'Temperature (°C)',        data: temp,  pointRadius: 0, tension: 0.2, yAxisID: 'y',  type: 'line' },
          { label: 'Humidity (%)',   data: hum,   pointRadius: 0, tension: 0.2, yAxisID: 'y1', type: 'line' },
          { label: 'Cloudy (%)', data: cloud, pointRadius: 0, tension: 0.2, yAxisID: 'y1', type: 'line' }
        ];

        this.data = { datasets };
      });
  }
}
