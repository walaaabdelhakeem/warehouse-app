import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toHijri } from 'hijri-converter';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-transfer',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.css']
})
export class TransferComponent implements OnInit {
  units: any[] = [];
  fromUnit: any = null;
  newReceiver: string = '';
  expenses: any[] = [];
  groupedItems: any[] = [];   // ✅ المعتمد عليه في الجدول و المناقلة
  fileToUpload: File | null = null;
  successMessage: string = '';
  transfers: any[] = [];
  recipients: any[] = [];
  itemsList: any[] = [];
  selectedReceiverOption: string = '';
  customReceiver: string = '';
  existingReceivers: string[] = [];
  globalTransferDate: string = '';

  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {
    
  }
  hijriDay: number | null = null;
  hijriMonth: number | null = null;
  hijriYear: number | null = null;
  ngOnInit() {
      const today = new Date();
  const hDate = toHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());

  this.hijriDay = hDate.hd;
  this.hijriMonth = hDate.hm;
  this.hijriYear = hDate.hy;

  // ✅ هنا نبني السنوات بالهجري
  this.years = [];
  for (let y = this.hijriYear + 50; y >= this.hijriYear - 50; y--) {
    this.years.push(y);
  }


    this.loadUnits();
    this.loadTransfers();
    this.recipients = [];
    this.existingReceivers = [];
  }

  loadUnits() {
    this.http.get<any[]>(`${this.apiUrl}/units`).subscribe(units => {
      this.units = units;
    });
  }

  loadTransfers() {
    this.http.get<any[]>(`${this.apiUrl}/transfers`).subscribe(data => {
      this.transfers = data;
    });
  }
  hijriMonths = [
    { name: 'محرم', value: 1 },
    { name: 'صفر', value: 2 },
    { name: 'ربيع الأول', value: 3 },
    { name: 'ربيع الآخر', value: 4 },
    { name: 'جمادى الأولى', value: 5 },
    { name: 'جمادى الآخرة', value: 6 },
    { name: 'رجب', value: 7 },
    { name: 'شعبان', value: 8 },
    { name: 'رمضان', value: 9 },
    { name: 'شوال', value: 10 },
    { name: 'ذو القعدة', value: 11 },
    { name: 'ذو الحجة', value: 12 }
  ];
  days: number[] = Array.from({ length: 30 }, (_, i) => i + 1);
  years: number[] = [];
  buildHijriDate(): string | null {
    if (!this.hijriDay || !this.hijriMonth || !this.hijriYear) return null;
    return `${this.hijriDay}/${this.hijriMonth}/${this.hijriYear}`;
  }
  onUnitNameChange(event: any): void {
    const selectedUnitName = event?.target?.value || '';
    const selectedUnit = this.units.find(unit => unit.unitName === selectedUnitName);

    if (selectedUnit && Array.isArray(selectedUnit.recipients)) {
      this.recipients = [...selectedUnit.recipients];
      this.existingReceivers = [...selectedUnit.recipients];
    } else {
      this.recipients = [];
      this.existingReceivers = [];
    }

    this.selectedReceiverOption = '';
    this.customReceiver = '';
  }

  onUnitChange() {
    this.groupedItems = [];

    if (this.fromUnit) {
      const unitName = this.fromUnit.unitName || this.fromUnit.name || this.fromUnit;

      const unit = this.units.find(u => u.unitName === unitName);
      this.existingReceivers = unit?.recipients || [];

      this.http.get<any[]>(`${this.apiUrl}/expenses?unitName=${encodeURIComponent(unitName)}`).subscribe(items => {
        this.expenses = items;

        // تجهيز البيانات بشكل Grouped
        const assignedItems = items.flatMap(expense =>
          (expense.items || []).map((item: any) => ({
            ...item,
            expenseId: expense.id,
            unitName: expense.unitName,
            receiver: expense.receiver,
            oldReceiver: expense.receiver,
            selected: false,
            newQuantity: item.quantity,
            originalQuantity: item.quantity,
            date: expense.date || null
          }))
        );

        this.groupAssignedItemsByDate(assignedItems);
      });
    }
  }

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.fileToUpload = event.target.files[0];
    }
  }
    isSubmitting: boolean = false;



