import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {tabsRoutes} from './tabs-routing.module';

describe('shopping routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter(tabsRoutes)]});
  });

  it('redirects old shopping links and keeps scanner query parameters', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/tabs/todo');
    expect(router.url).toBe('/tabs/shopping');
    await router.navigateByUrl('/tabs/todo/scan?from=fridge');
    expect(router.url).toBe('/tabs/shopping/scan?from=fridge');
    await router.navigateByUrl('/');
    expect(router.url).toBe('/tabs/shopping');
  });
});
