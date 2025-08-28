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
    { key: 'expensesByOrder', label: 'الإيرادات حسب الأمر' },
    { key: 'remainingStock1', label: 'اختر نوع التقرير' },
    { key: 'remainingStock', label: 'الارصده المستودعية المتاحة للصرف ' },
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
 searchMethod: 'byUnit' | 'byReceiver' = 'byUnit';
  selectedUnit: string = '';
  selectedReceiver: string = '';
  reportExpenseType: string = '';
  reportExpenseData: any[] = [];
  showExpenseTypeOptions = false;
 
  availableReceivers: string[] = [];
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

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadDataWithDebug();
    this.loadDispatchesAndTurns();
    this.applyFilters();
  }
 loadReceiversForUnit() {
    this.selectedReceiver = '';
    this.receiverAssetsSummary = [];
    this.receiverAssetsDetails = [];
  }

  // دالة للحصول على الوحدات التي لديها مستلمين
  getUnitsWithReceivers(): any[] {
    return this.units.filter(unit => {
      const unitExpenses = this.expenses.filter(e => e.unitName === unit.unitName);
      return unitExpenses.some(e => e.receiver);
    });
  }

  getReceiversForSelectedUnit(): string[] {
    if (!this.selectedUnit) return [];
    return Array.from(new Set(
      this.expenses
        .filter(e => e.unitName === this.selectedUnit && e.receiver)
        .map(e => e.receiver)
    ));
  }
  loadDataWithDebug() {
    this.http.get<any[]>('http://localhost:3000/expenses').subscribe(data => {
      this.expenses =  data.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // الأحدث للأقدم
      });
;
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
              quantity: item.quantity,
        date: expense.date ? new Date(expense.date).toLocaleDateString('ar-EG') : 'غير محدد'
            }))
          );
        break;
      case 'returnedItems':
  this.filteredData = this.returns.map((r: any) => ({
    unitName: r.unitName || '-',
    receiverName: r.receiverName || '-',
    items: r.items || '-',
    quantity: r.quantity ? String(r.quantity) : '0',
    disposedqantity:String( r.quantity - (r.disposed_quantity || 0)),
    dispose: r.disposed_quantity ? String(r.disposed_quantity) : '0'
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
    const dateTime = now.toLocaleDateString('ar-EG');

    const title =
      this.reportExpenseType === 'Support' ? 'تقرير المصروفات حسب أوامر الشراء' :
      this.reportExpenseType === 'Order' ? 'تقرير المصروفات حسب التعاميد' :
      this.reportExpenseType === 'Other' ? 'تقرير المصروفات حسب الدعم' : 'تقرير المصروفات';

    const printable = document.createElement('div');
    printable.style.direction = 'rtl';
    printable.style.fontFamily = 'Arial';
    printable.style.padding = '10px';
    printable.style.fontSize = '12px';

    // رأس الصفحة
    const headerHTML = `
      <div style="text-align:center; margin-bottom:16px;">
              <div style="font-size:14px;text-align:left;font-weight:600"> ${dateTime}</div>

        <h2 style="margin:10px 0; text-align:center; font-size:22px;font-weight:600">تقرير ${title}</h2>
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
      <table border="1" cellspacing="0" cellpadding="4" class="table-container" style="width:100%; border-collapse:collapse; text-align:center;">
           <thead>
          <tr style="background-color:#D3D3D3 ; color:white; font-size:16px;">
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

getUnitForReceiver(receiverName: string): string {
  if (!receiverName) return '';
  
  // البحث في مصفوفة المستلمين (users)
  const user = this.users.find(u => u.name === receiverName);
  if (user && user.unit) return user.unit;
  
  // البحث في مصفوفة المصروفات (expenses)
  const expense = this.expenses.find(e => e.receiver === receiverName);
  if (expense && expense.unitName) return expense.unitName;
  
  return '';
}

  async exportToPDF() {
    const element = document.createElement('div');
    element.style.direction = 'rtl';
    element.style.fontFamily = 'Arial';
    element.style.padding = '5px';
    element.style.fontSize = '16px';
    element.style.marginInline = 'auto';

    const now = new Date();
    const dateTime = now.toLocaleDateString('ar-EG');
    const title = this.reportTypes.find(r => r.key === this.selectedReport)?.label || '';

   const headerHTML = `
  <div style="text-align:center; margin-bottom:16px;">
    <div style="font-size:13px;text-align:left;font-weight:600">تاريخ طباعة التقرير ${dateTime}</div>
    <h2 style="margin:10px 0; text-align:center; font-size:22px; font-weight:600">${title}</h2>
  </div>
  <div style="margin-bottom:15px;">
    ${this.selectedReport === 'receiverAssets' ? `
      <h5>أسم المستلم: ${this.selectedReceiver || ''}</h5>
    ` : ''}
    ${this.filter.unit || this.getUnitForReceiver(this.selectedReceiver)?`
    <h5>الوحدة: ${this.filter.unit || this.getUnitForReceiver(this.selectedReceiver) || ''}</h5>`:''}
  </div>
`;
    let contentHTML = headerHTML;

    if (this.selectedReport === 'receiverAssets') {
      // Summary Table
      const summaryRows = this.receiverAssetsSummary.map(row => `
  <tr>
    <td style="padding:3px; border:1px solid #000;">${row.itemName}</td>
    <td style="padding:3px; border:1px solid #000;">${row.received}</td>
    <td style="padding:3px; border:1px solid #000;">${row.returned}</td>
    <td style="padding:3px; border:1px solid #000;">${row.remaining}</td>
  </tr>
`).join('');
      
      const summaryTable = `
        <table border="1" cellspacing="0" cellpadding="4" class="table-container" style="width:100%; border-collapse:collapse; text-align:center; margin-bottom:24px;">
                  <thead>
            <tr><th colspan="4" style="font-size: 1.3rem; background-color: #D3D3D3 ;border:1px solid #000;">الخلاصه</th></tr>
            <tr style="background-color: #D3D3D3 ; font-size: 1.3rem;border:1px solid #000; font-weight:600" >
                    <th style="padding:3px; border:1px solid #000;">  المادة/الصنف</th>
                    <th style="padding:3px; border:1px solid #000;">الكمية المستلمة</th>
                    <th style="padding:3px; border:1px solid #000;">الارجاع</th>
                    <th style="padding:3px; border:1px solid #000;">المتبقي</th>
            </tr>
          </thead>
          <tbody>

          ${summaryRows}</tbody>
        </table>
      `;
      // Details Table
      const detailsRows = this.receiverAssetsDetails.map(row => `
        <tr>
            <td style="padding:3px; border:1px solid #000;">${row.itemName}</td>
        <td style="padding:3px; border:1px solid #000;">${row.quantity}</td>
        <td style="padding:3px; border:1px solid #000;">${row.receiptNumber}</td>
<td style="padding:3px; border:1px solid #000;">${row.date}</td>        </tr>
      `).join('');
      const detailsTable = `
        <table border="1" cellspacing="0" cellpadding="4" class="table-container" style="width:100%; border-collapse:collapse; text-align:center;">
          <thead>
            <tr><th colspan="4" style="font-size: 1.3rem; background-color: #D3D3D3 ;border:1px solid #000;">تفاصيل المصروفات</th></tr>
            <tr style="background-color:#D3D3D3; color:#000000; font-size:18px; font-weight:bolder;">
                    <th style="padding:3px; border:1px solid #000;">الصنف / المادة</th>
                    <th style="padding:3px; border:1px solid #000;">الكمية</th>
                    <th style="padding:3px; border:1px solid #000;">رقم السند</th>
                    <th style="padding:3px; border:1px solid #000;">تاريخه</th>
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
    <td style="padding:3px; border:1px solid #000;">${row.itemName}</td>
    <td style="padding:3px; border:1px solid #000;">${row.receivedQuantity}</td>
    <td style="padding:3px; border:1px solid #000;">${row.returnedQuantity}</td>
    <td style="padding:3px; border:1px solid #000;">${row.actualQuantity}</td>
  </tr>
`).join('');
     const summaryTable = `
  <table border="1" cellspacing="0" cellpadding="4" class="table-container" style="width:100%; border-collapse:collapse; text-align:center; margin-bottom:24px;">
    <thead>
      <tr><th colspan="4" style="font-size: 1.3rem; background-color: #D3D3D3; font-weight:600; border:1px solid #000;">الخلاصه</th></tr>
      <tr style="background-color: #D3D3D3; font-size: 1.2rem; font-weight:600">
        <th style="padding:3px; border:1px solid #000;">المادة/الصنف</th>
        <th style="padding:3px; border:1px solid #000;">الكميه المستلمه</th>
        <th style="padding:3px; border:1px solid #000;">الارجاع</th>
        <th style="padding:3px; border:1px solid #000;">المتبقي (الفعلي)</th>
      </tr>
    </thead>
    <tbody>${summaryRows}</tbody>
  </table>
`;
      // Details Table
      const detailsRows = this.filteredData.map(row => `
  <tr>
    <td style="padding:3px; border:1px solid #000;">${row.receiver}</td>
    <td style="padding:3px; border:1px solid #000;">${row.type}</td>
    <td style="padding:3px; border:1px solid #000;">${row.documentNumber}</td>
    <td style="padding:3px; border:1px solid #000;">${row.itemName}</td>
    <td style="padding:3px; border:1px solid #000;">${row.quantity}</td>
    <td style="padding:3px; border:1px solid #000;">${row.date}</td>
  </tr>
`).join('');
     const detailsTable = `
  <table border="1" cellspacing="0" cellpadding="4" class="table-container" style="width:100%; border-collapse:collapse; text-align:center;">
    <thead>
      <tr><th colspan="6" style="font-size: 1.3rem; background-color: #D3D3D3; font-weight:600; border:1px solid #000;">تفاصيل</th></tr>
      <tr style="background-color: #D3D3D3; font-size: 1.2rem; font-weight:600">
        <th style="padding:3px; border:1px solid #000;">اسم المستلم</th>
        <th style="padding:3px; border:1px solid #000;">نوع السند</th>
        <th style="padding:3px; border:1px solid #000;">رقم المستند</th>
        <th style="padding:3px; border:1px solid #000;">الصنف / المادة</th>
        <th style="padding:3px; border:1px solid #000;">الكميه</th>
        <th style="padding:3px; border:1px solid #000;">تاريخه</th>
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
        originalTable.style.width = '70%';
        originalTable.style.borderCollapse = 'collapse';
        originalTable.style.border = '2px solid #000';
        originalTable.style.margin = 'auto';
        const ths = originalTable.querySelectorAll('th');
        ths.forEach(th => {
         th.style.border = '1px solid #000';
          th.style.padding = '2px';
          th.style.backgroundColor = '#D3D3D3   ';
          th.style.fontSize = '1.2rem';
          th.style.fontWeight = '700';
        });
        const tds = originalTable.querySelectorAll('td');
        tds.forEach(td => {
          td.style.border = '1px solid #000';
          td.style.padding = '4px';
          td.style.fontSize = '1.1rem';
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
        receivedQuantity:receivedQuantity + returnedQuantity,
        returnedQuantity,
        actualQuantity: receivedQuantity 
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

  // تصفية المصروفات حسب البحث المحدد
  const filteredExpenses = this.searchMethod === 'byUnit' && this.selectedUnit
    ? this.expenses.filter(e => e.unitName === this.selectedUnit && e.receiver === this.selectedReceiver)
    : this.expenses.filter(e => e.receiver === this.selectedReceiver);

  // حساب الكميات المستلمة
  const receivedMap = this.calculateReceivedItems(filteredExpenses);

  // تصفية المرتجعات
  const filteredReturns = this.searchMethod === 'byUnit' && this.selectedUnit
    ? this.returns.filter(r => r.unitName === this.selectedUnit && r.receiverName === this.selectedReceiver)
    : this.returns.filter(r => r.receiverName === this.selectedReceiver);

  // حساب الكميات المرتجعة
  const returnedMap = this.calculateReturnedItems(filteredReturns);

  // تحديث البيانات المعروضة
  this.updateDisplayedData(receivedMap, returnedMap, filteredExpenses);
}

// دالة مساعدة لحساب الكميات المستلمة
private calculateReceivedItems(expenses: any[]): {[key: string]: number} {
  const map: {[key: string]: number} = {};
  expenses.forEach(exp => {
    (exp.items || []).forEach((item: any) => {
      map[item.itemName] = (map[item.itemName] || 0) + (Number(item.quantity) || 0);
    });
  });
  return map;
}

// دالة مساعدة لحساب الكميات المرتجعة
private calculateReturnedItems(returns: any[]): {[key: string]: number} {
  const map: {[key: string]: number} = {};
  returns.forEach(ret => {
    const items = Array.isArray(ret.items) ? ret.items : 
                 typeof ret.items === 'string' ? [{itemName: ret.items, quantity: ret.quantity}] : [];
    
    items.forEach((item: any) => {
      map[item.itemName] = (map[item.itemName] || 0) + (Number(item.quantity) || 0);
    });
  });
  return map;
}

// دالة مساعدة لتحديث البيانات المعروضة
private updateDisplayedData(receivedMap: {[key: string]: number}, 
                          returnedMap: {[key: string]: number},
                          filteredExpenses: any[]) {
  // تحديث ملخص الأصول
  this.receiverAssetsSummary = Object.keys(receivedMap).map(itemName => ({
    itemName,
    received: (receivedMap[itemName] || 0) + (returnedMap[itemName] || 0),
    returned: returnedMap[itemName] || 0,
    remaining: receivedMap[itemName] || 0
  }));

  // تحديث تفاصيل الأصول
  this.receiverAssetsDetails = filteredExpenses.flatMap(exp => 
    (exp.items || []).map((item: any) => ({
      itemName: item.itemName,
      quantity: item.quantity,
      receiptNumber: exp.documentNumber,
      date: exp.date ? new Date(exp.date).toLocaleDateString('ar-EG') : '',
      type: exp.type
    }))
  );
}

  // دالة للحصول على جميع المستلمين (للخيار الثاني)
  getUniqueReceiversFromExpenses(): string[] {
    const names = this.expenses.map(e => e.receiver).filter(Boolean);
    return Array.from(new Set(names));
  }


  get showExpenseTypeButtons() {
    return this.selectedReport === 'expensesByOrder';
  }
replaceCommasWithBreaks(value: string): string {
  return value ? value.replace(/,/g, '<br>') : '';
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
    ],
    openingBalances: [
      { key: 'stockNumber', label: 'رقم الماده ' },
      { key: 'itemName', label: 'اسم الصنف' },
      { key: 'quantityAvailable', label: 'الكمية المتاحة' },
      { key: 'serialNumbers', label: 'الأرقام التسلسلية' },
    ],
    detailedOrderExpense: [
      { key: 'receiver', label: ' اسم المستلم' },
      { key: 'type', label: 'نوع السند' },
      { key: 'documentNumber', label: 'رقم المستند' },
      { key: 'itemName', label: ' المادة/الصنف' },
      { key: 'quantity', label: 'الكميه ' },
      { key: 'date', label: 'تاريخه ' }
    ],
    returnedItems: [
    { key: 'unitName', label: 'الوحدة' },
    { key: 'receiverName', label: 'المستلم' },
    { key: 'items', label: 'الصنف' },
    { key: 'quantity', label: 'إجمالي الكميات المرتجعة' },
    { key: 'disposedqantity', label: 'إجمالي الكميات المسقطة' },
    { key: 'dispose', label: 'المتبقي' }
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


}