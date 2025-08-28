import { Component, OnInit, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule, FormArray } from '@angular/forms';

@Component({
  selector: 'app-opening-balances',
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  standalone: true,
  templateUrl: './opening-balances.component.html',
  styleUrls: ['./opening-balances.component.css']
})
export class OpeningBalancesComponent implements OnInit {
  openingBalances: any[] = [];
  balanceForm: FormGroup;
  itemsList: any[] = [];

  private apiUrl = 'http://localhost:3000/openingBalances';

  constructor(private http: HttpClient, private fb: FormBuilder, private appRef: ApplicationRef) {
    this.balanceForm = this.fb.group({
      stockNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      itemName: ['', [Validators.required]],
      quantityAvailable: [null, [Validators.required, Validators.min(1)]],
      serialNumbers: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loadBalances();
    this.loadItemsList();
    this.balanceForm.get('quantityAvailable')?.valueChanges.subscribe(() => {
      this.updateSerialNumberFields();
    });
  }
  getSerialNumbers(itemGroup: FormGroup): FormArray {
    return itemGroup.get('serialNumbers') as FormArray;
  }

  loadBalances(): void {
    // جلب أرصدة البداية
    this.http.get<any[]>('http://localhost:3000/openingBalances').subscribe({
      next: (balances) => {
        this.openingBalances = (balances || []).map(balance => ({
          ...balance,
          serialNumbers: this.normalizeSerialNumbers(balance.serialNumbers)
        }));
      },
      error: (err) => console.error('Error loading balances:', err)
    });

    // جلب بيانات الأوردر وتحويلها لشكل الأرصدة
    this.http.get<any[]>('http://localhost:3000/orders').subscribe({
      next: (orders) => {
        this.orderBalances = (orders || [])
          .flatMap(order => order.items || [])
          .map(item => ({
            stockNumber: item.stockNumber || '',
            itemName: item.itemName || '',
            quantityAvailable: Number(item.quantity) || 0,
            serialNumbers: this.normalizeSerialNumbers(item.serialNumbers || []),
            orderId: item.orderId || null
          }));
      },
      error: (err) => console.error('Error loading orders:', err)
    });
  }

  normalizeSerialNumbers(serials: any): any[] {
    if (!serials) return [];
    if (Array.isArray(serials)) return serials;
    if (typeof serials === 'string') return serials.split(',').map(s => s.trim());
    return [serials];
  }
  loadItemsList() {
    this.http.get<any[]>('http://localhost:3000/items').subscribe({
      next: (data) => this.itemsList = data,
      error: (err) => console.error('Error loading items:', err)
    });
  }

  onItemNameChange() {
    const itemName = this.balanceForm.get('itemName')?.value;
    const item = this.itemsList.find(i => i.itemName === itemName);
    if (item) {
      this.balanceForm.get('stockNumber')?.setValue(item.stockNumber);
    } else {
      this.balanceForm.get('stockNumber')?.setValue('');
    }
  }
  getQuantity(value: any): string | number {
    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return value ?? '';
  }

  updateSerialNumberFields(): void {
    const quantity = this.balanceForm.get('quantityAvailable')?.value;
    const serialNumbers = this.balanceForm.get('serialNumbers') as FormArray;

    // Clear existing controls
    while (serialNumbers.length !== 0) {
      serialNumbers.removeAt(0);
    }

    // Add new controls based on quantity
    if (quantity && quantity > 0) {
      for (let i = 0; i < quantity; i++) {
        serialNumbers.push(this.fb.control(''));
      }
    }
  }
  async saveBalance(): Promise<void> {
    if (this.balanceForm.invalid) {
      this.showValidation = true;
      return;
    }

    const formValue = this.balanceForm.value;
    const newBalance = {
      ...formValue,
      serialNumbers: formValue.serialNumbers
        ? formValue.serialNumbers
          .map((sn: any) => typeof sn === 'object' ? sn.number || sn.value : sn)
          .filter((sn: string) => sn !== '')
        : [],
      quantityAvailable: Number(formValue.quantityAvailable) || 0
    };

    if (newBalance.serialNumbers.length > 0 &&
      newBalance.serialNumbers.length !== newBalance.quantityAvailable) {
      this.warningMessage = 'عدد الأرقام التسلسلية يجب أن يساوي الكمية المدخلة';
      setTimeout(() => this.warningMessage = '', 4000);
      return;
    }

    try {
      // جلب أرصدة البداية فقط
      const openingBalances = await this.http.get<any[]>(this.apiUrl).toPromise();

      const existing = openingBalances?.find(
        b => b.itemName === newBalance.itemName && b.stockNumber === newBalance.stockNumber&&b.linkedToOrder!==true
      );

      if (newBalance.quantityAvailable === 0 && existing) {
        this.http.delete(`${this.apiUrl}/${existing.id}`).subscribe({
          next: () => {
            this.loadBalances();
            this.resetForm();
            this.successMessage = 'تم حذف الرصيد لأن الكمية صفر.';
            setTimeout(() => this.successMessage = '', 4000);
          },
          error: () => {
            this.warningMessage = 'حدث خطأ أثناء حذف الرصيد ذو الكمية صفر.';
            setTimeout(() => this.warningMessage = '', 4000);
          }
        });
        return;
      }

      if (existing) {
        const updatedBalance = {
          ...existing,
          quantityAvailable: existing.quantityAvailable + newBalance.quantityAvailable,
          serialNumbers: [...existing.serialNumbers, ...newBalance.serialNumbers]
        };

        this.http.put(`${this.apiUrl}/${existing.id}`, updatedBalance).subscribe({
          next: () => {
            this.loadBalances();
            this.resetForm();
            this.successMessage = 'تم تحديث الرصيد بنجاح!';
            setTimeout(() => this.successMessage = '', 4000);
          },
          error: () => {
            this.warningMessage = 'حدث خطأ أثناء تحديث الرصيد.';
            setTimeout(() => this.warningMessage = '', 4000);
          }
        });
      } else {
        this.http.post(this.apiUrl, newBalance).subscribe({
          next: () => {
            this.loadBalances();
            this.resetForm();
            this.showValidation = false;
            this.successMessage = 'تمت إضافة الرصيد بنجاح!';
            setTimeout(() => this.successMessage = '', 4000);
          },
          error: () => {
            this.warningMessage = 'حدث خطأ أثناء حفظ الرصيد.';
            setTimeout(() => this.warningMessage = '', 4000);
          }
        });
      }

    } catch {
      this.warningMessage = 'حدث خطأ أثناء معالجة البيانات.';
      setTimeout(() => this.warningMessage = '', 4000);
    }
  }


  validateUniqueStockNumber(stockNumber: string): boolean {
    return !this.openingBalances.some(b => b.stockNumber === stockNumber);
  }

  resetForm(): void {
    this.balanceForm.reset({
      stockNumber: '',
      itemName: '',
      quantityAvailable: null,
      serialNumbers: '',
    });
  }

  deleteBalance(id: number): void {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => this.loadBalances(),
      error: (err) => console.error('Error deleting balance:', err)
    });
  }

  showValidation = false;
  warningMessage = '';
  successMessage = '';
  orderBalances: any[] = []; // بيانات جاية من orders

}
