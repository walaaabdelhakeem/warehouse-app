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
  recipients: any[] = []; // Add recipients array
  itemsRows: any[] = [
    { itemName: '', stockNumber: '', quantity: 1, serialNumbers: [] }
  ];

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

  onUnitNameChange(event: any) {
    const selectedUnitName = event?.target?.value || ''; // Safely access event.target.value
    console.log('DEBUG: Selected Unit Name:', selectedUnitName); // Debugging log
    console.log('DEBUG: Units Array:', this.units); // Debugging log
    const selectedUnit = this.units.find(unit => unit.unitName === selectedUnitName);
    console.log('DEBUG: Selected Unit:', selectedUnit); // Debugging log
    if (selectedUnit && Array.isArray(selectedUnit.recipients)) {
      console.log('DEBUG: Recipients:', selectedUnit.recipients); // Debugging log
      this.recipients = [...selectedUnit.recipients]; // Ensure recipients are correctly populated
      this.dispatchForm.get('receiverName')?.enable(); // Enable receiverName dropdown
      this.dispatchForm.get('receiverName')?.setValidators([Validators.required]);
      this.dispatchForm.get('receiverName')?.updateValueAndValidity();
    } else {
      console.log('DEBUG: No valid recipients found for the selected unit.'); // Debugging log
      this.recipients = []; // Clear recipients if no valid unit is selected
      this.dispatchForm.get('receiverName')?.disable(); // Disable receiverName dropdown
      this.dispatchForm.get('receiverName')?.clearValidators();
      this.dispatchForm.get('receiverName')?.updateValueAndValidity();
    }
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
    const ob = this.openingBalances.find(b => b.itemName === row.itemName);
    if (!ob || !ob.serialNumbers) return [];
    return typeof ob.serialNumbers === 'string' ? ob.serialNumbers.split(',').map((s: string) => s.trim()) : ob.serialNumbers;
  }

  onItemNameChangeRow(row: any) {
    const item = this.itemsList.find(i => i.itemName === row.itemName);
    row.stockNumber = item ? item.stockNumber : '';
    // Reset serialNumbers and ensure array matches quantity
    row.serialNumbers = Array(row.quantity).fill('');
  }

  onQuantityChangeRow(row: any) {
    // Ensure serialNumbers array matches quantity
    const qty = Number(row.quantity) || 1;
    if (!Array.isArray(row.serialNumbers)) { row.serialNumbers = []; }
    if (row.serialNumbers.length > qty) {
      row.serialNumbers = row.serialNumbers.slice(0, qty);
    } else if (row.serialNumbers.length < qty) {
      row.serialNumbers = [...row.serialNumbers, ...Array(qty - row.serialNumbers.length).fill('')];
    }
  }

  async onSubmit() {
    console.log('DEBUG: onSubmit called');
    this.warningMessage = '';
    this.successMessage = '';
    if (this.dispatchForm.invalid || !this.selectedFile) {
      this.warningMessage = 'يرجى تعبئة جميع الحقول وإرفاق السند.';
      console.log('DEBUG: Form invalid or file missing', this.dispatchForm.value, this.selectedFile);
      return;
    }
    // Validate all item rows
    for (const [idx, row] of this.itemsRows.entries()) {
      console.log(`DEBUG: Validating row ${idx}`, row);
      if (!row.itemName || !row.stockNumber || !row.quantity || row.quantity < 1) {
        this.warningMessage = 'يرجى تعبئة جميع بيانات الأصناف بشكل صحيح.';
        console.log('DEBUG: Invalid row data', row);
        return;
      }
      // Check opening balance
      const balance = this.openingBalances.find(b => String(b.stockNumber).trim() === String(row.stockNumber).trim());
      if (!balance) {
        this.warningMessage = `لا يوجد رصيد مطابق لرقم الصنف: ${row.stockNumber}`;
        console.log('DEBUG: No matching balance for', row.stockNumber);
        return;
      }
      if (row.quantity > balance.quantityAvailable) {
        this.warningMessage = `الكمية المطلوبة (${row.quantity}) أكبر من المتوفر (${balance.quantityAvailable}) للصنف: ${row.stockNumber}`;
        console.log('DEBUG: Quantity exceeds available', row.quantity, balance.quantityAvailable);
        return;
      }
    }
    // Check for unique receiptNumber
    const receiptNumber = this.dispatchForm.get('receiptNumber')?.value;
    if (this.dispatches.some(d => String(d.receiptNumber).trim() === String(receiptNumber).trim())) {
      this.warningMessage = 'رقم السند مستخدم من قبل. يرجى إدخال رقم سند فريد.';
      console.log('DEBUG: Duplicate receiptNumber', receiptNumber);
      return;
    }
    this.loading = true;
    // Read file as base64
    let fileBase64: string = '';
    try {
      fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject('تعذر قراءة ملف الإيصال.');
        reader.readAsDataURL(this.selectedFile as Blob);
      });
    } catch (err) {
      this.warningMessage = String(err);
      this.loading = false;
      console.log('DEBUG: File read error', err);
      return;
    }
    // Save each item row as a dispatch and update openingBalances
    const savePromises = this.itemsRows.map(async (row, idx) => {
      // Update opening balance
      const balance = this.openingBalances.find(b => String(b.stockNumber).trim() === String(row.stockNumber).trim());
      if (balance) {
        const newBalance = { ...balance, quantityAvailable: balance.quantityAvailable - row.quantity };
        try {
          await this.http.put(`http://localhost:3000/openingBalances/${balance.id}`, newBalance).toPromise();
          console.log(`DEBUG: Updated opening balance for row ${idx}`, newBalance);
        } catch (err) {
          console.log(`DEBUG: Error updating opening balance for row ${idx}`, err);
        }
      }
      // Save dispatch
      const dispatchData = {
        unitName: this.dispatchForm.get('unitName')?.value,
        receiverName: this.dispatchForm.get('receiverName')?.value,
        receiptNumber,
        itemName: row.itemName,
        stockNumber: row.stockNumber,
        quantity: row.quantity,
        serialNumber: row.serialNumbers.filter((s: string) => s).join(','),
        status: 'completed',
        receipt: fileBase64,
        date: this.formatDateToISOString(this.dispatchForm.get('date')?.value) // Format as ISO string
      };
      try {
        await this.http.post('http://localhost:3000/dispatches', dispatchData).toPromise();
        console.log(`DEBUG: Saved dispatch for row ${idx}`, dispatchData);
      } catch (err) {
        console.log(`DEBUG: Error saving dispatch for row ${idx}`, err);
      }
    });
    try {
      await Promise.all(savePromises);
      this.successMessage = 'تم الصرف بنجاح!';
      this.dispatchForm.reset();
      this.itemsRows = [{ itemName: '', stockNumber: '', quantity: 1, serialNumbers: [] }];
      this.dispatchForm.get('quantity')?.setValue(1);
      this.selectedFile = null;
      this.loading = false;
      this.loadOpeningBalances();
      this.loadDispatches();
      console.log('DEBUG: All dispatches saved successfully');
    } catch (err) {
      this.warningMessage = typeof err === 'string' ? err : 'حدث خطأ أثناء حفظ بيانات الصرف.';
      this.loading = false;
      console.log('DEBUG: Error in savePromises', err);
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
