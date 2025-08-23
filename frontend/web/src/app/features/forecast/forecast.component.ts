// src/app/features/forecast/forecast.component.ts
import {
  Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ForecastApiService, PlSnapshotResponse, CitySnapshot, RangeKey } from '../../services/forecast-api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type DisplayCity = { id: string; name: string; lat: number; lon: number; tMax?: number | null; pop?: number | null };

@Component({
  standalone: true,
  selector: 'app-forecast',
  imports: [CommonModule],
  templateUrl: './forecast.component.html',
  styleUrls: ['./forecast.component.scss'],
})
export class ForecastComponent implements AfterViewInit, OnDestroy {
  ranges = [
    { key: 'today' as const,    label: 'Today' },
    { key: 'tomorrow' as const, label: 'Tomorrow' },
    { key: '+2' as const,       label: 'In 2 days' },
    { key: 'week' as const,     label: 'Next 7 days' },
  ];
  active: RangeKey = 'today';

  /** Base geometry: always draw these 8 pins. */
  private readonly BASE_CITIES: DisplayCity[] = [
    { id: 'waw', name: 'Warsaw',   lat: 52.2297, lon: 21.0122 },
    { id: 'krk', name: 'Kraków',   lat: 50.0647, lon: 19.9450 },
    { id: 'ldz', name: 'Łódź',     lat: 51.7592, lon: 19.4550 },
    { id: 'wro', name: 'Wrocław',  lat: 51.1079, lon: 17.0385 },
    { id: 'poz', name: 'Poznań',   lat: 52.4064, lon: 16.9252 },
    { id: 'gda', name: 'Gdańsk',   lat: 54.3520, lon: 18.6466 },
    { id: 'szc', name: 'Szczecin', lat: 53.4285, lon: 14.5528 },
    { id: 'lub', name: 'Lublin',   lat: 51.2465, lon: 22.5684 },
  ];

  /** What we actually draw. */
  private cities: DisplayCity[] = this.BASE_CITIES.map(c => ({ ...c }));

  private data?: PlSnapshotResponse;

  @ViewChild('imgEl', { static: true })    imgEl!: ElementRef<HTMLImageElement>;
  @ViewChild('canvasEl', { static: true }) canvasEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cardEl', { static: true })   cardEl!: ElementRef<HTMLDivElement>;

  private ro?: ResizeObserver;
  private offResize?: () => void;

  constructor(
    private api: ForecastApiService,
    private destroyRef: DestroyRef     // <-- for takeUntilDestroyed
  ) {}

  ngAfterViewInit(): void {
    const img = this.imgEl.nativeElement;

    img.addEventListener('load', () => this.redraw());
    if (img.complete) requestAnimationFrame(() => this.redraw());

    const onWinResize = () => this.redraw();
    window.addEventListener('resize', onWinResize);
    this.offResize = () => window.removeEventListener('resize', onWinResize);

    this.ro = new ResizeObserver(() => this.redraw());
    this.ro.observe(img);

    this.load(this.active);
  }

  ngOnDestroy(): void { this.offResize?.(); this.ro?.disconnect(); }

  setRange(r: RangeKey | string) {
    const k = this.normalizeRange(r);
    if (this.active === k) return;
    this.active = k;
    this.load(k);
  }

  private normalizeRange(r: RangeKey | string): RangeKey {
    switch ((r ?? '').toLowerCase()) {
      case 'tomorrow': return 'tomorrow';
      case '+2':
      case 'plus2':
      case 'day2':     return '+2';
      case 'week':
      case '7d':       return 'week';
      default:         return 'today';
    }
  }

