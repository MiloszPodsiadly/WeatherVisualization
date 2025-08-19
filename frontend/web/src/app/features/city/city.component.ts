import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WeatherApiService } from '../../services/weather-api.service';
import { WeatherCurrentDto, WeatherHistoryResponseDto } from '../../models';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ScatterDataPoint } from 'chart.js';

@Component({
  standalone: true,
  selector: 'app-city',
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, NgChartsModule],
  templateUrl: './city.component.html',
  styleUrls: ['./city.component.scss']
})
export class CityComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(WeatherApiService);

  locationId!: string;
  current?: WeatherCurrentDto;
  history?: WeatherHistoryResponseDto;

  lineData: ChartConfiguration<'line', (number | ScatterDataPoint | null)[]>['data'] = { datasets: [] };
  lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    parsing: false,
    scales: {
      x: { type: 'time' },
      y: { ticks: { callback: v => `${v}°C` } }
    }
  };

  ngOnInit(): void {
    this.locationId = this.route.snapshot.paramMap.get('id')!;
    this.api.current(this.locationId).subscribe(res => this.current = res);

    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

    this.api.history(this.locationId, from.toISOString(), to.toISOString(), '1h')
      .subscribe(res => {
        this.history = res;

        const points: (ScatterDataPoint | null)[] = res.points.map(p => {
          const y = p.temperature;
          return (y == null)
            ? null
            : { x: new Date(p.recordedAt).getTime(), y };
        });

        this.lineData = {
          datasets: [{
            label: 'Temperatura (°C)',
            data: points,
            pointRadius: 0,
            tension: 0.2
          }]
        };
      });
  }
}
