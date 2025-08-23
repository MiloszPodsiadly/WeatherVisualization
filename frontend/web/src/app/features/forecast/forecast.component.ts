import {
  Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ForecastApiService, PlSnapshotResponse, RangeKey } from '../../services/forecast-api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type DisplayCity = {
  id: string; name: string; lat: number; lon: number;
  tMax?: number | null; pop?: number | null;
};

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

  private readonly BASE_CITIES: DisplayCity[] = [
    { id: 'waw', name: 'Warsaw',       lat: 52.2297, lon: 21.0122 },
    { id: 'krk', name: 'Kraków',       lat: 50.0647, lon: 19.9450 },
    { id: 'ldz', name: 'Łódź',         lat: 51.7592, lon: 19.4550 },
    { id: 'wro', name: 'Wrocław',      lat: 51.1079, lon: 17.0385 },
    { id: 'poz', name: 'Poznań',       lat: 52.4064, lon: 16.9252 },
    { id: 'gda', name: 'Gdańsk',       lat: 54.3520, lon: 18.6466 },
    { id: 'szc', name: 'Szczecin',     lat: 53.4285, lon: 14.5528 },
    { id: 'lub', name: 'Lublin',       lat: 51.2465, lon: 22.5684 },
    { id: 'bia', name: 'Białystok',    lat: 53.1325, lon: 23.1688 },
    { id: 'rze', name: 'Rzeszów',      lat: 50.0412, lon: 21.9991 },
    { id: 'opl', name: 'Opole',        lat: 50.6751, lon: 17.9213 },
    { id: 'ols', name: 'Olsztyn',      lat: 53.7784, lon: 20.4801 },
    { id: 'tor', name: 'Toruń',        lat: 53.0138, lon: 18.5984 },
    { id: 'zgo', name: 'Zielona Góra', lat: 51.9356, lon: 15.5062 },
    { id: 'kos', name: 'Koszalin',     lat: 54.1940, lon: 16.1720 },
    { id: 'kie', name: 'Kielce',       lat: 50.8661, lon: 20.6286 },
  ];


  private readonly CITY_OFFSETS: Record<string, { dx: number; dy: number }> = {
    szc: { dx: -0.035, dy: -0.070 },
    gda: { dx: -0.024, dy: -0.044 },
    poz: { dx:  0.014, dy: -0.042 },
    wro: { dx: -0.050, dy: -0.032 },
    ldz: { dx: -0.032, dy: -0.032 },
    waw: { dx:  0.014, dy: -0.032 },
    lub: { dx: -0.012, dy: -0.018 },
    krk: { dx: -0.014, dy: -0.018 },
    bia: { dx:  0.010, dy: -0.016 },
    rze: { dx:  0.006, dy: -0.010 },
    opl: { dx: -0.026, dy: -0.030 },
    ols: { dx:  0.012, dy: -0.020 },
    tor: { dx:  0.028, dy: -0.002 },
    zgo: { dx: -0.010, dy: -0.012 },
    kos: { dx: -0.028, dy: -0.048 },
    kie: { dx:  0.006, dy: -0.028 },
  };

  private cities: DisplayCity[] = this.BASE_CITIES.map(c => ({ ...c }));

  private data?: PlSnapshotResponse;

  @ViewChild('imgEl', { static: true })    imgEl!: ElementRef<HTMLImageElement>;
  @ViewChild('canvasEl', { static: true }) canvasEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cardEl', { static: true })   cardEl!: ElementRef<HTMLDivElement>;

  private ro?: ResizeObserver;
  private offResize?: () => void;

  constructor(
    private api: ForecastApiService,
    private destroyRef: DestroyRef
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

  private load(r: RangeKey) {
    this.api.plSnapshot(r)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.data = d;
          this.active = this.normalizeRange(d.range);

          const byId = new Map(d.cities?.map(c => [c.id, c]) ?? []);
          this.cities = this.BASE_CITIES.map(base => {
            const m = byId.get(base.id);
            return m
              ? { ...base, tMax: m.tMax ?? null, pop: m.pop ?? null }
              : { ...base, tMax: null, pop: null };
          });

          this.redraw();
        },
        error: (err) => {
          console.error('plSnapshot failed', err);
          this.cities = this.BASE_CITIES.map(b => ({ ...b, tMax: null, pop: null }));
          this.redraw();
        }
      });
  }

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

    const PAD = { l: 0.07, r: 0.06, t: 0.06, b: 0.05 };
    const boxX = rect.width  * PAD.l;
    const boxY = rect.height * PAD.t;
    const boxW = rect.width  * (1 - PAD.l - PAD.r);
    const boxH = rect.height * (1 - PAD.t - PAD.b);

    ctx.save();
    ctx.fillStyle = '#0d1b4d';
    ctx.font = '700 22px Inter, Roboto, Arial, sans-serif';
    ctx.fillText('Poland forecast', boxX + 12, boxY + 26);
    ctx.restore();

    const minLat = 49.0, maxLat = 55.2;
    const minLon = 14.0, maxLon = 24.5;

    const k = Math.max(1, rect.width / 900);
    ctx.font = `${12 * k}px Inter, Roboto, Arial, sans-serif`;
    ctx.textBaseline = 'middle';

    const drawPin = (c: DisplayCity) => {
      const x01 = (c.lon - minLon) / (maxLon - minLon);
      const y01 = (maxLat - c.lat) / (maxLat - minLat);

      const off = this.CITY_OFFSETS[c.id] ?? { dx: 0, dy: 0 };
      const x = boxX + (x01 + off.dx) * boxW;
      const y = boxY + (y01 + off.dy) * boxH;

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
