import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Item {
  itemName: string;
  stockNumber: string;
}

@Component({
  selector: 'app-item-entry',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  templateUrl: './item-entry.component.html',
  styleUrls: ['./item-entry.component.css']
})
export class ItemEntryComponent {
  itemForm: FormGroup;
  items: Item[] = [];
  submitted = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.itemForm = this.fb.group({
      itemName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      stockNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$'), this.duplicateStockNumberValidator.bind(this)]]
    });
    this.loadItems();
  }

  get f() {
    return this.itemForm.controls;
  }

  loadItems() {
    console.log('Loading items from backend...');
    this.http.get<Item[]>('http://localhost:3000/items').subscribe({
      next: (data) => {
        console.log('Items loaded:', data);
        this.items = data;
        this.drawItemsChart();
      },
      error: err => {
        console.error('Error loading items:', err);
      }
    });
  }

  drawItemsChart() {
    setTimeout(() => {
      const w = window as any;
      if (w.Chart) {
        const canvas = document.getElementById('itemsChart') as HTMLCanvasElement | null;
        const ctx = canvas ? canvas.getContext('2d') : null;
        if (ctx) {
          new w.Chart(ctx, {
            type: 'bar',
            data: {
              labels: this.items.map(i => i.itemName),
              datasets: [{
                label: 'رقم الصنف',
                data: this.items.map(i => parseInt(i.stockNumber)),
                backgroundColor: '#4f8cff'
              }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
          });
        }
      }
    }, 0);
  }

  duplicateStockNumberValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const exists = this.items.some(item => item['stockNumber'] === control.value);
    if (exists) {
      console.log('Duplicate stock number detected:', control.value);
    }
    return exists ? { duplicate: true } : null;
  }

  onSubmit() {
    this.submitted = true;
    console.log('Form submitted', this.itemForm.value, this.itemForm.valid);
    if (this.itemForm.invalid) {
      console.log('Form invalid', this.itemForm.errors, this.itemForm.value);
      return;
    }
    const { itemName, stockNumber } = this.itemForm.value;
    console.log('Attempting POST to backend...', { itemName, stockNumber });
    this.http.post<Item>('http://localhost:3000/items', { itemName, stockNumber }).subscribe({
      next: (res) => {
        console.log('POST success', res);
        this.loadItems(); // Reload from backend
        this.itemForm.reset();
        this.submitted = false;
        this.f['stockNumber'].updateValueAndValidity();
      },
      error: err => {
        alert('حدث خطأ أثناء إضافة الصنف.');
        console.error('POST error', err);
      }
    });
  }
}
