import { Component, OnInit } from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dispatch',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  templateUrl: './dispatch.component.html',
  styleUrls: ['./dispatch.component.css']
})
export class DispatchComponent implements OnInit {
  dispatchForm: FormGroup;
  usedSerialNumbers: string[] = [];
  units: any[] = [];
  itemsList: any[] = [];
  openingBalances: any[] = [];
  dispatches: any[] = [];
  loading = false;
  warningMessage = '';
  successMessage = '';
  selectedFile: File | null = null;
  recipients: any[] = []; // Add recipients array
  itemsRows: any[] = [
    { itemName: '', stockNumber: '', quantity: 1, serialNumbers: [] }
  ];
  customReceiver: string = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.dispatchForm = this.fb.group({
      unitName: ['', Validators.required],
      receiverName: ['', Validators.required],
      receiptNumber: ['', Validators.required],
      date: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUnits();
    this.loadItemsList();
    this.loadOpeningBalances();
    this.loadDispatches();
  }

  loadUnits() {
    this.http.get<any[]>('http://localhost:3000/units').subscribe(data => this.units = data);
  }

  loadItemsList() {
    this.http.get<any[]>('http://localhost:3000/items').subscribe(data => this.itemsList = data);
  }

  loadOpeningBalances() {
    this.http.get<any[]>('http://localhost:3000/openingBalances')
      .subscribe(data => {
        this.openingBalances = (data || []).map(b => ({
          ...b,
          serialNumbers: this.normalizeSerialArray(b.serialNumbers)
        }));
      });
  }

  loadDispatches(): void {
    this.http.get<any[]>('http://localhost:3000/dispatches').subscribe({
      next: (data) => {
        this.dispatches = data
        // 🆕 ممنوع تكرار سيريالات اتصرفت قبل كده
        this.usedSerialNumbers = data.flatMap(d =>
          this.normalizeSerialArray(d.serialNumber || d.serialNumbers)
        );
      },
      error: (err) => console.error('Error loading dispatches:', err)
    });
  }


  onStockNumberChange() {
    const stockNumber = this.dispatchForm.get('stockNumber')?.value;
    const item = this.itemsList.find(i => i.stockNumber === stockNumber);
    this.dispatchForm.get('itemName')?.setValue(item ? item.itemName : '');
  }
  onReceiverChange(event: any) {
    const selected = event.target.value;
    if (selected !== 'other') {
      this.customReceiver = '';
    }
  }

  onItemNameChange() {
    const itemName = this.dispatchForm.get('itemName')?.value;
    const item = this.itemsList.find(i => i.itemName === itemName);
    this.dispatchForm.get('stockNumber')?.setValue(item ? item.stockNumber : '');
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onUnitNameChange(event: any) {
    const selectedUnitName = event?.target?.value || '';
    const selectedUnit = this.units.find(unit => unit.unitName === selectedUnitName);

    if (selectedUnit) {
      // التأكد من وجود مصفوفة recipients
      if (!Array.isArray(selectedUnit.recipients)) {
        selectedUnit.recipients = [];
      }

      this.recipients = [...selectedUnit.recipients];
      this.dispatchForm.get('receiverName')?.enable();
      this.dispatchForm.get('receiverName')?.setValidators([Validators.required]);
      this.dispatchForm.get('receiverName')?.updateValueAndValidity();
    } else {
      this.recipients = [];
      this.dispatchForm.get('receiverName')?.disable();
      this.dispatchForm.get('receiverName')?.clearValidators();
      this.dispatchForm.get('receiverName')?.updateValueAndValidity();
    }
  }
  private async depleteBalancesByRow(row: any): Promise<void> {
    // السيريالات المطلوب خصمها
    const serialsToRemove = new Set((row.serialNumbers || []).map((s: any) => String(s)));

    // كل الأرصدة لنفس الصنف/الستوك نمبر
    const balances = this.openingBalances.filter(
      b => b.itemName === row.itemName &&
        String(b.stockNumber).trim() === String(row.stockNumber).trim()
    );

    let remainingQty = Number(row.quantity) || 0;

    // 2.1 خصم بالسيريالات (دقيق)
    if (serialsToRemove.size > 0) {
      for (const b of balances) {
        const balSerials = this.normalizeSerialArray(b.serialNumbers);
        const keep = balSerials.filter(sn => !serialsToRemove.has(String(sn)));
        const removedCount = balSerials.length - keep.length;

        if (removedCount > 0) {
          const updated = {
            ...b,
            serialNumbers: keep,
            // الكمية = القديمة - اللي اتمسح
            quantityAvailable: Math.max(0, Number(b.quantityAvailable || balSerials.length) - removedCount)
          };

          await this.http.put(`http://localhost:3000/openingBalances/${b.id}`, updated).toPromise();

          // حدّث محليًا
          const idx = this.openingBalances.findIndex(x => x.id === b.id);
          if (idx > -1) this.openingBalances[idx] = updated;

          // نضّف من مجموعة السيريالات المطلوبة
          for (const sn of balSerials) {
            const s = String(sn);
            if (serialsToRemove.has(s)) serialsToRemove.delete(s);
          }

          remainingQty -= removedCount;
          if (remainingQty <= 0 || serialsToRemove.size === 0) break;
        }
      }
    }

    // 2.2 لو لسه في كمية من غير سيريالات (أصناف غير مُسلسلة) → FIFO
    if (remainingQty > 0) {
      for (const b of balances) {
        if (remainingQty <= 0) break;
        const canTake = Math.min(remainingQty, Number(b.quantityAvailable || 0));
        if (canTake <= 0) continue;

        // لو الصنف غير مسلسَل، سيب السيريالات كما هي، واطرح الكمية
        const updated = {
          ...b,
          quantityAvailable: Number(b.quantityAvailable || 0) - canTake,
          serialNumbers: this.normalizeSerialArray(b.serialNumbers) // بدون تعديل
        };

        await this.http.put(`http://localhost:3000/openingBalances/${b.id}`, updated).toPromise();
        const idx = this.openingBalances.findIndex(x => x.id === b.id);
        if (idx > -1) this.openingBalances[idx] = updated;

        remainingQty -= canTake;
      }
    }

    // للتأكد إن الـ UI ياخد آخر نسخة
    this.openingBalances = [...this.openingBalances];
  }

  addItemRow() {
    this.itemsRows.push({ itemName: '', stockNumber: '', quantity: 1, serialNumbers: [] });
  }

  removeItemRow(index: number) {
    if (this.itemsRows.length > 1) {
      this.itemsRows.splice(index, 1);
    }
  }

  getSerialNumbersForRow(row: any): string[] {
    if (!row.itemName) return [];
    const balances = this.openingBalances.filter(b => b.itemName === row.itemName);
    return balances.flatMap(b =>
      typeof b.serialNumbers === 'string'
        ? b.serialNumbers.split(',').map((s: string) => s.trim())
        : (b.serialNumbers || []).map((s: any) => String(s))
    );
  }


  onItemNameChangeRow(row: any) {
    const item = this.itemsList.find(i => i.itemName === row.itemName);
    row.stockNumber = item ? item.stockNumber : '';

    const balances = this.openingBalances.filter(b => b.itemName === row.itemName);

    if (balances.length > 0) {
      const allSerials = balances.flatMap(b => this.normalizeSerialArray(b.serialNumbers));
      // استبعد المصروفة سابقًا
      row.availableSerials = allSerials.filter(sn => !this.usedSerialNumbers.includes(sn));
      row.availableQuantity = balances.reduce((s, b) => s + (b.quantityAvailable || 0), 0);

      // مبدئيًا خد أول N سيريال على حسب الكمية
      row.quantity = Math.min(row.availableQuantity, row.availableSerials.length || row.availableQuantity);
      row.serialNumbers = row.availableSerials.slice(0, row.quantity);
    } else {
      row.availableQuantity = 0;
      row.availableSerials = [];
      row.serialNumbers = [];
    }
  }



  onQuantityChangeRow(row: any) {
    const qty = Number(row.quantity) || 1;
    if (!Array.isArray(row.serialNumbers)) {
      row.serialNumbers = [];
    }
    if (row.serialNumbers.length > qty) {
      row.serialNumbers = row.serialNumbers.slice(0, qty);
    } else if (row.serialNumbers.length < qty) {
      row.serialNumbers = [...row.serialNumbers, ...Array(qty - row.serialNumbers.length).fill('')];
    }
  }

  getAvailableSerials(row: any, index: number): string[] {
    const all = Array.isArray(row.availableSerials) ? row.availableSerials : [];
    const used = [...row.serialNumbers];
    used.splice(index, 1); // نحذف السيريال الحالي من المقارنة

    return all.filter((sn: string) => !used.includes(sn));
  }
  private normalizeSerialArray(v: any): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
    if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
    return [String(v).trim()];
  }

  async onSubmit() {
  console.log('--- بدء عملية الصرف ---');
  this.warningMessage = '';
  this.successMessage = '';

  // ✅ التحقق من الحقول الأساسية
  if (this.dispatchForm.invalid) {
    this.warningMessage = 'يرجى تعبئة جميع بيانات النموذج الأساسية.';
    return;
  }

  if (this.dispatchForm.get('receiverName')?.value === 'other' && !this.customReceiver.trim()) {
    this.warningMessage = 'يرجى إدخال اسم المستلم الجديد.';
    return;
  }

  const receiptNumber = this.dispatchForm.get('receiptNumber')?.value;
  if (this.dispatches.some(d => String(d.documentNumber).trim() === String(receiptNumber).trim())) {
    this.warningMessage = 'رقم السند مستخدم من قبل.';
    return;
  }

  // ✅ قراءة الملف
  let fileBase64 = '';
  if (this.selectedFile) {
    fileBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject('تعذر قراءة ملف الإيصال.');
      reader.readAsDataURL(this.selectedFile as Blob);
    });
  }

