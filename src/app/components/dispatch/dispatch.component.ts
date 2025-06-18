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
  units: any[] = [];
  itemsList: any[] = [];
  openingBalances: any[] = [];
  dispatches: any[] = [];
  loading = false;
  warningMessage = '';
  successMessage = '';
  selectedFile: File | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.dispatchForm = this.fb.group({
      unitName: ['', Validators.required],
      receiverName: ['', Validators.required],
      receiptNumber: ['', Validators.required],
      stockNumber: [{ value: '', disabled: true }, Validators.required],
      itemName: ['', Validators.required],
      serialNumber: [''],
      quantity: [1, [Validators.required, Validators.min(1)]]
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
    this.http.get<any[]>('http://localhost:3000/openingBalances').subscribe(data => this.openingBalances = data);
  }

  loadDispatches() {
    this.http.get<any[]>('http://localhost:3000/dispatches').subscribe(data => this.dispatches = data);
  }

  onStockNumberChange() {
    const stockNumber = this.dispatchForm.get('stockNumber')?.value;
    const item = this.itemsList.find(i => i.stockNumber === stockNumber);
    this.dispatchForm.get('itemName')?.setValue(item ? item.itemName : '');
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

  onSubmit() {
    this.warningMessage = '';
    this.successMessage = '';
    if (this.dispatchForm.invalid || !this.selectedFile) {
      this.warningMessage = 'يرجى تعبئة جميع الحقول وإرفاق الإيصال.';
      return;
    }
    const { stockNumber, quantity } = this.dispatchForm.getRawValue();
    // Debug: Log all stockNumbers and the searched value
    console.log('DEBUG: openingBalances:', this.openingBalances.map(b => b.stockNumber));
    console.log('DEBUG: searched stockNumber:', stockNumber);
    const balance = this.openingBalances.find(
      b => String(b.stockNumber).trim() === String(stockNumber).trim()
    );
    if (!balance) {
      this.warningMessage = `لا يوجد رصيد مطابق لرقم الصنف: ${stockNumber}`;
      console.log('DEBUG: No matching balance found for stockNumber:', stockNumber);
      return;
    }
    if (quantity > balance.quantityAvailable) {
      this.warningMessage = `الكمية المطلوبة (${quantity}) أكبر من المتوفر (${balance.quantityAvailable}) للصنف: ${stockNumber}`;
      console.log('DEBUG: Requested quantity:', quantity, 'Available:', balance.quantityAvailable);
      return;
    }
    this.loading = true;
    // 1. تقليل الرصيد
    const newBalance = { ...balance, quantityAvailable: balance.quantityAvailable - quantity };
    this.http.put(`http://localhost:3000/openingBalances/${balance.id}`, newBalance).subscribe({
      next: () => {
        // 2. حفظ بيانات الصرف مع الإيصال (الملف كـ base64)
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          const dispatchData = {
            ...this.dispatchForm.getRawValue(),
            status: 'completed',
            receipt: base64
          };
          this.http.post('http://localhost:3000/dispatches', dispatchData).subscribe({
            next: () => {
              this.successMessage = 'تم الصرف بنجاح!';
              this.dispatchForm.reset();
              this.dispatchForm.get('quantity')?.setValue(1);
              this.selectedFile = null;
              this.loading = false;
              this.loadOpeningBalances();
              this.loadDispatches(); // تحديث الجدول بعد الإضافة
            },
            error: () => {
              this.warningMessage = 'حدث خطأ أثناء حفظ بيانات الصرف.';
              this.loading = false;
            }
          });
        };
        reader.onerror = () => {
          this.warningMessage = 'تعذر قراءة ملف الإيصال.';
          this.loading = false;
        };
        reader.readAsDataURL(this.selectedFile as Blob);
      },
      error: () => {
        this.warningMessage = 'حدث خطأ أثناء تحديث الرصيد.';
        this.loading = false;
      }
    });
  }
}
