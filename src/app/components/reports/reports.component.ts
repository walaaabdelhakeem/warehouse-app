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
    { key: 'returnedItems', label: 'تقرير الرجيع والاسقاط' }
  ];
  selectedReport = this.reportTypes[0].key;

  filter = {
    dateFrom: '',
    dateTo: '',
    item: '',
    unit: ''
  };

  expenses: any[] = [];
  orders: any[] = [];
  stock: any[] = [];
  openingBalances: any[] = [];
  returns: any[] = [];
  users: any[] = [];
  assignments: any[] = [];
  items: any[] = [];
  units: any[] = [];

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
    this.http.get<any[]>('http://localhost:3000/expenses').subscribe(data => this.expenses = data);
    this.http.get<any[]>('http://localhost:3000/orders').subscribe(data => {
      const allowedTypes = this.orderTypes.map(o => o.value);
      this.orders = data.filter(order => allowedTypes.includes(order.orderType));
    });
    this.http.get<any[]>('http://localhost:3000/returns').subscribe(data => this.returns = data);
    this.http.get<any[]>('http://localhost:3000/users').subscribe(data => this.users = data);
    this.http.get<any[]>('http://localhost:3000/assignments').subscribe(data => this.assignments = data);
    this.http.get<any[]>('http://localhost:3000/items').subscribe(data => this.items = data);
    this.http.get<any[]>('http://localhost:3000/units').subscribe(data => this.units = data);
    this.http.get<any[]>('http://localhost:3000/openingBalances').subscribe({
      next: data => this.openingBalances = data,
      error: () => this.openingBalances = []
    });
  }

  onReportChange() {
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  applyFilters() {
    switch (this.selectedReport) {
      case 'expensesByOrder':
        this.filteredData = this.expenses.filter(e =>
          this.filterByDate(e.date) && this.filterByItem(e.item) && this.filterByUnit(e.unit)
        );
        break;
      case 'remainingStock':
      case 'openingBalances':
        this.filteredData = this.openingBalances.filter(ob =>
          this.filterByItem(ob.itemName)
        );
        break;
      case 'detailedOrderExpense':
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
      default:
        this.filteredData = [];
    }
  }

  filterByDate(date: string) {
    if (!this.filter.dateFrom && !this.filter.dateTo) return true;
    const d = new Date(date);
    if (this.filter.dateFrom && d < new Date(this.filter.dateFrom)) return false;
    if (this.filter.dateTo && d > new Date(this.filter.dateTo)) return false;
    return true;
  }

  filterByItem(item: string) {
    if (!this.filter.item) return true;
    return item === this.filter.item;
  }

  filterByUnit(unit: string) {
    if (!this.filter.unit) return true;
    return unit === this.filter.unit;
  }

  onExpenseTypeInputClick() {
    this.showExpenseTypeOptions = true;
  }

  selectExpenseType(type: string) {
    this.reportExpenseType = type;
    this.showExpenseTypeOptions = false;
    this.http.get<any[]>('http://localhost:3000/orders').subscribe(orders => {
      const filtered = orders.filter(o => (o.orderType || '').toString().trim() === type);
      this.reportExpenseData = filtered.flatMap(order =>
        (order.items || []).map((item: any) => ({
          orderNumber: order.orderNumber || '',
          itemName: item.itemName || '',
          quantity: item.quantity || '',
          orderType: order.orderType || ''
        }))
      );
    });
  }

exportExpenseTypeReportToPDF() {
  const now = new Date();
  const dateTime = now.toLocaleString('ar-EG');

  const title =
    this.reportExpenseType === 'Support' ? 'تقرير المصروفات حسب أوامر الشراء' :
    this.reportExpenseType === 'Order' ? 'تقرير المصروفات حسب التعاميد' :
    this.reportExpenseType === 'Other' ? 'تقرير المصروفات حسب الدعم' : 'تقرير المصروفات';

  const printable = document.createElement('div');
  printable.style.direction = 'rtl';
  printable.style.fontFamily = 'Arial';
  printable.style.padding = '20px';
  printable.style.fontSize = '12px';

  // رأس الصفحة
  const headerHTML = `
    <div style="text-align:center; margin-bottom:16px;">
      <h2 style="margin:0;">${title}</h2>
      <div style="font-size:13px;">${dateTime}</div>
    </div>
  `;

  // بناء الجدول من البيانات
  const tableRows = this.reportExpenseData.map(e => `
    <tr>
      <td>${e.orderType === 'Support' ? 'أمر شراء' : e.orderType === 'Order' ? 'تعميد' : 'دعم'}</td>
      <td>${e.orderNumber || ''}</td>
      <td>${e.itemName || ''}</td>
      <td>${e.quantity || ''}</td>
    </tr>
  `).join('');

  const tableHTML = `
    <table border="1" cellspacing="0" cellpadding="4" style="width:100%; border-collapse:collapse; text-align:center;">
      <thead style="background:#f1f1f1;">
        <tr>
          <th>نوع الأمر</th>
          <th>رقم الأمر</th>
          <th>العنصر</th>
          <th>الكمية</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  // تركيب المحتوى النهائي
  printable.innerHTML = headerHTML + tableHTML;

  // إعداد التصدير
  const html2pdf = (window as any).html2pdf;
  if (html2pdf) {
    html2pdf()
      .from(printable)
      .set({
        margin: [10, 10, 10, 10],
        filename: `${title}.pdf`,
        html2canvas: {
          scale: 2
        },
        jsPDF: {
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        }
      })
      .save();
  } else {
    alert("html2pdf غير متوفر");
  }
}



async exportToPDF() {
  const element = document.createElement('div');
  element.style.direction = 'rtl';
  element.style.fontFamily = 'Arial';
  element.style.padding = '20px';
  element.style.fontSize = '12px';

  const now = new Date();
  const dateTime = now.toLocaleString('ar-EG');
  const title = this.reportTypes.find(r => r.key === this.selectedReport)?.label || '';

  const headerHTML = `
    <div style="text-align:center; margin-bottom:16px;">
      <h2 style="margin:0;">${title}</h2>
      <div style="font-size:13px;">${dateTime}</div>
    </div>
  `;

  const originalTable = document.querySelector('.table-responsive table')?.cloneNode(true) as HTMLElement;

  if (originalTable) {
    // تنسيقات الجدول العامة
    originalTable.style.width = '100%';
    originalTable.style.borderCollapse = 'collapse';
    originalTable.style.border = '2px solid #000';

    // تنسيق رؤوس الأعمدة
    const ths = originalTable.querySelectorAll('th');
    ths.forEach(th => {
      th.style.border = '1px solid #000';
      th.style.padding = '6px';
      th.style.backgroundColor = '#f1f1f1';
    });

    // تنسيق خلايا البيانات
    const tds = originalTable.querySelectorAll('td');
    tds.forEach(td => {
      td.style.border = '1px solid #000';
      td.style.padding = '6px';
    });

    // تجميع الصفحة
    element.innerHTML = headerHTML;
    element.appendChild(originalTable);

    // تحميل html2pdf بشكل ديناميكي
    const html2pdf = (await import('html2pdf.js')).default;

    html2pdf()
      .from(element)
      .set({
        margin: [10, 10, 10, 10],
        filename: `${title}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: {
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        }
      })
      .save();
  } else {
    alert("لم يتم العثور على جدول للطباعة");
  }
}




  get showExpenseTypeButtons() {
    return this.selectedReport === 'expensesByOrder';
  }

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
    ]
  };

  getCurrentColumns = () => {
    return this.reportColumns[this.selectedReport] || [];
  };
}
