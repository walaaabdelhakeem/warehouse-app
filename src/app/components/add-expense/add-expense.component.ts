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

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.addExpenseForm = this.fb.group({
      unitName: ['', [Validators.required]],
      items: this.fb.array([]),
      receiver: ['', [Validators.required]],
      type: ['', [Validators.required]],
      documentNumber: ['', [Validators.required]],
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
    this.loadExpenses();
    this.fetchUnits();
    this.fetchItems();
  }

  saveExpense(): void {
    if (this.addExpenseForm.valid) {
      const newExpense = this.addExpenseForm.value;
      this.expenses.push(newExpense);
      localStorage.setItem('addExpenses', JSON.stringify(this.expenses));
      this.resetForm();
    } else {
      alert('Please fill out all required fields correctly.');
    }
  }

  loadExpenses(): void {
    const storedExpenses = localStorage.getItem('addExpenses');
    this.expenses = storedExpenses ? JSON.parse(storedExpenses) : [];
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
}
