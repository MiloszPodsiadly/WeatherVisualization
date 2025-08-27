import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions, ChartDataset, TooltipItem } from 'chart.js';
import 'chartjs-adapter-date-fns';

import { AirQualityApiService } from '../../services/air-quality-api.service';
import { AirQualitySeriesDto, AirQualityPointDto } from '../../models';

type Metric =
  | 'pm10' | 'pm25' | 'uv'
  | 'co' | 'co2' | 'no2' | 'so2' | 'o3' | 'ch4';

@Component({
  standalone: true,
  selector: 'app-air-quality',
  imports: [CommonModule, MatCardModule, NgChartsModule],
  templateUrl: './air-quality.component.html',
  styleUrls: ['./air-quality.component.scss']
})
export class AirQualityComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private api = inject(AirQualityApiService);

  locationId!: string;
  series?: AirQualitySeriesDto;

  loading = true;
  error?: string;

  private col = {
    pm10: '#3b82f6',
    pm25: '#f59e0b',
    uv:   '#7c3aed',
    no2:  '#eab308',
    so2:  '#f43f5e',
    co:   '#2563eb',
    co2:  '#10b981',
    o3:   '#22c55e',
    ch4:  '#6b7280'
  };

  pmUvData:  ChartData<'bar'> = { labels: [], datasets: [] };
  gasesData: ChartData<'bar'> = { labels: [], datasets: [] };

  pmUvOptions:  ChartOptions<'bar'> = this.buildPmUvOptions();
  gasesOptions: ChartOptions<'bar'> = this.buildGasesOptions();

  ngOnInit(): void {
    this.readCssColors();

    this.locationId = this.route.snapshot.paramMap.get('id')!;
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

    this.api.live(this.locationId, from.toISOString(), to.toISOString()).subscribe({
      next: (res) => {
        this.series = res;
        this.buildCharts(res.points);
        this.loading = false;
      },
      error: () => {
        this.api.history(this.locationId, from.toISOString(), to.toISOString()).subscribe({
          next: (res) => {
            this.series = res;
            this.buildCharts(res.points);
            this.loading = false;
          },
          error: (e2) => {
            console.error(e2);
            this.error = 'Nie udało się pobrać danych jakości powietrza.';
            this.loading = false;
          }
        });
      }
    });
  }

  private buildCharts(points: AirQualityPointDto[]) {
    const labels = points.map(p => new Date(p.time));

    const vals = <K extends keyof AirQualityPointDto>(k: K) =>
      points.map(p => (p[k] as unknown as number | null | undefined) ?? null);

    const pm10 = vals('pm10');
    const pm25 = vals('pm25');
    const uv   = vals('uv');

    const commonBar: Partial<ChartDataset<'bar'>> = {
      borderWidth: 0,
      barPercentage: 0.9,
      categoryPercentage: 0.8
    };

    const pmUvSets: ChartDataset<'bar'>[] = [
      { label: 'PM10 (µg/m³)',  data: pm10, backgroundColor: this.col.pm10, yAxisID: 'y',  ...commonBar },
      { label: 'PM2.5 (µg/m³)', data: pm25, backgroundColor: this.col.pm25, yAxisID: 'y',  ...commonBar },
      { label: 'UV Index',      data: uv,   backgroundColor: this.col.uv,   yAxisID: 'y1', ...commonBar }
    ];
    this.pmUvData = { labels, datasets: pmUvSets };

    const no2 = vals('no2');
    const so2 = vals('so2');
    const co  = vals('co');
    const co2 = vals('co2');
    const o3  = vals('o3');
    const ch4 = vals('ch4');

    const gasesSets: ChartDataset<'bar'>[] = [
      { label: 'NO₂ (µg/m³)', data: no2, backgroundColor: this.col.no2, yAxisID: 'y',  ...commonBar },
      { label: 'SO₂ (µg/m³)', data: so2, backgroundColor: this.col.so2, yAxisID: 'y',  ...commonBar },
      { label: 'CO (ppm)',    data: co,  backgroundColor: this.col.co,  yAxisID: 'y1', ...commonBar },
      { label: 'CO₂ (ppm)',   data: co2, backgroundColor: this.col.co2, yAxisID: 'y1', ...commonBar },
      { label: 'O₃ (ppb)',    data: o3,  backgroundColor: this.col.o3,  yAxisID: 'y1', ...commonBar },
      { label: 'CH₄ (ppb)',   data: ch4, backgroundColor: this.col.ch4, yAxisID: 'y1', ...commonBar }
    ];
    this.gasesData = { labels, datasets: gasesSets };
  }

  private buildPmUvOptions(): ChartOptions<'bar'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) => {
              const v = ctx.parsed.y;
              const l = ctx.dataset.label ?? '';
              if (l.includes('PM10'))  return `PM10: ${v} µg/m³`;
              if (l.includes('PM2.5')) return `PM2.5: ${v} µg/m³`;
              if (l.includes('UV'))    return `UV Index: ${v}`;
              return `${l}: ${v}`;
            }
          }
        }
      },
      scales: {
        x: { type: 'time', time: { unit: 'hour' } } as any,
        y:  { position: 'left',  title: { display: true, text: 'µg/m³' } },
        y1: { position: 'right', title: { display: true, text: 'UV Index' }, grid: { drawOnChartArea: false } }
      }
    };
  }

  private buildGasesOptions(): ChartOptions<'bar'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) => {
              const v = ctx.parsed.y;
              const l = ctx.dataset.label ?? '';
              if (l.includes('(µg/m³)')) return `${l.split(' ')[0]}: ${v} µg/m³`;
              if (l.includes('(ppm)'))   return `${l.split(' ')[0]}: ${v} ppm`;
              if (l.includes('(ppb)'))   return `${l.split(' ')[0]}: ${v} ppb`;
              return `${l}: ${v}`;
            }
          }
        }
      },
      scales: {
        x:  { type: 'time', time: { unit: 'hour' } } as any,
        y:  { position: 'left',  title: { display: true, text: 'µg/m³ (NO₂, SO₂)' } },
        y1: { position: 'right', title: { display: true, text: 'ppm / ppb (CO, CO₂, O₃, CH₄)' }, grid: { drawOnChartArea: false } }
      }
    };
  }

  avgOf(metric: Metric): number | null {
    const a = this.series?.averages;
    return a ? (a as any)[metric] ?? null : null;
  }

  unit(metric: Metric): string {
    switch (metric) {
      case 'pm10':
      case 'pm25': return 'µg/m³';
      case 'uv':   return '';
      case 'co':
      case 'co2':  return 'ppm';
      case 'o3':
      case 'ch4':  return 'ppb';
      case 'no2':
      case 'so2':  return 'µg/m³';
      default:     return '';
    }
  }

  chipClass(metric: Metric, value: number | null): string {
    if (value == null) return 'aqi-unknown';
    if (metric === 'pm25') { if (value <= 12) return 'aqi-verygood'; if (value <= 20) return 'aqi-good'; if (value <= 25) return 'aqi-medium'; if (value <= 50) return 'aqi-low'; return 'aqi-bad'; }
    if (metric === 'pm10') { if (value <= 20) return 'aqi-verygood'; if (value <= 50) return 'aqi-good'; if (value <= 80) return 'aqi-medium'; if (value <= 110) return 'aqi-low'; return 'aqi-bad'; }
    if (metric === 'uv')   { if (value <= 2)  return 'aqi-verygood'; if (value <= 5)  return 'aqi-good'; if (value <= 7)  return 'aqi-medium'; if (value <= 10) return 'aqi-low'; return 'aqi-bad'; }
    if (metric === 'co')   { if (value < 2)   return 'aqi-verygood'; if (value < 9)   return 'aqi-good'; if (value <= 35) return 'aqi-medium'; return 'aqi-bad'; }
    if (metric === 'co2')  { if (value <= 600) return 'aqi-verygood'; if (value <= 1000) return 'aqi-good'; if (value <= 2000) return 'aqi-medium'; return 'aqi-bad'; }
    if (metric === 'no2')  { if (value <= 10) return 'aqi-verygood'; if (value <= 20) return 'aqi-good'; if (value <= 50) return 'aqi-medium'; return 'aqi-bad'; }
    if (metric === 'so2')  { if (value < 20)  return 'aqi-verygood'; if (value <= 40) return 'aqi-good'; if (value <= 125) return 'aqi-medium'; return 'aqi-bad'; }
    if (metric === 'o3')   { if (value < 30)  return 'aqi-verygood'; if (value < 55)  return 'aqi-good'; if (value <= 70) return 'aqi-medium'; if (value <= 85) return 'aqi-low'; return 'aqi-bad'; }
    if (metric === 'ch4')  { if (value < 800) return 'aqi-verygood'; if (value < 1500) return 'aqi-good'; if (value < 1800) return 'aqi-medium'; if (value <= 1900) return 'aqi-low'; return 'aqi-bad'; }
    return 'aqi-unknown';
  }

  format(value: number | null, metric: Metric): string {
    if (value == null) return '—';
    const u = this.unit(metric);
    return u ? `${value.toFixed(1)} ${u}` : value.toFixed(1);
  }

  private cssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  private readCssColors() {
    const v = (n: string, fallback: string) =>
      this.cssVar(n) || fallback;
    this.col.pm10 = v('--aq-color-pm10', this.col.pm10);
    this.col.pm25 = v('--aq-color-pm25', this.col.pm25);
    this.col.uv   = v('--aq-color-uv',   this.col.uv);
    this.col.no2  = v('--aq-color-no2',  this.col.no2);
    this.col.so2  = v('--aq-color-so2',  this.col.so2);
    this.col.co   = v('--aq-color-co',   this.col.co);
    this.col.co2  = v('--aq-color-co2',  this.col.co2);
    this.col.o3   = v('--aq-color-o3',   this.col.o3);
    this.col.ch4  = v('--aq-color-ch4',  this.col.ch4);
  }
}