  /** Fetch snapshot, map payload to pins, redraw. */
  private load(r: RangeKey) {
    this.api.plSnapshot(r)
      .pipe(takeUntilDestroyed(this.destroyRef))   // <-- pass DestroyRef to avoid NG0203
      .subscribe({
        next: (d) => {
          console.log('pl-snapshot OK →', d);      // should print your JSON

          this.data = d;
          this.active = this.normalizeRange(d.range);

          const payload = Array.isArray(d.cities) ? d.cities : [];

          // Use backend’s cities directly; preserve 0 for pop
          this.cities = payload.length
            ? payload.map(c => ({
              id: c.id,
              name: c.name,
              lat: c.lat,
              lon: c.lon,
              tMax: c.tMax ?? null,
              pop:  c.pop  ?? null,
            }))
            : this.BASE_CITIES.map(b => ({ ...b, tMax: null, pop: null }));

          this.redraw();
        },
        error: (err) => {
          console.error('plSnapshot FAILED →', err);
          this.cities = this.BASE_CITIES.map(b => ({ ...b, tMax: null, pop: null }));
          this.redraw();
        }
      });
  }

  /** ---------------- Drawing ---------------- */
  private redraw() {
    const img = this.imgEl.nativeElement;
    const cvs = this.canvasEl.nativeElement;

    const rect = img.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) { requestAnimationFrame(() => this.redraw()); return; }

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    cvs.style.width  = `${rect.width}px`;
    cvs.style.height = `${rect.height}px`;
    cvs.width  = Math.round(rect.width  * dpr);
    cvs.height = Math.round(rect.height * dpr);

    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Map content box (trim the image’s white margins)
    const PAD = { l: 0.07, r: 0.06, t: 0.06, b: 0.05 };
    const boxX = rect.width  * PAD.l;
    const boxY = rect.height * PAD.t;
    const boxW = rect.width  * (1 - PAD.l - PAD.r);
    const boxH = rect.height * (1 - PAD.t - PAD.b);

    // thin frame showing the plotting area
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,.15)';
    ctx.strokeRect(Math.round(boxX)+0.5, Math.round(boxY)+0.5, Math.round(boxW), Math.round(boxH));
    ctx.restore();

    // Title inside the map
    ctx.save();
    ctx.fillStyle = '#0d1b4d';
    ctx.font = '700 22px Inter, Roboto, Arial, sans-serif';
    ctx.fillText('Poland forecast', boxX + 12, boxY + 26);
    ctx.restore();

    // Projection
    const minLat = 49.0, maxLat = 55.2;
    const minLon = 14.0, maxLon = 24.5;

    const k = Math.max(1, rect.width / 900);
    ctx.font = `${12 * k}px Inter, Roboto, Arial, sans-serif`;
    ctx.textBaseline = 'middle';

    const drawPin = (c: DisplayCity) => {
      const x01 = (c.lon - minLon) / (maxLon - minLon);
      const y01 = 1 - (this.mercY(c.lat) - this.mercY(minLat)) / (this.mercY(maxLat) - this.mercY(minLat));
      const x = boxX + x01 * boxW;
      const y = boxY + y01 * boxH;

      const temp = c.tMax != null ? `${Math.round(c.tMax)}°` : '–';
      const pop  = c.pop  != null ? `${c.pop}%` : '–';
      const label = `${c.name}  ${temp}  •  ${pop}`;

      const padX = 8 * k, h = 22 * k, r = 6 * k;
      const w = ctx.measureText(label).width + padX * 2;
      const bx = Math.round(x - w / 2);
      const by = Math.round(y - (24 * k));

      this.roundRect(ctx, bx, by, w, h, r, 'rgba(255,255,255,0.96)', 'rgba(0,0,0,0.08)');
      ctx.fillStyle = '#0d1b4d';
      ctx.fillText(label, bx + padX, by + h / 2);

      ctx.beginPath();
      ctx.fillStyle = '#1e3a8a';
      ctx.arc(x, y, 3.5 * k, 0, Math.PI * 2);
      ctx.fill();
    };

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur  = 6;

    for (const c of this.cities) drawPin(c);

    ctx.restore();

    ctx.fillStyle = '#64748b';
    ctx.fillText('Temp (°C)  •  Rain probability (%)', boxX + 8 * k, boxY + boxH - 10 * k);
  }

  private mercY(lat: number) {
    return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x:number,y:number,w:number,h:number,r:number, fill:string, stroke?:string
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
}
