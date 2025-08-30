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

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AirQualityApiService);

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

  pmUvOptions!:  ChartOptions<'bar'>;
  gasesOptions!: ChartOptions<'bar'>;

  ngOnInit(): void {
    this.readCssColors();
    this.locationId = this.route.snapshot.paramMap.get('id')!;

    this.api.live(this.locationId).subscribe({
      next: (res) => {
        this.series = res;
        this.buildCharts(res.points ?? []);
        this.loading = false;
      },
      error: () => {
        this.api.history(this.locationId).subscribe({
          next: (res) => {
            this.series = res;
            this.buildCharts(res.points ?? []);
            this.loading = false;
          },
          error: (e2) => {
            console.error(e2);
            this.error = 'Failed to download air quality data.';
            this.loading = false;
          }
        });
      }
    });
  }

  private buildCharts(points: AirQualityPointDto[]) {
    if (!points?.length) {
      const now = Date.now();
      const min = now - 24 * 3600_000;
      this.pmUvData = { labels: [], datasets: [] };
      this.gasesData = { labels: [], datasets: [] };
      this.pmUvOptions  = this.buildPmUvOptions(min, now);
      this.gasesOptions = this.buildGasesOptions(min, now);
      return;
    }

    const hasAny = (p: AirQualityPointDto) =>
      p.pm10 != null || p.pm25 != null || p.uv  != null ||
      p.co   != null || p.co2  != null || p.no2 != null ||
      p.so2  != null || p.o3   != null || p.ch4 != null;

    const latest = points
      .filter(hasAny)
      .reduce((m, p) => Math.max(m, new Date(p.time).setMinutes(0, 0, 0)), -Infinity);

    if (!isFinite(latest)) {
      // No meaningful values -> fallback to now
      const now = Date.now();
      const min = now - 24 * 3600_000;
      this.pmUvData = { labels: [], datasets: [] };
      this.gasesData = { labels: [], datasets: [] };
      this.pmUvOptions  = this.buildPmUvOptions(min, now);
      this.gasesOptions = this.buildGasesOptions(min, now);
      return;
    }

    // EXACT 24 full hours: [minT .. maxT] inclusive (24 points)
    const maxT = latest;
    const minT = maxT - 23 * 3600_000;

    // Index by hour (truncate to :00). Keep only those inside [minT, maxT]
    const byHour = new Map<number, AirQualityPointDto>();
    for (const p of points) {
      const t = new Date(p.time);
      t.setMinutes(0, 0, 0);
      const ms = t.getTime();
      if (ms >= minT && ms <= maxT) byHour.set(ms, p);
    }

    const labels: Date[] = [];
    const pad = (pick: (p: AirQualityPointDto) => number | null | undefined) => {
      const arr: (number | null)[] = [];
      for (let t = minT; t <= maxT; t += 3600_000) {
        labels.push(new Date(t));
        const p = byHour.get(t);
        const v = p ? pick(p) : null;
        arr.push(v == null || !isFinite(v as number) ? null : (v as number));
      }
      return arr;
    };

    const pm10 = pad(p => p.pm10);
    const pm25 = pad(p => p.pm25);
    const uv   = pad(p => p.uv);

    const commonBar: Partial<ChartDataset<'bar'>> = {
      borderWidth: 0,
      barPercentage: 0.9,
      categoryPercentage: 0.8
    };

    this.pmUvData = {
      labels,
      datasets: [
        { label: 'PM10 (µg/m³)',  data: pm10, backgroundColor: this.col.pm10, yAxisID: 'y',  ...commonBar },
        { label: 'PM2.5 (µg/m³)', data: pm25, backgroundColor: this.col.pm25, yAxisID: 'y',  ...commonBar },
        { label: 'UV Index',      data: uv,   backgroundColor: this.col.uv,   yAxisID: 'y1', ...commonBar }
      ]
    };

    const no2 = pad(p => p.no2);
    const so2 = pad(p => p.so2);
    const co  = pad(p => p.co);
    const o3  = pad(p => p.o3);
    const ch4 = pad(p => p.ch4);
    const co2 = pad(p => p.co2);

    this.gasesData = {
      labels,
      datasets: [
        { label: 'NO₂ (µg/m³)', data: no2, backgroundColor: this.col.no2, yAxisID: 'y',  ...commonBar },
        { label: 'SO₂ (µg/m³)', data: so2, backgroundColor: this.col.so2, yAxisID: 'y',  ...commonBar },
        { label: 'CO  (µg/m³)', data: co,  backgroundColor: this.col.co,  yAxisID: 'y',  ...commonBar },
        { label: 'O₃  (µg/m³)', data: o3,  backgroundColor: this.col.o3,  yAxisID: 'y',  ...commonBar },
        { label: 'CH₄ (µg/m³)', data: ch4, backgroundColor: this.col.ch4, yAxisID: 'y',  ...commonBar },

        { label: 'CO₂ (ppm)',   data: co2, backgroundColor: this.col.co2, yAxisID: 'y1', ...commonBar }
      ]
    };

    this.pmUvOptions  = this.buildPmUvOptions(minT, maxT);
    this.gasesOptions = this.buildGasesOptions(minT, maxT);
  }

  private buildPmUvOptions(minMs: number, maxMs: number): ChartOptions<'bar'> {
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
        x: { type: 'time', time: { unit: 'hour' }, min: minMs, max: maxMs } as any,
        y:  { position: 'left',  title: { display: true, text: 'µg/m³' } },
        y1: { position: 'right', title: { display: true, text: 'UV Index' }, grid: { drawOnChartArea: false } }
      }
    };
  }

  private buildGasesOptions(minMs: number, maxMs: number): ChartOptions<'bar'> {
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
              return `${l}: ${v}`;
            }
          }
        }
      },
      scales: {
        x:  { type: 'time', time: { unit: 'hour' }, min: minMs, max: maxMs } as any,
        y:  { position: 'left',  title: { display: true, text: 'µg/m³ (CO, NO₂, SO₂, CH₄, O₃)' } },
        y1: { position: 'right', title: { display: true, text: 'ppm (CO₂)' }, grid: { drawOnChartArea: false } }
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
      case 'pm25':
      case 'co':
      case 'o3':
      case 'ch4':
      case 'no2':
      case 'so2':
        return 'µg/m³';
      case 'co2': return 'ppm';
      case 'uv':  return '';
      default:    return '';
    }
  }

  chipClass(metric: Metric, value: number | null): string {
    if (value == null) return 'aqi-unknown';
    if (metric === 'pm25') {
      if (value <= 10) return 'aqi-verygood';
      if (value <= 20) return 'aqi-good';
      if (value <= 25) return 'aqi-medium';
      if (value <= 50) return 'aqi-low';
      if (value <= 75) return 'aqi-bad';
      return 'aqi-extremelybad';
    }
    if (metric === 'pm10') {
      if (value <= 20) return 'aqi-verygood';
      if (value <= 35) return 'aqi-good';
      if (value <= 50) return 'aqi-medium';
      if (value <= 100) return 'aqi-low';
      if (value <= 200) return 'aqi-bad';
      return 'aqi-extremelybad';
    }
    if (metric === 'uv') {
      if (value <= 2)  return 'aqi-verygood';
      if (value <= 5)  return 'aqi-good';
      if (value <= 7)  return 'aqi-medium';
      if (value <= 10) return 'aqi-low';
      if (value <= 14) return 'bad';
      return 'aqi-extremelybad';
    }
    if (metric === 'co') {
      if (value <= 2000) return 'aqi-verygood';
      if (value <= 4000) return 'aqi-good';
      if (value <= 7000) return 'aqi-medium';
      if (value <= 10000) return 'aqi-low';
      if (value <= 25000) return 'aqi-bad';
      return 'aqi-extremelybad';
    }
    if (metric === 'co2') {
      if (value <= 600)  return 'aqi-verygood';
      if (value <= 1000) return 'aqi-good';
      if (value <= 1500) return 'aqi-medium';
      if (value <= 2500) return 'aqi-low';
      return 'aqi-bad';
    }
    if (metric === 'no2') {
      if (value <= 20) return 'aqi-verygood';
      if (value <= 40) return 'aqi-good';
      if (value <= 100) return 'aqi-medium';
      if (value <= 200) return 'aqi-low';
      if (value <= 400) return 'aqi-bad';
      return 'aqi-extremelybad';
    }
    if (metric === 'so2') {
      if (value <= 20)  return 'aqi-verygood';
      if (value <= 50)  return 'aqi-good';
      if (value <= 125) return 'aqi-medium';
      if (value <= 350) return 'aqi-low';
      if (value <= 500) return 'aqi-bad';
      return 'aqi-extremelybad';
    }
    if (metric === 'o3') {
      if (value <= 55)  return 'aqi-verygood';
      if (value <= 75)  return 'aqi-good';
      if (value <= 120) return 'aqi-medium';
      if (value <= 180) return 'aqi-low';
      if (value <= 240) return 'aqi-bad';
      return 'aqi-extremelybad';
    }
    if (metric === 'ch4') {
      if (value <= 1000) return 'aqi-verygood';
      if (value <= 1500) return 'aqi-good';
      if (value <= 2000) return 'aqi-medium';
      if (value <= 5000) return 'aqi-low';
      return 'aqi-bad';
    }
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
    const v = (n: string, fallback: string) => this.cssVar(n) || fallback;
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
