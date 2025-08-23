import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WeatherApiService } from '../../services/weather-api.service';
import { WeatherCurrentDto, WeatherHistoryResponseDto } from '../../models';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ScatterDataPoint, ChartDataset, TooltipItem } from 'chart.js';
import 'chartjs-adapter-date-fns';

type LinePoint = number | ScatterDataPoint | null;

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

  averages?: { temp: number | null; pm10: number | null; pm25: number | null };

  lineData: ChartConfiguration<'line', LinePoint[]>['data'] = { datasets: [] };

  lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    parsing: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) => {
            const v = ctx.parsed.y;
            const label = ctx.dataset.label ?? '';
            if (label.includes('Temperature')) return `🌡 Temp: ${v} °C`;
            if (label.includes('PM2.5'))       return `PM2.5: ${v} µg/m³`;
            if (label.includes('PM10'))        return `PM10: ${v} µg/m³`;
            return `${label}: ${v}`;
          },
          labelTextColor: (ctx: TooltipItem<'line'>) => {
            const label = ctx.dataset?.label ?? '';
            if (label.includes('Temperature')) return 'red';
            if (label.includes('PM2.5'))       return 'orange';
            if (label.includes('PM10'))        return 'blue';
            return '#000';
          }
        },
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderColor: '#ddd',
        borderWidth: 1,
        titleColor: '#333'
      }
    },
    scales: {
      x: { type: 'time' },
      y: {
        position: 'left',
        title: { display: true, text: 'Temperature (°C)' },
        ticks: { callback: v => `${v}°C` }
      },
      y2: {
        position: 'right',
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Air pollution (µg/m³)' },
        ticks: { callback: v => `${v}` }
      }
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

        const tempPoints: LinePoint[] = res.points.map(p =>
          p.temperature == null ? null : { x: new Date(p.recordedAt).getTime(), y: p.temperature }
        );
        const pm10Points: LinePoint[] = res.points.map(p =>
          p.pm10 == null ? null : { x: new Date(p.recordedAt).getTime(), y: p.pm10 }
        );
        const pm25Points: LinePoint[] = res.points.map(p =>
          p.pm2_5 == null ? null : { x: new Date(p.recordedAt).getTime(), y: p.pm2_5 }
        );

        const datasets: ChartDataset<'line', LinePoint[]>[] = [
          {
            label: 'Temperature (°C)',
            data: tempPoints,
            borderColor: 'red',
            pointRadius: 0,
            tension: 0.2,
            yAxisID: 'y'
          } as ChartDataset<'line', LinePoint[]>,
          {
            label: 'PM10 (µg/m³)',
            data: pm10Points,
            borderColor: 'blue',
            pointRadius: 0,
            tension: 0.2,
            yAxisID: 'y2'
          } as ChartDataset<'line', LinePoint[]>,
          {
            label: 'PM2.5 (µg/m³)',
            data: pm25Points,
            borderColor: 'orange',
            pointRadius: 0,
            tension: 0.2,
            yAxisID: 'y2'
          } as ChartDataset<'line', LinePoint[]>
        ];

        this.lineData = { datasets };

        const validTemps = res.points.map(p => p.temperature).filter((v): v is number => v != null);
        const validPm10  = res.points.map(p => p.pm10).filter((v): v is number => v != null);
        const validPm25  = res.points.map(p => p.pm2_5).filter((v): v is number => v != null);

        const avg = (arr: number[]) => arr.length ? Number((arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1)) : null;
        this.averages = {
          temp: avg(validTemps),
          pm10: avg(validPm10),
          pm25: avg(validPm25),
        };
      });
  }
}
