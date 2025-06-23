//import * as html2pdf from 'html2pdf.js';

import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-reports',
  standalone: true,
   imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  reportTypes = [
    { key: 'expensesByOrder', label: 'مصروفات حسب الأمر' },
    { key: 'remainingStock', label: 'المخزون المتبقي' },
    { key: 'detailedOrderExpense', label: 'تقرير لمصروفات الوحده' },
    { key: 'returnedItems', label: 'تقرير المرتجعات' },
    { key: 'userAssignedAssets', label: 'تقرير الاسقاط' }
  ];
  selectedReport = this.reportTypes[0].key;

  // Filters
  filter = {
    dateFrom: '',
    dateTo: '',
    item: '',
    unit: ''
  };

  // Data arrays (simulate localStorage)
  expenses: any[] = [];
  orders: any[] = [];
  stock: any[] = [];
  openingBalances: any[] = []; // Added
  returns: any[] = [];
  users: any[] = [];
  assignments: any[] = [];
  items: any[] = [];
  units: any[] = [];

  // Filtered data for display
  filteredData: any[] = [];

  reportExpenseType: string = '';
  reportExpenseData: any[] = [];

  showExpenseTypeOptions = false;

  orderTypes = [
    { label: 'تعميد', value: 'Order' },
    { label: 'امر شراء', value: 'Support' },
    { label: 'دعم ', value: 'Other' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadData();
    this.applyFilters();
  }

  loadData() {
    // Load from db.json using HttpClient
    this.http.get<any[]>('http://localhost:3000/expenses').subscribe(data => this.expenses = data);
    this.http.get<any[]>('http://localhost:3000/orders').subscribe(data => {
      // Filter orders by allowed orderType values only
      const allowedTypes = this.orderTypes.map(o => o.value);
      this.orders = data.filter(order => allowedTypes.includes(order.orderType));
    });
    this.http.get<any[]>('http://localhost:3000/returns').subscribe(data => {
      this.returns = data;
      console.log('Loaded returns:', data);
      const disposedReturns = data.filter((r: any) => r.disposed === true);
      console.log('Disposed returns:', disposedReturns);
    });
    this.http.get<any[]>('http://localhost:3000/users').subscribe(data => this.users = data);
    this.http.get<any[]>('http://localhost:3000/assignments').subscribe(data => this.assignments = data);
    this.http.get<any[]>('http://localhost:3000/items').subscribe(data => this.items = data);
    this.http.get<any[]>('http://localhost:3000/units').subscribe(data => this.units = data);
    // Load openingBalances
    this.http.get<any[]>('http://localhost:3000/openingBalances').subscribe({
      next: data => {
        this.openingBalances = data;
        console.log('Loaded openingBalances:', data);
      },
      error: () => {
        this.openingBalances = [];
        console.log('Failed to load openingBalances');
      }
    });
  }

  onReportChange() {
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  applyFilters() {
    // Filtering logic for each report type
    switch (this.selectedReport) {
      case 'expensesByOrder':
        this.filteredData = this.expenses.filter(e =>
          this.filterByDate(e.date) && this.filterByItem(e.item) && this.filterByUnit(e.unit)
        );
        break;
      case 'remainingStock':
        this.filteredData = this.openingBalances;
        console.log('remainingStock selected, filteredData:', this.filteredData);
        break;
      case 'openingBalances':
        this.filteredData = this.openingBalances.filter(ob =>
          this.filterByItem(ob.itemName)
        );
        console.log('openingBalances selected, filteredData:', this.filteredData);
        break;
      case 'detailedOrderExpense':
        // Flatten expenses: each item in an expense becomes a row
        this.filteredData = this.expenses.flatMap(expense =>
          (expense.items || []).map((item: any) => ({
            unitName: expense.unitName,
            receiver: expense.receiver,
            type: expense.type,
            documentNumber: expense.documentNumber,
            itemName: item.itemName,
            quantity: item.quantity
          }))
        );
        break;
      case 'unitExpensesSummary':
        this.filteredData = this.expenses.filter(e =>
          this.filterByDate(e.date) && this.filterByUnit(e.unit)
        );
        break;
      case 'returnedItems':
        this.filteredData = this.returns.map((r: any) => ({
          unitName: r.unitName,
          receiverName: r.receiverName,
          items: r.items,
          quantity: r.quantity,
          disposed: r.disposed,
          disposeReason: r.disposeReason
        }));
        break;
      case 'userAssignedAssets':
        console.log('All returns for userAssignedAssets:', this.returns);
        this.filteredData = this.returns
          .filter((r: any) => r.disposed === true)
          .map((r: any) => ({
            unitName: r.unitName,
            receiverName: r.receiverName,
            items: r.items,
            quantity: r.quantity,
            disposed: r.disposed,
            disposeReason: r.disposeReason
          }));
        console.log('Filtered userAssignedAssets (disposed only):', this.filteredData);
        break;
      default:
        this.filteredData = [];
    }
  }

  filterByDate(date: string) {
    if (!this.filter.dateFrom && !this.filter.dateTo) { return true; }
    const d = new Date(date);
    if (this.filter.dateFrom && d < new Date(this.filter.dateFrom)) { return false; }
    if (this.filter.dateTo && d > new Date(this.filter.dateTo)) { return false; }
    return true;
  }
  filterByItem(item: string) {
    if (!this.filter.item) { return true; }
    return item === this.filter.item;
  }
  filterByUnit(unit: string) {
    if (!this.filter.unit) { return true; }
    return unit === this.filter.unit;
  }

  onExpenseTypeInputClick() {
    this.showExpenseTypeOptions = true;
  }

  selectExpenseType(type: string) {
    // Map report label/value to the correct orderType for filtering
    let filterOrderType = '';
    if (type === 'Support') {
      filterOrderType = 'Support';
    } else if (type === 'Order') {
      filterOrderType = 'Order';
    } else if (type === 'Other') {
      filterOrderType = 'Other';
    }
    this.reportExpenseType = type;
    this.showExpenseTypeOptions = false;
    this.http.get<any[]>('http://localhost:3000/orders').subscribe(orders => {
      console.log('Fetched orders:', orders);
      // Flatten orders: each item in an order becomes a row, only show fields from db.json
      const filtered = orders
        .filter((o: any) => {
          const orderTypeVal = o.orderType ? o.orderType.toString().trim() : '';
          return orderTypeVal === filterOrderType;
        });
      console.log('Filtered orders:', filtered);
      this.reportExpenseData = filtered
        .flatMap((order: any) =>
          (order.items || []).map((item: any) => ({
            orderNumber: order.orderNumber || '',
            itemName: item.itemName || '',
            quantity: item.quantity || '',
            orderType: order.orderType || ''
          }))
        );
      console.log('Report data for table:', this.reportExpenseData);
    });
  }

  exportExpenseTypeReportToPDF() {
    const element = document.getElementById('expense-type-report-table');
    if (!element) { return; }
    window.print(); // Replace with html2pdf if needed
  }

  exportToPDF() {
    // Try to export the main report table as PDF
    const element = document.querySelector('.table-responsive');
    if (!element) { return; }
    window.print(); // For real PDF export, replace with html2pdf or similar
  }

  // Show expense type options only for 'expensesByOrder'
  get showExpenseTypeButtons() {
    return this.selectedReport === 'expensesByOrder';
  }

  // Dynamic columns for each report type
  reportColumns: any = {
    expensesByOrder: [
      { key: 'date', label: 'التاريخ' },
      { key: 'item', label: 'الصنف' },
      { key: 'unit', label: 'الوحدة' },
      { key: 'quantity', label: 'الكمية' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'orderId', label: 'رقم الأمر' }
    ],
    remainingStock: [
      { key: 'stockNumber', label: 'رقم المخزون' },
      { key: 'itemName', label: 'اسم الصنف' },
      { key: 'quantityAvailable', label: 'الكمية المتاحة' },
      { key: 'serialNumbers', label: 'الأرقام التسلسلية' },
      { key: 'linkedToOrder', label: 'مرتبط بأمر' }
    ],
    openingBalances: [
      { key: 'stockNumber', label: 'رقم المخزون' },
      { key: 'itemName', label: 'اسم الصنف' },
      { key: 'quantityAvailable', label: 'الكمية المتاحة' },
      { key: 'serialNumbers', label: 'الأرقام التسلسلية' },
      { key: 'linkedToOrder', label: 'مرتبط بأمر' }
    ],
    detailedOrderExpense: [
      { key: 'unitName', label: 'اسم الوحدة' },
      { key: 'receiver', label: 'المستلم' },
      { key: 'type', label: 'نوع العملية' },
      { key: 'documentNumber', label: 'رقم المستند' },
      { key: 'itemName', label: 'اسم الصنف' },
      { key: 'quantity', label: 'الكمية' }
    ],
    returnedItems: [
      { key: 'unitName', label: 'اسم الوحدة' },
      { key: 'receiverName', label: 'اسم المستلم' },
      { key: 'items', label: 'الصنف' },
      { key: 'quantity', label: 'الكمية' },
      { key: 'disposed', label: 'تم الاسقاط' },
      { key: 'disposeReason', label: 'سبب الاسقاط' }
    ],
    userAssignedAssets: [
      { key: 'unitName', label: 'اسم الوحدة' },
      { key: 'receiverName', label: 'اسم المستلم' },
      { key: 'items', label: 'الصنف' },
      { key: 'quantity', label: 'الكمية' },
      { key: 'disposed', label: 'تم الاسقاط' },
      { key: 'disposeReason', label: 'سبب الاسقاط' }
    ],
    // Add more mappings for other report types as needed
  };

  getCurrentColumns = () => {
    return this.reportColumns[this.selectedReport] || [];
  }
}
