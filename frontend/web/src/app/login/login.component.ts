import { Component, OnInit, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [NgIf, RouterLink],
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  meData: any = null;

  ngOnInit() {
    const ret =
      this.route.snapshot.queryParamMap.get('returnUrl') ||
      localStorage.getItem('returnUrl') ||
      '/welcome';

    this.auth.refreshMe().subscribe(me => {
      this.meData = me;
      if (me) this.router.navigateByUrl(ret);
    });
  }

  loginGoogle() {
    this.auth.loginGoogle('/welcome');
  }

  loginGithub() {
    this.auth.loginGithub('/welcome');
  }
}
