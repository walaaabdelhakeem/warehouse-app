import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-returns',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  templateUrl: './returns.component.html',
  styleUrls: ['./returns.component.css']
})
export class ReturnsComponent implements OnInit {
  returnsForm!: FormGroup;
  availableItems: any[] = [];
  availableUnits: any[] = [];
  uploadedFile: string | null = null;
  returns: any[] = [];
  recipients: any[] = []; // Add recipients array
  expenses: any[] = [];
  filteredExpenses: any[] = [];

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.returnsForm = this.fb.group({
      unitName: ['', Validators.required],
      receiverName: [{ value: '', disabled: true }], // Disable receiverName by default
      receipt: [null],
      items: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]]
    });

    this.loadItemsAndUnits();
    this.loadReturns();
    this.loadExpenses();
  }

  // Remove items loading from units/items endpoints, only use expenses for items
  loadItemsAndUnits(): void {
    this.http.get<any[]>('http://localhost:3000/units').subscribe(data => {
      // Do not set availableItems here
      this.availableUnits = data;
    }, error => {
      console.error('Error loading units:', error);
    });
  }

  loadReturns(): void {
    this.http.get<any>('http://localhost:3000/returns').subscribe(data => {
      this.returns = data;
    }, error => {
      console.error('Error loading returns:', error);
    });
  }

  loadExpenses(): void {
    this.http.get<any[]>('http://localhost:3000/expenses').subscribe(data => {
      this.expenses = data;
      // Only show units that exist in expenses
      const uniqueUnits = Array.from(new Set(data.map(e => e.unitName)));
      this.availableUnits = uniqueUnits.map(unitName => ({ unitName }));
    }, error => {
      console.error('Error loading expenses:', error);
    });
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.returnsForm.patchValue({ receipt: file });
    }
  }

  onUnitChange() {
    const selectedUnitName = (this.returnsForm.get('unitName')?.value || '').toString().trim();
    console.log('DEBUG: onUnitChange selectedUnitName =', selectedUnitName);
    // Only show units that exist in expenses (case-insensitive, trimmed)
    const unitExpenses = this.expenses.filter(e =>
      (e.unitName?.toString().trim().toLowerCase() || '') === selectedUnitName.toLowerCase()
    );
    console.log('DEBUG: onUnitChange unitExpenses =', unitExpenses);
    // Collect all unique receivers from expenses, trimmed and case-insensitive
    const expenseRecipients = Array.from(
      new Set(
        unitExpenses
          .map(e => (e.receiver?.toString().trim() || ''))
          .filter(r => r)
          .map(r => r.toLowerCase())
      )
    ).map(lowerR => {
      // Find the first matching receiver in original case
      const orig = unitExpenses.find(e => (e.receiver?.toString().trim().toLowerCase() || '') === lowerR);
      return orig ? orig.receiver.toString().trim() : lowerR;
    });
    console.log('DEBUG: onUnitChange expenseRecipients =', expenseRecipients);
    if (expenseRecipients.length > 0) {
      this.recipients = expenseRecipients;
      this.returnsForm.get('receiverName')?.enable();
      this.returnsForm.get('receiverName')?.setValidators([Validators.required]);
      this.returnsForm.get('receiverName')?.updateValueAndValidity();
    } else {
      this.recipients = [];
      this.returnsForm.get('receiverName')?.disable();
      this.returnsForm.get('receiverName')?.clearValidators();
      this.returnsForm.get('receiverName')?.updateValueAndValidity();
    }
    // Clear items and quantity until receiver is selected
    this.availableItems = [];
    this.returnsForm.patchValue({ items: '', quantity: '' });
    console.log('DEBUG: onUnitChange availableItems cleared');
  }

  onReceiverChange() {
    const selectedUnitNameRaw = this.returnsForm.get('unitName')?.value;
    const selectedReceiverRaw = this.returnsForm.get('receiverName')?.value;
    // Show a message in the console when a receiver is chosen
    console.log('=== Receiver selection changed ===');
    console.log('You chose receiver:', selectedReceiverRaw, 'for unit:', selectedUnitNameRaw);
    const selectedUnitName = (selectedUnitNameRaw || '').toString().trim().toLowerCase();
    const selectedReceiver = (selectedReceiverRaw || '').toString().trim().toLowerCase();
    this.availableItems = [];
    if (!selectedUnitName || !selectedReceiver) {
      console.log('DEBUG: No unit or receiver selected');
      this.returnsForm.patchValue({ items: '', quantity: '' });
      return;
    }
    // Find all expenses for this unit and receiver (case-insensitive, trimmed)
    const expenses = this.expenses.filter(e => {
      const eUnit = (e.unitName?.toString().trim().toLowerCase() || '');
      const eReceiver = (e.receiver?.toString().trim().toLowerCase() || '');
      return eUnit === selectedUnitName && eReceiver === selectedReceiver;
    });
    const allItems = expenses.flatMap(e => Array.isArray(e.items) ? e.items : []);
    this.availableItems = allItems.map((i: any) => ({ itemName: i.itemName, quantity: i.quantity }));
    // Show the items in the console
    console.log('Available items for this receiver:', this.availableItems);
    if (this.availableItems.length === 1) {
      this.returnsForm.patchValue({
        items: this.availableItems[0].itemName,
        quantity: this.availableItems[0].quantity
      });
      console.log('DEBUG: Auto-selected item:', this.availableItems[0]);
    } else {
      this.returnsForm.patchValue({ items: '', quantity: '' });
      console.log('DEBUG: Multiple or no items, cleared selection');
    }
  }

  onItemChange() {
    // When an item is selected, set its quantity automatically
    const selectedItemName = (this.returnsForm.get('items')?.value || '').toString().trim().toLowerCase();
    console.log('DEBUG: onItemChange selectedItemName =', selectedItemName);
    const selectedItem = this.availableItems.find((i: any) => (i.itemName || '').toString().trim().toLowerCase() === selectedItemName);
    console.log('DEBUG: onItemChange selectedItem =', selectedItem);
    if (selectedItem) {
      this.returnsForm.patchValue({ quantity: selectedItem.quantity });
      console.log('DEBUG: onItemChange quantity set to', selectedItem.quantity);
    } else {
      this.returnsForm.patchValue({ quantity: '' });
      console.log('DEBUG: onItemChange quantity cleared');
    }
  }

  onSubmit(): void {
    console.log('onSubmit called');
    const formData = this.returnsForm.value;
    const file: File = formData.receipt;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (file && validTypes.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Receipt = reader.result as string;

        const returnEntry = {
          unitName: formData.unitName,
          receiverName: formData.receiverName,
          receipt: base64Receipt,
          items: formData.items,
          quantity: formData.quantity
        };

        this.http.post('http://localhost:3000/returns', returnEntry).subscribe(response => {
          alert('تم حفظ البيانات بنجاح');
          this.uploadedFile = base64Receipt;
          this.returnsForm.reset();
          this.loadReturns(); // Refresh the returns list
        }, error => {
          alert('حدث خطأ أثناء حفظ البيانات');
          console.error('خطأ أثناء حفظ البيانات:', error);
        });
      };

      reader.readAsDataURL(file);
    } else {
      alert('يرجى إرفاق ملف بصيغة PDF أو صورة (JPG/PNG)');
    }
  }
}
