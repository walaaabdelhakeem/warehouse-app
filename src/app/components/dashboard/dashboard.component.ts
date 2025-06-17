import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements AfterViewInit, OnInit {
  features = [
    { label: 'إدخال صنف', link: 'item-entry', icon: 'bi bi-plus-square' },
    { label: 'تعاميد الشراء', link: 'purchase-orders', icon: 'bi bi-cart-plus' },
    { label: 'الوحدات', link: 'units', icon: 'bi bi-diagram-3' },
    { label: 'الأرصدة الافتتاحية', link: 'opening-balances', icon: 'bi bi-archive' },
    { label: 'إذن الصرف', link: 'issue-permit', icon: 'bi bi-journal-check' },
    { label: 'الصرف من المستودع', link: 'dispatch', icon: 'bi bi-truck' },
    { label: 'مصروفات الوحدة', link: 'add-expense', icon: 'bi bi-cash-stack' },
    { label: 'استلام الرجيع', link: 'returns', icon: 'bi bi-arrow-counterclockwise' },
    { label: 'مناقلة العهد', link: 'transfer', icon: 'bi bi-arrow-left-right' },
    { label: 'إسقاط العهد', link: 'disposal', icon: 'bi bi-x-octagon' },
    { label: 'التقارير', link: 'reports', icon: 'bi bi-bar-chart' },
    { label: 'بحث عن مستلم', link: 'user-search', icon: 'bi bi-search' },
    { label: 'مدير النظام', link: 'admin', icon: 'bi bi-person-gear' }
  ];

  stats = [
    { label: 'إجمالي الأصناف', value: 0, icon: 'bi bi-box-seam', color: 'text-primary' },
    { label: 'إجمالي الوحدات', value: 0, icon: 'bi bi-123', color: 'text-success' },
    { label: 'مصروفات الشهر', value: 0, icon: 'bi bi-cash-coin', color: 'text-warning' },
    { label: 'إجمالي الرجيع', value: 0, icon: 'bi bi-arrow-counterclockwise', color: 'text-danger' }
  ];

  currentChild: string | null = null;

  constructor(private router: Router, private route: ActivatedRoute, private http: HttpClient) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const child = this.route.firstChild;
      this.currentChild = child && child.snapshot.url.length > 0 ? child.snapshot.url[0].path : null;
    });
  }

  ngAfterViewInit() {
    this.loadDashboardData();
  }

  ngOnInit() {
    setInterval(() => this.loadDashboardData(), 2000);
  }

  loadDashboardData() {
    this.http.get<any[]>('http://localhost:3000/items').subscribe(items => {
      this.stats[0].value = items.length;
      this.items = items;
      this.updateItemsChart();
    });
    this.http.get<any[]>('http://localhost:3000/units').subscribe(units => {
      this.stats[1].value = units.length;
      this.units = units;
    });
    this.http.get<any[]>('http://localhost:3000/expenses').subscribe(expenses => {
      this.stats[2].value = expenses.reduce((sum, e) => sum + e.amount, 0);
      this.expenses = expenses;
      this.updateExpensesChart();
    });
    this.http.get<any[]>('http://localhost:3000/returns').subscribe(returns => {
      this.stats[3].value = returns.reduce((sum, r) => sum + r.quantity, 0);
      this.returns = returns;
    });
  }

  items: any[] = [];
  units: any[] = [];
  expenses: any[] = [];
  returns: any[] = [];

  updateItemsChart() {
    setTimeout(() => {
      const w = window as any;
      if (w.Chart) {
        const canvas = document.getElementById('itemsChart') as HTMLCanvasElement | null;
        const ctx1 = canvas ? canvas.getContext('2d') : null;
        if (ctx1) {
          new w.Chart(ctx1, {
            type: 'bar',
            data: {
              labels: this.items.map(i => i.itemName),
              datasets: [{
                label: 'عدد الأصناف',
                data: this.items.map(i => parseInt(i.stockNumber)),
                backgroundColor: '#4f8cff'
              }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
          });
        }
      }
    }, 0);
  }

  updateExpensesChart() {
    setTimeout(() => {
      const w = window as any;
      if (w.Chart) {
        const canvas = document.getElementById('expensesChart') as HTMLCanvasElement | null;
        const ctx2 = canvas ? canvas.getContext('2d') : null;
        if (ctx2) {
          new w.Chart(ctx2, {
            type: 'pie',
            data: {
              labels: this.expenses.map(e => e.unitName),
              datasets: [{
                label: 'مصروفات',
                data: this.expenses.map(e => e.amount),
                backgroundColor: ['#3358e6', '#4f8cff', '#ffc107']
              }]
            },
            options: { responsive: true }
          });
        }
      }
    }, 0);
  }

  isChildRouteActive(): boolean {
    return !!this.currentChild;
  }
}
