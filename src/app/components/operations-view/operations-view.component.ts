import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-operations-view',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  templateUrl: './operations-view.component.html',
  styleUrls: ['./operations-view.component.css']
})
export class OperationsViewComponent implements OnInit {
  operationTypes = [
    { key: 'revenues', label: 'ايرادات' },
    { key: 'expenses', label: 'مصروفات' },
    { key: 'transfer', label: ' مناقلة العهد' },
    { key: 'returns', label: 'رجيع' },
    { key: 'disposals', label: 'اسقاط' },
  ];
  selectedType = 'expenses';
  expenses: any[] = [];
  transfer: any[] = [];
  units: any[] = [];
  returns: any[] = [];
  orders: any[] = [];
  selectedUnit = '';
  selectedOrderType = '';
  loading = false;

  orderTypes = [
    { label: 'تعميد', value: 'Order' },
    { label: 'امر شراء', value: 'Support' },
    { label: 'دعم', value: 'Other' }
  ];

  constructor(private http: HttpClient) { }

  ngOnInit() {
   // ترتيب الأحدث -> الأقدم
const sortByDateDesc = (a: any, b: any) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

this.http.get<any[]>('http://localhost:3000/expenses').subscribe(data => {
  this.expenses = data.sort(sortByDateDesc);
});

this.http.get<any[]>('http://localhost:3000/units').subscribe(data => {
  this.units = data.sort(sortByDateDesc);
});

this.http.get<any[]>('http://localhost:3000/returns').subscribe(data => {
  this.returns = data.sort(sortByDateDesc);
});

this.http.get<any[]>('http://localhost:3000/transfers').subscribe(data => {
  this.transfer = data.sort(sortByDateDesc);
});

// allowedTypes نفس منطق الفلترة مع الترتيب
const allowedTypes = this.orderTypes.map(o => o.value);
this.http.get<any[]>('http://localhost:3000/orders').subscribe(data => {
  this.orders = data
    .filter(order => allowedTypes.includes(order.orderType))
    .sort(sortByDateDesc);
});

  }

  get filteredExpenses() {
    return this.expenses.filter(e => !this.selectedUnit || e.unitName === this.selectedUnit);
  }
  get filteredtransfer() {
    return this.transfer.filter(e => !this.selectedUnit || e.unitName === this.selectedUnit);
  }

  get filteredReturns() {
    return this.returns.filter(r => !this.selectedUnit || r.unitName === this.selectedUnit);
  }

  get filteredOrders() {
    // Use the same logic as reports: filter orders by allowed types only
    const allowedTypes = this.orderTypes.map(o => o.value);
    console.log('[DEBUG] selectedOrderType:', this.selectedOrderType);
    const filtered = this.orders
      .filter(order => allowedTypes.includes(order.orderType))
      .map(order => ({
        ...order,
        orderTypeLabel: this.orderTypes.find(t => t.value === order.orderType)?.label || order.orderType
      }))
      .filter(order => !this.selectedOrderType || order.orderType === this.selectedOrderType);
    console.log('[DEBUG] filteredOrders:', filtered.map(o => ({ orderType: o.orderType, orderTypeLabel: o.orderTypeLabel, orderNumber: o.orderNumber })));
    return filtered;
  }

  get filteredDisposals() {
    // Show only returns that are disposed (اسقاط)
    return this.returns.filter(r => r.disposed && (!this.selectedUnit || r.unitName === this.selectedUnit));
  }
}
