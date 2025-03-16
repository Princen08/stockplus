import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StockDetailComponent } from './components/stock-detail/stock-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'stock/:symbol', component: StockDetailComponent },
  { path: '**', redirectTo: '/dashboard' }
];