  this.loading = true;

  try {
    const itemsData: any[] = [];

    for (const row of this.itemsRows) {
      // تحقق من الكميات
      const balances = this.openingBalances.filter(b => String(b.stockNumber).trim() === String(row.stockNumber).trim());
      const totalAvailable = balances.reduce((s, b) => s + (b.quantityAvailable || 0), 0);
      if (row.quantity > totalAvailable) {
        this.warningMessage = `الكمية المطلوبة (${row.quantity}) أكبر من المتوفر (${totalAvailable}) للصنف ${row.stockNumber}`;
        this.loading = false;
        return;
      }

      // 🔹 جلب orderNumber من الرصيد
      const relatedBalance = balances[0];
      const orderNumber = relatedBalance?.orderNumber || null;

      itemsData.push({
        itemName: row.itemName,
        stockNumber: row.stockNumber,
        quantity: row.quantity,
        serialNumbers: row.serialNumbers.filter((s: string) => s !== ''),
        orderNumber
      });

      // خصم من الرصيد
      await this.depleteBalancesByRow(row);
    }

    // 📦 تجهيز جسم الطلب (نفس شكل expenses)
    const documentData = {
      unitName: this.dispatchForm.get('unitName')?.value,
      receiver: this.dispatchForm.get('receiverName')?.value === 'other'
        ? this.customReceiver.trim()
        : this.dispatchForm.get('receiverName')?.value,
      documentNumber: receiptNumber,
      type: "صرف من المستودع",
      attachment: fileBase64,
      items: itemsData,
      date: this.formatDateToISOString(this.dispatchForm.get('date')?.value)
    };

    // 🔹 حفظ نسخة في dispatches
    await this.http.post('http://localhost:3000/dispatches', documentData).toPromise();
    console.log("📦 تم الحفظ في dispatches", documentData);

    // 🔹 حفظ نسخة في expenses
    await this.http.post('http://localhost:3000/expenses', documentData).toPromise();
    console.log("💰 تم الحفظ في expenses", documentData);

    this.successMessage = '✅ تم حفظ بيانات الصرف بنجاح.';
    this.dispatchForm.reset();
    this.itemsRows = [{ itemName: '', stockNumber: '', quantity: 1, serialNumbers: [] }];
    this.selectedFile = null;
    this.loadDispatches();

  } catch (err) {
    console.error('❌ خطأ أثناء الحفظ:', err);
    this.warningMessage = 'حدث خطأ أثناء الحفظ.';
  } finally {
    this.loading = false;
  }
}
 

  formatDateToISOString(dateStr: string): string {
    if (!dateStr) { return ''; }
    // If already ISO, return as is
    if (dateStr.includes('T')) { return dateStr; }
    // Convert yyyy-MM-dd to ISO string (local time at 00:00)
    const d = new Date(dateStr);
    return d.toISOString();
  }
}