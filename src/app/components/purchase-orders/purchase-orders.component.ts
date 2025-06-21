import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import '@angular/compiler';
import { CommonModule, NgFor } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
    schemas: [NO_ERRORS_SCHEMA],
  imports: [HttpClientModule,CommonModule,NgFor,ReactiveFormsModule],
  templateUrl: './purchase-orders.component.html',
  styleUrls: ['./purchase-orders.component.css']
})
export class PurchaseOrdersComponent implements OnInit {
  orderForm: FormGroup;
  submitted = false;
  orders: any[] = [];
  itemsList: any[] = [];

  orderTypes = [
    { label: 'تعميد', value: 'Order' },
    { label: 'امر شراء', value: 'Support' },
    { label: 'دعم ', value: 'Other' }
  ];

  // Add file upload support
  selectedFile: File | null = null;
  uploadedFileUrl: string = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.orderForm = this.fb.group({
      orderType: ['', Validators.required],
      orderNumber: ['', Validators.required],
      items: this.fb.array([this.createItemGroup()])
    });
    this.loadOrders();
    this.fetchItemsList();
  }

  ngOnInit() {
    // For standalone component lifecycle
    this.fetchItemsList();
  }

  get items(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  fetchItemsList() {
    this.http.get<any[]>('http://localhost:3000/items').subscribe({
      next: (data) => {
        this.itemsList = data;
      },
      error: (err) => {
        // handle error
      }
    });
  }

  createItemGroup(): FormGroup {
    return this.fb.group({
      itemName: ['', Validators.required],
      stockNumber: [{ value: '', disabled: true }, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      serialNumbers: this.fb.array([])
    });
  }

  addItem() {
    const group = this.createItemGroup();
    this.items.push(group);
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  onItemNameChange(itemGroup: FormGroup) {
    const itemName = itemGroup.get('itemName')?.value;
    const found = this.itemsList.find(i => i.itemName === itemName);
    if (found) {
      itemGroup.get('stockNumber')?.setValue(found.stockNumber);
    } else {
      itemGroup.get('stockNumber')?.setValue('');
    }
  }

  onQuantityChange(itemGroup: FormGroup) {
    const quantity = itemGroup.get('quantity')?.value;
    const serialNumbers = itemGroup.get('serialNumbers') as FormArray;
    serialNumbers.clear();
    for (let i = 0; i < quantity; i++) {
      serialNumbers.push(this.fb.control(''));
    }
  }

  getSerialNumbers(itemGroup: FormGroup): FormArray {
    return itemGroup.get('serialNumbers') as FormArray;
  }

  isLoading = false;

  loadOrders() {
    this.isLoading = true;
    this.http.get<any[]>('http://localhost:3000/orders').subscribe({
      next: (data) => {
        this.orders = data.reverse(); // Show newest first
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        // error handling
      }
    });
  }

  async onSubmit() {
    this.submitted = true;
    if (this.orderForm.invalid) {
      return;
    }
    const order = this.orderForm.value;
    // Save order as before
    const saveOrder = () => {
      this.http.post('http://localhost:3000/orders', order).subscribe({
        next: async (res) => {
          // After saving order, update openingBalances
          await this.updateOpeningBalancesWithOrder(order);
          this.loadOrders();
          this.orderForm.reset();
          this.orderForm.setControl('items', this.fb.array([this.createItemGroup()]));
          this.selectedFile = null;
          this.submitted = false;
        },
        error: err => {
          alert('حدث خطأ أثناء حفظ التعاميد');
          console.error('POST error', err);
        }
      });
    };
    if (this.selectedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        order.file = reader.result as string;
        order.fileName = this.selectedFile?.name;
        saveOrder();
      };
      reader.readAsDataURL(this.selectedFile);
    } else {
      saveOrder();
    }
  }

  async updateOpeningBalancesWithOrder(order: any) {
    // For each item in the order, update the corresponding opening balance
    const openingBalances = await this.http.get<any[]>('http://localhost:3000/openingBalances').toPromise();
    for (const item of order.items) {
      // Find by itemName (not just stockNumber)
      const balance = (openingBalances || []).find(b => b.itemName === item.itemName);
      if (balance) {
        // Only add the new entered quantity to the current quantityAvailable
        const updated = { ...balance, quantityAvailable: Number(balance.quantityAvailable || 0) + Number(item.quantity || 0) };
        await this.http.put(`http://localhost:3000/openingBalances/${balance.id}`, updated).toPromise();
      } else {
        // If not found, create a new opening balance for this item
        const newBalance = {
          stockNumber: item.stockNumber || '',
          itemName: item.itemName,
          quantityAvailable: Number(item.quantity || 0),
          serialNumbers: '',
          linkedToOrder: true
        };
        await this.http.post('http://localhost:3000/openingBalances', newBalance).toPromise();
      }
    }
  }

  // Add file upload support
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  uploadFile(orderId: string) {
    if (!this.selectedFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result as string;
      // Save fileData (base64) in db.json for the order
      this.http.patch(`http://localhost:3000/orders/${orderId}`, { file: fileData, fileName: this.selectedFile?.name }).subscribe({
        next: () => {
          this.loadOrders();
          this.selectedFile = null;
        },
        error: err => {
          alert('حدث خطأ أثناء رفع الملف.');
          console.error('File upload error', err);
        }
      });
    };
    reader.readAsDataURL(this.selectedFile);
  }

  getFileUrl(order: any): string | null {
    if (order.file && order.fileName) {
      return order.file;
    }
    return null;
  }

  getOrderTypeLabel(value: string): string {
    const found = this.orderTypes.find(t => t.value === value);
    return found ? found.label : value;
  }
}
