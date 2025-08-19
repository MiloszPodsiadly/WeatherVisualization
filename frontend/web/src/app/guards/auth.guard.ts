import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map, of, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.refreshMe().pipe(
    map(me => {
      if (me) return true;
      const tree: UrlTree = router.createUrlTree(['/login'], { queryParams: { returnUrl: router.url } });
      return tree;
    }),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
