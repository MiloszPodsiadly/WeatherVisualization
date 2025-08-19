import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf, AsyncPipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink, NgIf, AsyncPipe], // <-- include AsyncPipe
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent {
  auth = inject(AuthService);

  get lastCityLink() {
    const id = localStorage.getItem('lastLocationId');
    return id ? ['/city', id] : ['/search'];
  }

  get lastHistoryLink() {
    const id = localStorage.getItem('lastLocationId');
    return id ? ['/history', id] : ['/search'];
  }
}
