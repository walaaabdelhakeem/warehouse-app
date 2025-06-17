import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ItemEntryComponent } from './components/item-entry/item-entry.component';
import { PurchaseOrdersComponent } from './components/purchase-orders/purchase-orders.component';
import { UnitsComponent } from './components/units/units.component';
import { OpeningBalancesComponent } from './components/opening-balances/opening-balances.component';
import { IssuePermitComponent } from './components/issue-permit/issue-permit.component';
import { DispatchComponent } from './components/dispatch/dispatch.component';
import { AddExpenseComponent } from './components/add-expense/add-expense.component';
import { ReturnsComponent } from './components/returns/returns.component';
import { TransferComponent } from './components/transfer/transfer.component';
import { DisposalComponent } from './components/disposal/disposal.component';
import { ReportsComponent } from './components/reports/reports.component';
import { UserSearchComponent } from './components/user-search/user-search.component';
import { AdminComponent } from './components/admin/admin.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard],
    children: [
      { path: 'item-entry', component: ItemEntryComponent },
      { path: 'purchase-orders', component: PurchaseOrdersComponent },
      { path: 'units', component: UnitsComponent },
      { path: 'opening-balances', component: OpeningBalancesComponent },
      { path: 'issue-permit', component: IssuePermitComponent },
      { path: 'dispatch', component: DispatchComponent },
      { path: 'add-expense', component: AddExpenseComponent },
      { path: 'returns', component: ReturnsComponent },
      { path: 'transfer', component: TransferComponent },
      { path: 'disposal', component: DisposalComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'user-search', component: UserSearchComponent },
      { path: 'admin', component: AdminComponent },
      // Remove the default redirect to 'item-entry' so /dashboard shows dashboard home
    ]
  },
  { path: '**', redirectTo: 'login' }
];