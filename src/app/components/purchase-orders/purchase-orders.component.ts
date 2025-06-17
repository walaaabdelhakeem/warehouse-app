import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-purchase-orders',
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

  loadOrders() {
    this.http.get<any[]>('http://localhost:3000/orders').subscribe(data => {
      this.orders = data;
    });
  }

  onSubmit() {
    this.submitted = true;
    if (this.orderForm.invalid) return;
    const order = this.orderForm.value;
    this.http.post('http://localhost:3000/orders', order).subscribe({
      next: () => {
        this.loadOrders();
        this.orderForm.reset();
        this.orderForm.setControl('items', this.fb.array([this.createItemGroup()]));
        this.submitted = false;
      },
      error: err => {
        alert('حدث خطأ أثناء حفظ التعاميد');
        console.error(err);
      }
    });
  }
}
