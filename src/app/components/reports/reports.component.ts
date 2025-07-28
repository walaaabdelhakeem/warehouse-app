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
    // { key: 'expensesByOrder', label: 'الإيرادات حسب الأمر' },
    { key: 'remainingStock', label: 'اختر نوع التقرير' },
    { key: 'remainingStock', label: 'المخزون المتبقي' },
    { key: 'detailedOrderExpense', label: 'تقرير لمصروفات الوحده' },
    { key: 'returnedItems', label: 'تقرير الرجيع والاسقاط' },
    { key: 'receiverAssets', label: 'تقرير عن المستلم والعهده الخاصه به' }
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
  unitsWithData: any[] = [];

  filteredData: any[] = [];

  reportExpenseType: string = '';
  reportExpenseData: any[] = [];
  showExpenseTypeOptions = false;

  orderTypes = [
    { label: 'تعميد', value: 'Order' },
    { label: 'امر شراء', value: 'Support' },
    { label: 'دعم ', value: 'Other' }
  ];

  // --- Add for unit expenses report ---
  showUnitExpensesTable = false;
  unitExpensesReportData: any[] = [];

  dispatches: any[] = [];
  turns: any[] = [];
  receiverAssetsSummary: any[] = [];
  receiverAssetsDetails: any[] = [];
  selectedReceiver: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadDataWithDebug();
    this.loadDispatchesAndTurns();
    this.applyFilters();
  }

  loadDataWithDebug() {
    this.http.get<any[]>('http://localhost:3000/expenses').subscribe(data => {
      this.expenses = data;
      this.updateUnitsWithData();
      console.log('[DEBUG] expenses loaded:', this.expenses);
    });
    this.http.get<any[]>('http://localhost:3000/orders').subscribe(data => {
      const allowedTypes = this.orderTypes.map(o => o.value);
      this.orders = data.filter(order => allowedTypes.includes(order.orderType));
      console.log('[DEBUG] orders loaded:', this.orders);
    });
    this.http.get<any[]>('http://localhost:3000/returns').subscribe(data => {
      this.returns = data;
      this.updateUnitsWithData();
      console.log('[DEBUG] returns loaded:', this.returns);
    });
    this.http.get<any[]>('http://localhost:3000/users').subscribe(data => {
      this.users = data;
      console.log('[DEBUG] users loaded:', this.users);
    });
    this.http.get<any[]>('http://localhost:3000/assignments').subscribe(data => {
      this.assignments = data;
      console.log('[DEBUG] assignments loaded:', this.assignments);
    });
    this.http.get<any[]>('http://localhost:3000/items').subscribe(data => {
      this.items = data;
      console.log('[DEBUG] items loaded:', this.items);
    });
    this.http.get<any[]>('http://localhost:3000/units').subscribe(data => {
      // Only keep units that exist in db.json (i.e., have data in expenses or returns)
      this.units = data;
      this.updateUnitsWithData();
      console.log('[DEBUG] units loaded:', this.units);
    });
    this.http.get<any[]>('http://localhost:3000/openingBalances').subscribe({
      next: data => {
        this.openingBalances = data;
        console.log('[DEBUG] openingBalances loaded:', this.openingBalances);
      },
      error: () => {
        this.openingBalances = [];
        console.log('[DEBUG] openingBalances failed to load');
      }
    });
  }

  loadDispatchesAndTurns() {
    this.http.get<any[]>('http://localhost:3000/dispatches').subscribe(data => {
      this.dispatches = data;
      console.log('[DEBUG] dispatches loaded:', this.dispatches);
    });
    this.http.get<any[]>('http://localhost:3000/turns').subscribe(data => {
      this.turns = data;
      console.log('[DEBUG] turns loaded:', this.turns);
    });
  }

  updateUnitsWithData() {
    if (!this.units || (!this.expenses && !this.returns)) {
      this.unitsWithData = [];
      return;
    }
    // Only include units that have data in expenses or returns
    const expenseUnits = (this.expenses || []).map(e => e.unitName).filter(Boolean);
    const returnUnits = (this.returns || []).map(r => r.unitName).filter(Boolean);
    const allUnitNames = Array.from(new Set([...expenseUnits, ...returnUnits]));
    this.unitsWithData = this.units.filter(u => allUnitNames.includes(u.unitName));
  }

  onReportChange() {
    this.applyFilters();
    if (this.selectedReport === 'detailedOrderExpense') {
      setTimeout(() => {
        console.log('--- تقرير مصروفات الوحده (on click) ---');
        console.log('expenses:', this.expenses);
        console.log('returns:', this.returns);
        console.log('units:', this.units);
        console.log('filter:', this.filter);
        this.generateUnitExpensesReport();
        console.log('unitExpensesReportData:', this.unitExpensesReportData);
        this.showUnitExpensesTable = true;
      }, 500);
    } else if (this.selectedReport === 'receiverAssets') {
      this.selectedReceiver = '';
      this.receiverAssetsSummary = [];
      this.receiverAssetsDetails = [];
    } else {
      this.showUnitExpensesTable = false;
    }
  }

  onFilterChange() {
    this.applyFilters();
  }

  // Only show summary and details tables for detailedOrderExpense, so filteredData should be set for this report only
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
        // Filter details table by selected unit if any
        this.filteredData = this.expenses
          .filter(expense => !this.filter.unit || expense.unitName === this.filter.unit)
          .flatMap(expense =>
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
      case 'receiverAssets':
        // Group by receiver, aggregate all items for each receiver
        const receiverMap: { [receiver: string]: string[] } = {};
        this.expenses.forEach(exp => {
          if (exp.receiver) {
            if (!receiverMap[exp.receiver]) receiverMap[exp.receiver] = [];
            (exp.items || []).forEach((item: any) => {
              receiverMap[exp.receiver].push(item.itemName);
            });
          }
        });
        this.filteredData = Object.keys(receiverMap).map(receiver => ({
          receiver,
          assets: Array.from(new Set(receiverMap[receiver])).join(', ')
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
            <th> الكميه</th>
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

    let contentHTML = headerHTML;

    if (this.selectedReport === 'receiverAssets') {
      // Summary Table
      const summaryRows = this.receiverAssetsSummary.map(row => `
        <tr>
          <td>${row.itemName}</td>
          <td>${row.received}</td>
          <td>${row.returned}</td>
          <td>${row.remaining}</td>
        </tr>
      `).join('');
      const summaryTable = `
        <table border="1" cellspacing="0" cellpadding="4" style="width:100%; border-collapse:collapse; text-align:center; margin-bottom:24px;">
          <thead style="background:#f8f9fa;">
            <tr><th colspan="4" style="font-size: 1.3rem; color: #222;">الخلاصه</th></tr>
            <tr>
              <th>الصنف / المادة</th>
              <th>الكمية المستلمه</th>
              <th>الارجاع</th>
              <th>المتبقي</th>
            </tr>
          </thead>
          <tbody>${summaryRows}</tbody>
        </table>
      `;
      // Details Table
      const detailsRows = this.receiverAssetsDetails.map(row => `
        <tr>
          <td>${row.itemName}</td>
          <td>${row.quantity}</td>
          <td>${row.receiptNumber}</td>
        </tr>
      `).join('');
      const detailsTable = `
        <table border="1" cellspacing="0" cellpadding="4" style="width:100%; border-collapse:collapse; text-align:center;">
          <thead style="background:#f8f9fa;">
            <tr><th colspan="3" style="font-size: 1.1rem; color: #222;">تفاصيل المصروفات</th></tr>
            <tr>
              <th>الصنف / المادة</th>
              <th>الكمية</th>
              <th>رقم السند</th>
            </tr>
          </thead>
          <tbody>${detailsRows}</tbody>
        </table>
      `;
      contentHTML += summaryTable + detailsTable;
      element.innerHTML = contentHTML;
    } else if (this.selectedReport === 'detailedOrderExpense') {
      // Summary Table
      const summaryRows = this.unitExpensesReportData.map(row => `
        <tr>
          <td>${row.itemName}</td>
          <td>${row.receivedQuantity}</td>
          <td>${row.returnedQuantity}</td>
          <td>${row.actualQuantity}</td>
        </tr>
      `).join('');
      const summaryTable = `
        <table border="1" cellspacing="0" cellpadding="4" style="width:100%; border-collapse:collapse; text-align:center; margin-bottom:24px;">
          <thead style="background:#f8f9fa;">
            <tr><th colspan="4" style="font-size: 1.3rem; color: #222;">الخلاصه</th></tr>
            <tr>
              <th>اسم الصنف</th>
              <th>الكميه المستلمه</th>
              <th>الكميه المرتجعه</th>
              <th>الفعلي</th>
            </tr>
          </thead>
          <tbody>${summaryRows}</tbody>
        </table>
      `;
      // Details Table
      const detailsRows = this.filteredData.map(row => `
        <tr>
          <td>${row.unitName}</td>
          <td>${row.receiver}</td>
          <td>${row.type}</td>
          <td>${row.documentNumber}</td>
          <td>${row.itemName}</td>
          <td>${row.quantity}</td>
        </tr>
      `).join('');
      const detailsTable = `
        <table border="1" cellspacing="0" cellpadding="4" style="width:100%; border-collapse:collapse; text-align:center;">
          <thead style="background:#f8f9fa;">
            <tr><th colspan="6" style="font-size: 1.1rem; color: #222;">تفاصيل المصروفات للوحده</th></tr>
            <tr>
              <th>اسم الوحدة</th>
              <th>المستلم</th>
              <th>نوع العملية</th>
              <th>رقم المستند</th>
              <th>اسم الصنف</th>
              <th>الكميه المستلمه</th>
            </tr>
          </thead>
          <tbody>${detailsRows}</tbody>
        </table>
      `;
      contentHTML += summaryTable + detailsTable;
      element.innerHTML = contentHTML;
    } else {
      // Default: export the first table in the report
      const originalTable = document.querySelector('.table-responsive table')?.cloneNode(true) as HTMLElement;
      if (originalTable) {
        originalTable.style.width = '100%';
        originalTable.style.borderCollapse = 'collapse';
        originalTable.style.border = '2px solid #000';
        const ths = originalTable.querySelectorAll('th');
        ths.forEach(th => {
          th.style.border = '1px solid #000';
          th.style.padding = '6px';
          th.style.backgroundColor = '#f1f1f1';
        });
        const tds = originalTable.querySelectorAll('td');
        tds.forEach(td => {
          td.style.border = '1px solid #000';
          td.style.padding = '6px';
        });
        element.innerHTML = headerHTML;
        element.appendChild(originalTable);
      }
    }

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
  }

  // Example logic for generating unit expenses report
  // This will be used for 'تقرير لمصروفات الوحده' (detailedOrderExpense)
  generateUnitExpensesReport() {
    // If no unit filter, include all units
    const unitName = this.filter.unit ? this.filter.unit : null;
    const receivedMap: { [itemName: string]: number } = {};
    this.expenses.forEach(exp => {
      if (!unitName || exp.unitName === unitName) {
        (exp.items || []).forEach((item: any) => {
          if (!receivedMap[item.itemName]) receivedMap[item.itemName] = 0;
          receivedMap[item.itemName] += Number(item.quantity) || 0;
        });
      }
    });
    console.log('[DEBUG] receivedMap:', receivedMap);
    const returnedMap: { [itemName: string]: number } = {};
    this.returns.forEach(ret => {
      if (!unitName || ret.unitName === unitName) {
        if (Array.isArray(ret.items)) {
          ret.items.forEach((item: any) => {
            if (!returnedMap[item.itemName]) returnedMap[item.itemName] = 0;
            returnedMap[item.itemName] += Number(item.quantity) || 0;
          });
        } else if (typeof ret.items === 'string' && ret.items) {
          // If items is a string, treat as single item
          const itemName = ret.items;
          if (!returnedMap[itemName]) returnedMap[itemName] = 0;
          returnedMap[itemName] += Number(ret.quantity) || 0;
        }
      }
    });
    console.log('[DEBUG] returnedMap:', returnedMap);
    this.unitExpensesReportData = Object.keys(receivedMap).map(itemName => {
      const receivedQuantity = receivedMap[itemName] || 0;
      const returnedQuantity = returnedMap[itemName] || 0;
      return {
        itemName,
        receivedQuantity,
        returnedQuantity,
        actualQuantity: receivedQuantity - returnedQuantity
      };
    });
    this.showUnitExpensesTable = this.unitExpensesReportData.length > 0;
  }

  onReceiverChange(receiver: string) {
    this.selectedReceiver = receiver;
    this.generateReceiverAssetsReport();
  }

  generateReceiverAssetsReport() {
    if (!this.selectedReceiver) {
      this.receiverAssetsSummary = [];
      this.receiverAssetsDetails = [];
      return;
    }
    // Group dispatches and turns by itemName for the selected receiver
    const receivedMap: { [itemName: string]: number } = {};
    const returnedMap: { [itemName: string]: number } = {};
    // Dispatches: received
    (this.dispatches || []).forEach(d => {
      if (d.receiverName === this.selectedReceiver) {
        if (!receivedMap[d.itemName]) receivedMap[d.itemName] = 0;
        receivedMap[d.itemName] += Number(d.quantity) || 0;
      }
    });
    // Turns: returned/disposed
    (this.turns || []).forEach(t => {
      if (t.receiverName === this.selectedReceiver) {
        if (!returnedMap[t.items]) returnedMap[t.items] = 0;
        returnedMap[t.items] += Number(t.quantity) || 0;
      }
    });
    // Summary Table
    this.receiverAssetsSummary = Object.keys(receivedMap).map(itemName => {
      const received = receivedMap[itemName] || 0;
      const returned = returnedMap[itemName] || 0;
      return {
        itemName,
        received,
        returned,
        remaining: received - returned
      };
    });
    // Details Table
    this.receiverAssetsDetails = (this.dispatches || [])
      .filter(d => d.receiverName === this.selectedReceiver)
      .map(d => ({
        itemName: d.itemName,
        quantity: d.quantity,
        receiptNumber: d.receiptNumber
      }));
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
      { key: 'stockNumber', label: 'رقم الماده ' },
      { key: 'itemName', label: 'اسم الصنف' },
      { key: 'quantityAvailable', label: 'الكمية المتاحة' },
      { key: 'serialNumbers', label: 'الأرقام التسلسلية' },
      { key: 'linkedToOrder', label: 'مرتبط بأمر' }
    ],
    openingBalances: [
      { key: 'stockNumber', label: 'رقم الماده ' },
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
      { key: 'quantity', label: 'الكميه المستلمه' }
    ],
    returnedItems: [
      { key: 'unitName', label: 'اسم الوحدة' },
      { key: 'receiverName', label: 'اسم المستلم' },
      { key: 'items', label: 'الصنف' },
      { key: 'quantity', label: 'الكمية' },
      { key: 'disposed', label: 'تم الاسقاط' },
      { key: 'disposeReason', label: 'سبب الاسقاط' }
    ],
    // receiverAssets: [
    //   { key: 'receiver', label: 'اسم المستلم' },
    //   { key: 'assets', label: 'العهدة الخاصة به' }
    // ]
  };

  getCurrentColumns = () => {
    return this.reportColumns[this.selectedReport] || [];
  };

  onUnitChange() {
    this.generateUnitExpensesReport();
    this.applyFilters();
  }

  getUniqueReceiversFromDispatches(): string[] {
    // Get unique receiver names from dispatches
    const names = (this.dispatches || []).map(d => d.receiverName).filter(Boolean);
    return Array.from(new Set(names));
  }
}