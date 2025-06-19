import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormArray } from '@angular/forms';

@Component({
  selector: 'app-add-expense',
   standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  templateUrl: './add-expense.component.html',
  styleUrls: ['./add-expense.component.css']
})
export class AddExpenseComponent implements OnInit {
  addExpenseForm: FormGroup;
  expenses: any[] = [];
  availableItems: any[] = [];
  availableUnits: any[] = [];
  recipients: any[] = []; // Added recipients array
  successMessage: string = ''; // Success message property
  errorMessage: string = ''; // Error message property

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.addExpenseForm = this.fb.group({
      unitName: ['', [Validators.required]],
      items: this.fb.array([]),
      receiver: ['', [Validators.required]],
      type: ['', [Validators.required]],
      documentNumber: [''], // Made optional
      attachment: [null, [Validators.required]]
    });
  }

  get items() {
    return this.addExpenseForm.get('items') as FormArray;
  }

  addItem(item: any): void {
    this.items.push(this.fb.group({
      itemName: [item.itemName, [Validators.required]],
      quantity: [null, [Validators.required, Validators.min(1)]]
    }));
  }

  fetchItems(): void {
    this.http.get<any[]>('http://localhost:3000/items').subscribe({
      next: (data) => this.availableItems = data,
      error: (err) => console.error('Error fetching items:', err)
    });
  }

  fetchUnits(): void {
    this.http.get<any[]>('http://localhost:3000/units').subscribe({
      next: (data) => this.availableUnits = data,
      error: (err) => console.error('Error fetching units:', err)
    });
  }

  handleFileInput(event: any): void {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.addExpenseForm.patchValue({ attachment: reader.result });
    };
    reader.readAsDataURL(file);
  }

  ngOnInit(): void {
    this.loadExpenses(); // Load expenses from db.json on initialization
    this.fetchUnits();
    this.fetchItems();
  }

  saveExpense(): void {
    const selectedType = this.addExpenseForm.get('type')?.value;
    console.log('DEBUG: Selected Type:', selectedType); // Debugging log
    if (['مناقله', 'نموذج صرف', 'اخرى'].includes(selectedType)) {
      if (this.addExpenseForm.valid) {
        const newExpense = this.addExpenseForm.value;
        this.http.post('http://localhost:3000/expenses', newExpense).subscribe({
          next: () => {
            this.expenses.push(newExpense); // Append new expense to the table
            this.successMessage = 'تم إضافة المصروف بنجاح'; // Success message
            this.resetForm();
            setTimeout(() => this.successMessage = '', 3000); // Clear message after 3 seconds
          },
          error: (err) => {
            this.errorMessage = 'حدث خطأ أثناء إضافة المصروف'; // Error message
            console.error('Error saving expense to db.json:', err);
            setTimeout(() => this.errorMessage = '', 3000); // Clear message after 3 seconds
          }
        });
      } else {
        alert('يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح.');
      }
    } else {
      alert('يرجى اختيار نوع صحيح للمصروف.');
    }
  }

  loadExpenses(): void {
    this.http.get<any[]>('http://localhost:3000/expenses').subscribe({
      next: (data) => this.expenses = data,
      error: (err) => console.error('Error loading expenses from db.json:', err)
    });
  }

  resetForm(): void {
    this.addExpenseForm.reset({
      unitName: '',
      items: this.fb.array([]),
      receiver: '',
      type: '',
      documentNumber: '',
      attachment: null
    });
  }

  onUnitChange() {
    const selectedUnitName = this.addExpenseForm.get('unitName')?.value;
    const selectedUnit = this.availableUnits.find(unit => unit.unitName === selectedUnitName);
    console.log('DEBUG: Selected Unit:', selectedUnit); // Debugging log
    if (selectedUnit && Array.isArray(selectedUnit.recipients)) {
      console.log('DEBUG: Recipients:', selectedUnit.recipients); // Debugging log
      this.recipients = [...selectedUnit.recipients]; // Ensure recipients are correctly populated
      this.addExpenseForm.get('receiver')?.enable(); // Enable receiver dropdown
      this.addExpenseForm.get('receiver')?.setValidators([Validators.required]);
      this.addExpenseForm.get('receiver')?.updateValueAndValidity();
    } else {
      console.log('DEBUG: No valid recipients found for the selected unit.'); // Debugging log
      this.recipients = []; // Clear recipients if no valid unit is selected
      this.addExpenseForm.get('receiver')?.disable(); // Disable receiver dropdown
      this.addExpenseForm.get('receiver')?.clearValidators();
      this.addExpenseForm.get('receiver')?.updateValueAndValidity();
    }
  }

  onTypeChange() {
    const selectedType = this.addExpenseForm.get('type')?.value;
    if (selectedType === 'Regular') {
      this.addExpenseForm.get('documentNumber')?.enable(); // Enable documentNumber field
      this.addExpenseForm.get('documentNumber')?.setValidators([Validators.required]);
      this.addExpenseForm.get('documentNumber')?.updateValueAndValidity();
    } else {
      this.addExpenseForm.get('documentNumber')?.disable(); // Disable documentNumber field
      this.addExpenseForm.get('documentNumber')?.clearValidators();
      this.addExpenseForm.get('documentNumber')?.updateValueAndValidity();
    }
  }
}
