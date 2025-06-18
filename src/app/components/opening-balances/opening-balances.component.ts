import { Component, OnInit, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';

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
      serialNumbers: [''], // Now optional, no Validators.required
      linkedToOrder: [false, [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadBalances();
    this.loadItemsList();
  }

  loadBalances(): void {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => this.openingBalances = data,
      error: (err) => console.error('Error loading balances:', err)
    });
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

  saveBalance(): void {
    if (this.balanceForm.invalid) {
      this.showValidation = true;
      return;
    }
    const newBalance = this.balanceForm.value;
    if (!this.validateUniqueStockNumber(newBalance.stockNumber)) {
      this.warningMessage = 'رقم المخزون مستخدم بالفعل. يجب أن يكون رقمًا فريدًا.';
      setTimeout(() => this.warningMessage = '', 4000);
      return;
    }
    this.http.post(this.apiUrl, newBalance).subscribe({
      next: () => {
        this.loadBalances();
        this.resetForm();
        this.showValidation = false;
        this.successMessage = 'تمت إضافة الرصيد بنجاح!';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.warningMessage = 'حدث خطأ أثناء حفظ الرصيد.';
        setTimeout(() => this.warningMessage = '', 4000);
      }
    });
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
      linkedToOrder: false
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
}
