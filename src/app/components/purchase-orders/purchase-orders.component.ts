import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import '@angular/compiler';
import { CommonModule, NgFor } from '@angular/common';


import { AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
    schemas: [NO_ERRORS_SCHEMA],
  imports: [HttpClientModule,CommonModule,NgFor,ReactiveFormsModule],
  templateUrl: './purchase-orders.component.html',
  styleUrls: ['./purchase-orders.component.css']
})
export class PurchaseOrdersComponent {
  orderForm: FormGroup;
  submitted = false;
  orders: any[] = [];

  orderTypes = [
    { label: 'تعميد', value: 'Order' },
    { label: 'دعم', value: 'Support' },
    { label: 'أخرى', value: 'Other' }
  ];

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.orderForm = this.fb.group({
      orderType: ['', Validators.required],
      orderNumber: ['', Validators.required],
      items: this.fb.array([this.createItemGroup()])
    });
    this.loadOrders();
  }

  get items(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  createItemGroup(): FormGroup {
    return this.fb.group({
      itemName: ['', Validators.required],
      stockNumber: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      serialNumbers: [''] // Optional
    });
  }

  addItem() {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

isLoading = false;

loadOrders() {
  this.isLoading = true;
  this.http.get<any[]>('http://localhost:3000/orders').subscribe({
    next: (data) => {
      this.orders = data;
      this.isLoading = false;
    },
    error: (err) => {
      this.isLoading = false;
      // error handling
    }
  });
}

  onSubmit() {
    this.submitted = true;
    console.log('Form submitted', this.orderForm.value, this.orderForm.valid);
    if (this.orderForm.invalid) {
      console.log('Form invalid', this.orderForm.errors, this.orderForm.value);
      return;
    }
    const order = this.orderForm.value;
    console.log('Attempting POST to backend...', order);
    this.http.post('http://localhost:3000/orders', order).subscribe({
      next: (res) => {
        console.log('POST success', res);
        this.loadOrders();
        this.orderForm.reset();
        this.orderForm.setControl('items', this.fb.array([this.createItemGroup()]));
        this.submitted = false;
      },
      error: err => {
        alert('حدث خطأ أثناء حفظ التعاميد');
        console.error('POST error', err);
      }
    });
  }

  getOrderTypeLabel(value: string): string {
    const found = this.orderTypes.find(t => t.value === value);
    return found ? found.label : value;
  }
}
