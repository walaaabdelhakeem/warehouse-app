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

  private apiUrl = 'http://localhost:3000/openingBalances';

  constructor(private http: HttpClient, private fb: FormBuilder, private appRef: ApplicationRef) {
    this.balanceForm = this.fb.group({
      stockNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      itemName: ['', [Validators.required]],
      quantityAvailable: [null, [Validators.required, Validators.min(1)]],
      serialNumbers: ['', [Validators.required]],
      linkedToOrder: [false, [Validators.required]]
    });
  }

  ngOnInit(): void {
    console.log('Initializing OpeningBalancesComponent...');
    this.loadBalances();

    // Debugging stability
    this.appRef.isStable.subscribe((isStable) => {
      console.log('Application stability:', isStable);
    });

    // Auto-fill itemName based on stockNumber
    this.balanceForm.get('stockNumber')?.valueChanges.subscribe(stockNumber => {
      console.log('StockNumber changed:', stockNumber);
      const item = this.openingBalances.find(b => b.stockNumber === stockNumber);
      console.log('Auto-filled itemName:', item ? item.itemName : '');
      this.balanceForm.patchValue({ itemName: item ? item.itemName : '' });
    });
  }

  loadBalances(): void {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => this.openingBalances = data,
      error: (err) => console.error('Error loading balances:', err)
    });
  }

  saveBalance(): void {
    if (this.balanceForm.valid) {
      const newBalance = this.balanceForm.value;
      if (this.validateUniqueStockNumber(newBalance.stockNumber)) {
        this.http.post(this.apiUrl, newBalance).subscribe({
          next: () => {
            this.loadBalances();
            this.resetForm();
          },
          error: (err) => console.error('Error saving balance:', err)
        });
      } else {
        alert('Stock Number must be unique.');
      }
    } else {
      alert('Please fill out all required fields correctly.');
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
      linkedToOrder: false
    });
  }

  deleteBalance(id: number): void {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => this.loadBalances(),
      error: (err) => console.error('Error deleting balance:', err)
    });
  }
}
