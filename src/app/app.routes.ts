import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ItemEntryComponent } from './components/item-entry/item-entry.component';
import { PurchaseOrdersComponent } from './components/purchase-orders/purchase-orders.component';
import { UnitsComponent } from './components/units/units.component';
import { OpeningBalancesComponent } from './components/opening-balances/opening-balances.component';
import { DispatchComponent } from './components/dispatch/dispatch.component';
import { AddExpenseComponent } from './components/add-expense/add-expense.component';
import { ReturnsComponent } from './components/returns/returns.component';
import { TransferComponent } from './components/transfer/transfer.component';
import { DisposalComponent } from './components/disposal/disposal.component';
import { ReportsComponent } from './components/reports/reports.component';
import { UserSearchComponent } from './components/user-search/user-search.component';
import { AdminComponent } from './components/admin/admin.component';
import { AuthGuard } from './guards/auth.guard';
import { AddCustodyRecordComponent } from './components/add-custody-record/add-custody-record.component';
import { ReviewCustodyRecordComponent } from './components/review-custody-record/review-custody-record.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard],
    children: [
      { path: 'item-entry', component: ItemEntryComponent },
      { path: 'purchase-orders', component: PurchaseOrdersComponent },
      { path: 'units', component: UnitsComponent },
      { path: 'opening-balances', component: OpeningBalancesComponent },
      { path: 'dispatch', component: DispatchComponent },
      { path: 'add-expense', component: AddExpenseComponent },
      { path: 'returns', component: ReturnsComponent },
      { path: 'transfer', component: TransferComponent },
      { path: 'disposal', component: DisposalComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'custodyrecord', component: AddCustodyRecordComponent },
      { path: 'Review-custody', component: ReviewCustodyRecordComponent },
      { path: 'user-search', component: UserSearchComponent },
      { path: 'operations-view', loadComponent: () => import('./components/operations-view/operations-view.component').then(m => m.OperationsViewComponent) },
      { path: 'timeline-report', loadComponent: () => import('./components/timeline-report/timeline-report.component').then(m => m.TimelineReportComponent) },
      { path: 'admin', component: AdminComponent },
      // Remove the default redirect to 'item-entry' so /dashboard shows dashboard home
    ]
  },
  { path: '**', redirectTo: 'login' }
];