async onSubmit() {
  if (this.isSubmitting) return;
  this.isSubmitting = true;

  try {
    const hijriDate = this.buildHijriDate();
    if (!hijriDate) {
      alert('الرجاء تحديد تاريخ المناقلة بالهجري');
      this.isSubmitting = false;
      return;
    }

    this.newReceiver = this.selectedReceiverOption === 'other'
      ? this.customReceiver.trim()
      : this.selectedReceiverOption;

    if (!this.newReceiver.trim()) {
      alert('يرجى إدخال اسم المستلم الجديد');
      this.isSubmitting = false;
      return;
    }

    const selectedGroups = this.groupedItems.filter(g => g.selected);
    if (selectedGroups.length === 0) {
      alert('اختر على الأقل مجموعة واحدة للمناقلة');
      this.isSubmitting = false;
      return;
    }

    let fileBase64: string | null = null;
    if (this.fileToUpload) {
      fileBase64 = await this.convertFileToBase64(this.fileToUpload);
    }

    // ✅ نجمع كل الـ Requests هنا
    const requests = [];

    for (const group of selectedGroups) {
      // تحديث المصروفات (PUT)
      for (const item of group.items) {
        const req$ = this.http.get<any>(`${this.apiUrl}/expenses/${item.expenseId}`).pipe(
          switchMap(expense => {
            if (!expense || !expense.items) return [];
            expense.receiver = this.newReceiver;
            return this.http.put(`${this.apiUrl}/expenses/${item.expenseId}`, expense);
          })
        );
        requests.push(req$);
      }

      // تسجيل المناقلة (POST)
      const transferLog = {
        id: this.generateId(),
        unitName: group.unitName,
        receiverName: this.newReceiver,
        oldReceiver: group.receiver || '-',
        items: group.items.map((it: any) => ({
          itemName: it.itemName,
          quantity: it.originalQuantity
        })),
        date: hijriDate,
        file: fileBase64 || null
      };
      requests.push(this.http.post(`${this.apiUrl}/transfers`, transferLog));
    }

    // ✅ هنا ننفذ كل حاجة مرة واحدة
    forkJoin(requests).subscribe({
      next: () => {
        this.successMessage = 'تمت المناقلة بنجاح!';
        this.onUnitChange();
        this.loadTransfers();

        // تفضية المدخلات
        this.newReceiver = '';
        this.fileToUpload = null;
        this.selectedReceiverOption = '';
        this.customReceiver = '';
        this.globalTransferDate = '';
        this.groupedItems.forEach(g => g.selected = false);
        this.hijriDay = null;
        this.hijriMonth = null;
        this.hijriYear = null;

        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        console.error(err);
        alert('حدث خطأ أثناء الحفظ');
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });

  } catch (error) {
    console.error(error);
    alert('حدث خطأ أثناء الحفظ');
    this.isSubmitting = false;
  }
}


  setGlobalTransferDate() {
    const isoDate = new Date(this.globalTransferDate).toISOString();
    this.groupedItems.forEach(g => {
      if (g.selected) {
        g.transferDate = isoDate;
      }
    });
  }

  convertFileToBase64(file: File): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  generateId(): string {
    return Math.random().toString(36).substr(2, 6);
  }

  get hasSelectedItems(): boolean {
    return this.groupedItems && this.groupedItems.some(g => g.selected);
  }

  getFilteredTransfers() {
    return this.transfers.map(transfer => ({
      unitName: transfer.unitName,
      receiverName: transfer.receiverName,
      oldReceiver: transfer.oldReceiver || '-',
      items: transfer.items || [],   // ✅ رجع كل الأصناف
      transferDate: transfer.date,
      file: transfer.file
    }));
  }


  getCurrentRecipients(): string[] {
    if (!this.fromUnit) return [];
    const unitName = this.fromUnit.name || this.fromUnit.unitName || this.fromUnit;
    const unit = this.units.find(u => u.unitName === unitName);
    return unit && unit.recipients ? unit.recipients : [];
  }

  saveAllData() {
    localStorage.setItem('transfers', JSON.stringify(this.transfers));
    localStorage.setItem('expenses', JSON.stringify(this.expenses));
    localStorage.setItem('groupedItems', JSON.stringify(this.groupedItems));
  }

  groupAssignedItemsByDate(items: any[]) {
    const grouped: any[] = [];

    items.forEach(item => {
      const key = (item.unitName || '') + '_' + (item.date || '') + '_' + (item.receiver || '');
      let group = grouped.find(g => g.key === key);

      if (group) {
        group.items.push(item);
      } else {
        grouped.push({
          key,
          unitName: item.unitName,
          date: item.date,
          receiver: item.receiver,
          items: [item],
          selected: false
        });
      }
    });

    this.groupedItems = grouped;
  }
}
