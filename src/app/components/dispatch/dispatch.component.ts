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
  recipients: any[] = [];
  itemsRows: any[] = [
    { itemName: '', stockNumber: '', quantity: 1, serialNumbers: [], availableSerials: [], availableQuantity: 0 }
  ];
  customReceiver: string = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.dispatchForm = this.fb.group({
      unitName: ['', Validators.required],
      receiverName: ['', Validators.required],
      receiptNumber: ['', Validators.required],
      dateForm: this.fb.group({
        day: ['', [Validators.required, Validators.min(1), Validators.max(31)]],
        month: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
        year: ['', [Validators.required, Validators.min(1900), Validators.max(2100)]],
      })
    });
  }

  globalTransferDate: string = '';

  getFullDate(): string {
    const d = this.dispatchForm.get('dateForm')?.value;
    return `${d?.day || ''}.${d?.month || ''}.${d?.year || ''}`;
  }

  ngOnInit(): void {
    const today = new Date();
    this.globalTransferDate = this.formatGregorianDate(today);

    this.loadUnits();
    this.loadItemsList();
    this.loadOpeningBalances();
    this.loadDispatches();
  }

  formatGregorianDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  loadUnits() {
    this.http.get<any[]>('http://localhost:3000/units').subscribe(data => this.units = data || []);
  }

  loadItemsList() {
    this.http.get<any[]>('http://localhost:3000/items').subscribe(data => this.itemsList = data || []);
  }

  loadOpeningBalances() {
    this.http.get<any[]>('http://localhost:3000/openingBalances')
      .subscribe(data => {
        this.openingBalances = (data || []).map(b => ({
          ...b,
          serialNumbers: this.normalizeSerialArray(b.serialNumbers),
          quantityAvailable: Number(b.quantityAvailable || 0)
        }));
      });
  }

  loadDispatches(): void {
    this.http.get<any[]>('http://localhost:3000/dispatches').subscribe({
      next: (data) => {
        const list = (data || []).map(o => {
          const parsed = this.safeParseDate(o.date);
          return {
            ...o,
            displayDate: parsed ? this.formatDateToDDMMYYYY(parsed) : ''
          };
        });

        // sort by date (newest first) if date parseable, else keep original order
        this.dispatches = list.sort((a, b) => {
          const da = this.safeParseDate(a.date);
          const db = this.safeParseDate(b.date);
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          return db.getTime() - da.getTime();
        });

        // usedSerialNumbers: اجمع كل السيريالات من كل dispatch.items
        this.usedSerialNumbers = (this.dispatches || []).flatMap(d =>
          (d.items || []).flatMap((it: any) => this.normalizeSerialArray(it.serialNumbers))
        ).map(s => String(s).trim());
      },
      error: (err) => console.error('Error loading dispatches:', err)
    });
  }

  // helpers to keep things safe
  private safeParseDate(d: any): Date | null {
    if (!d) return null;
    // Accept yyyy-mm-dd or ISO strings or Date objects
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
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
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onUnitNameChange(event: any) {
    const selectedUnitName = event?.target?.value || '';
    const selectedUnit = this.units.find(unit => unit.unitName === selectedUnitName);

    if (selectedUnit) {
      if (!Array.isArray(selectedUnit.recipients)) selectedUnit.recipients = [];
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
    const serialsToRemove = new Set((row.serialNumbers || []).map((s: any) => String(s).trim()));

    const balances = this.openingBalances.filter(
      b => b.itemName === row.itemName &&
        String(b.stockNumber).trim() === String(row.stockNumber).trim()
    );

    let remainingQty = Number(row.quantity) || 0;

    // 1) remove by explicit serial numbers first
    if (serialsToRemove.size > 0) {
      for (const b of balances) {
        const balSerials = this.normalizeSerialArray(b.serialNumbers);
        const keep = balSerials.filter(sn => !serialsToRemove.has(String(sn)));
        const removedCount = balSerials.length - keep.length;

        if (removedCount > 0) {
          const updated = {
            ...b,
            serialNumbers: keep,
            quantityAvailable: Math.max(0, Number(b.quantityAvailable || balSerials.length) - removedCount)
          };

          await this.http.put(`http://localhost:3000/openingBalances/${b.id}`, updated).toPromise();

          const idx = this.openingBalances.findIndex(x => x.id === b.id);
          if (idx > -1) this.openingBalances[idx] = updated;

          // remove removed serials from the set
          for (const sn of balSerials) {
            const s = String(sn).trim();
            if (serialsToRemove.has(s)) serialsToRemove.delete(s);
          }

          remainingQty -= removedCount;
          if (remainingQty <= 0 || serialsToRemove.size === 0) break;
        }
      }
    }

    // 2) if still need quantities (non-serialized) -> FIFO on quantityAvailable
    if (remainingQty > 0) {
      for (const b of balances) {
        if (remainingQty <= 0) break;
        const canTake = Math.min(remainingQty, Number(b.quantityAvailable || 0));
        if (canTake <= 0) continue;

        const updated = {
          ...b,
          quantityAvailable: Number(b.quantityAvailable || 0) - canTake,
          serialNumbers: this.normalizeSerialArray(b.serialNumbers)
        };

        await this.http.put(`http://localhost:3000/openingBalances/${b.id}`, updated).toPromise();
        const idx = this.openingBalances.findIndex(x => x.id === b.id);
        if (idx > -1) this.openingBalances[idx] = updated;

        remainingQty -= canTake;
      }
    }

    // refresh local copy
    this.openingBalances = [...this.openingBalances];
  }

  addItemRow() {
    this.itemsRows.push({ itemName: '', stockNumber: '', quantity: 1, serialNumbers: [], availableSerials: [], availableQuantity: 0 });
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
      Array.isArray(b.serialNumbers) ? b.serialNumbers.map((s: any) => String(s)) :
        (typeof b.serialNumbers === 'string' ? b.serialNumbers.split(',').map((s: string) => s.trim()) : [])
    ).map((s: any) => String(s).trim());
  }

  onItemNameChangeRow(row: any) {
    const item = this.itemsList.find(i => i.itemName === row.itemName);
    row.stockNumber = item ? item.stockNumber : '';

    const balances = this.openingBalances.filter(b => b.itemName === row.itemName);

    if (balances.length > 0) {
      const allSerials = balances.flatMap(b => this.normalizeSerialArray(b.serialNumbers));
      row.availableSerials = allSerials.filter(sn => !this.usedSerialNumbers.includes(sn));
      row.availableQuantity = balances.reduce((s, b) => s + (b.quantityAvailable || 0), 0);

      row.quantity = Math.min(row.availableQuantity, (row.availableSerials.length || row.availableQuantity));
      row.serialNumbers = row.availableSerials.slice(0, row.quantity);
    } else {
      row.availableQuantity = 0;
      row.availableSerials = [];
      row.serialNumbers = [];
    }
  }

  onQuantityChangeRow(row: any) {
    const qty = Number(row.quantity) || 1;
    if (!Array.isArray(row.serialNumbers)) row.serialNumbers = [];
    if (row.serialNumbers.length > qty) row.serialNumbers = row.serialNumbers.slice(0, qty);
    else if (row.serialNumbers.length < qty) row.serialNumbers = [...row.serialNumbers, ...Array(qty - row.serialNumbers.length).fill('')];
  }

  getAvailableSerials(row: any, index: number): string[] {
    const all = Array.isArray(row.availableSerials) ? row.availableSerials : [];
    const used = [...(row.serialNumbers || [])];
    used.splice(index, 1);
    return all.filter((sn: string) => !used.includes(sn));
  }

  private normalizeSerialArray(v: any): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
    if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
    return [String(v).trim()].filter(Boolean);
  }

  async onSubmit() {
    console.log('--- بدء عملية الصرف ---');
    this.warningMessage = '';
    this.successMessage = '';

    if ((this.dispatchForm.get('dateForm') as FormGroup).invalid) {
      alert('من فضلك أدخل تاريخ صحيح');
      return;
    }

    if (this.dispatchForm.invalid) {
      this.warningMessage = 'يرجى تعبئة جميع بيانات النموذج الأساسية.';
      return;
    }

    if (this.dispatchForm.get('receiverName')?.value === 'other' && !this.customReceiver.trim()) {
      this.warningMessage = 'يرجى إدخال اسم المستلم الجديد.';
      return;
    }

    const { day, month, year } = this.dispatchForm.get('dateForm')?.value;
    const dbDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const receiptNumber = String(this.dispatchForm.get('receiptNumber')?.value || '').trim();
    if (this.dispatches.some(d => String(d.documentNumber || d.documentNumber || '').trim() === receiptNumber)) {
      this.warningMessage = 'رقم السند مستخدم من قبل.';
      return;
    }

    // read file if any
    let fileBase64 = '';
    if (this.selectedFile) {
      fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject('تعذر قراءة ملف الإيصال.');
        reader.readAsDataURL(this.selectedFile as Blob);
      }).catch(err => {
        console.error(err);
        this.warningMessage = 'خطأ في قراءة الملف.';
        return '';
      });
    }

    this.loading = true;

    try {
      const itemsData: any[] = [];

      for (const row of this.itemsRows) {
        const balances = this.openingBalances.filter(b => String(b.stockNumber).trim() === String(row.stockNumber).trim());
        const totalAvailable = balances.reduce((s, b) => s + (Number(b.quantityAvailable || 0)), 0);
        if (Number(row.quantity) > totalAvailable) {
          this.warningMessage = `الكمية المطلوبة (${row.quantity}) أكبر من المتوفر (${totalAvailable}) للصنف ${row.stockNumber}`;
          this.loading = false;
          return;
        }

        const relatedBalance = balances[0];
        const orderNumber = relatedBalance?.orderNumber || null;

        itemsData.push({
          itemName: row.itemName,
          stockNumber: row.stockNumber,
          quantity: Number(row.quantity),
          serialNumbers: (row.serialNumbers || []).filter((s: any) => s !== '' && s != null).map((s: any) => String(s).trim()),
          orderNumber
        });

        await this.depleteBalancesByRow(row);
      }

      const documentData = {
        unitName: String(this.dispatchForm.get('unitName')?.value || '').trim(),
        receiver: this.dispatchForm.get('receiverName')?.value === 'other'
          ? this.customReceiver.trim()
          : String(this.dispatchForm.get('receiverName')?.value || '').trim(),
        documentNumber: receiptNumber,
        type: "صرف من المستودع",
        attachment: fileBase64 || null,
        items: itemsData,
        date: dbDate,
      };

      await this.http.post('http://localhost:3000/dispatches', documentData).toPromise();
      await this.http.post('http://localhost:3000/expenses', documentData).toPromise();

      this.successMessage = '✅ تم حفظ بيانات الصرف بنجاح.';
      this.dispatchForm.reset();
      this.itemsRows = [{ itemName: '', stockNumber: '', quantity: 1, serialNumbers: [], availableSerials: [], availableQuantity: 0 }];
      this.selectedFile = null;
      this.loadDispatches();
      this.loadOpeningBalances();

    } catch (err) {
      console.error('❌ خطأ أثناء الحفظ:', err);
      this.warningMessage = 'حدث خطأ أثناء الحفظ.';
    } finally {
      this.loading = false;
    }
  }

  formatDateToDDMMYYYY(date: Date): string {
    if (!date || isNaN(date.getTime())) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}
