import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './api.types';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data?.['roles'] as Role[] | undefined;
  const currentUser = auth.currentUser();

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (!currentUser?.role) {
    return router.createUrlTree(['/login']);
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};