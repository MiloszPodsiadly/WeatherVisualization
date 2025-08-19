import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf, AsyncPipe } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf, AsyncPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  userName: string | null = null;
  me$ = this.auth.me$;

  ngOnInit(): void {
    this.auth.refreshMe().subscribe(me =>
      this.userName = me?.displayName || me?.email || null
    );
  }

  get lastCityLink() {
    const id = localStorage.getItem('lastLocationId');
    return id ? ['/city', id] : ['/search'];
  }

  get lastHistoryLink() {
    const id = localStorage.getItem('lastLocationId');
    return id ? ['/history', id] : ['/search'];
  }

  logout() {
    this.auth.logout().subscribe();
  }
}
