import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { NgIf, JsonPipe } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [NgIf, JsonPipe],
})
export class LoginComponent implements OnInit {
  meData: any = null;
  loading = false;
  error: string | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.checkMe();
  }

  loginGoogle() {
    location.href = 'http://localhost:8080/oauth2/authorization/google';
  }

  loginGithub() {
    location.href = 'http://localhost:8080/oauth2/authorization/github';
  }


  whoAmI() { this.checkMe(true); }

  private checkMe(showErrors = false) {
    this.loading = true; this.error = null;
    this.api.me().subscribe({
      next: d => { this.meData = d; this.loading = false; },
      error: e => {
        this.loading = false;
        this.meData = null;
        if (showErrors && e?.status !== 401) this.error = e?.message ?? 'Error';
      }
    });
  }

  doLogout() {
    this.loading = true;
    this.api.logout().subscribe({
      next: () => { this.loading = false; this.meData = null; location.assign('/'); },
      error: () => { this.loading = false; location.assign('/'); }
    });
  }
}
