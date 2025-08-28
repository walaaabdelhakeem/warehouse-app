import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import '@angular/compiler';
import { CommonModule, NgFor } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [HttpClientModule, CommonModule, NgFor, ReactiveFormsModule],
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
      supplierName: ['', Validators.required], // اسم المورد required
      date: ['', Validators.required], // تاريخ التعاميد
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
      serialNumbers.push(this.fb.control(null)); 
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
        this.orders =  data.sort((a: any, b: any) =>
  new Date(b.date).getTime() - new Date(a.date).getTime());// Show newest first
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
    // 1. Get raw values to include disabled fields like stockNumber
    const rawOrder = this.orderForm.getRawValue();

    // 2. Assign stockNumber manually into order object
    const order = {
      ...rawOrder,
      items: rawOrder.items.map((item: any, index: number) => ({
        ...item,
        // Ensure quantity is number
        quantity: Number(item.quantity || 0),
        serialNumbers: (item.serialNumbers || []).map((sn: any) => Number(sn)),
        
      }))
    };

    // تأكد من تحويل كل serialNumbers من string إلى number
    order.items.forEach((item: any) => {
      item.serialNumbers = item.serialNumbers.map((sn: any) => Number(sn));
    });

    // Use user-selected date
    // order.date = new Date().toISOString(); // REMOVE this line
    // اسم المورد is already included in order object
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
const openingBalances = await firstValueFrom(this.http.get<any[]>('http://localhost:3000/openingBalances'));

  for (const item of order.items) {
    const serialsArray = (item.serialNumbers || []).map((sn:any) => String(sn));

    const balance = (openingBalances || []).find(b => b.itemName === item.itemName);

    if (balance) {
      const updated = {
        ...balance,
        quantityAvailable: Number(balance.quantityAvailable || 0) + Number(item.quantity || 0),
        serialNumbers: [...(balance.serialNumbers || []), ...serialsArray],
        linkedToOrder: true,
        orderNumber: order.orderNumber   // ✅ إضافة رقم الأمر هنا
      };

      await firstValueFrom(
        this.http.put(`http://localhost:3000/openingBalances/${balance.id}`, updated)
      );    } else {
      const newBalance = {
        stockNumber: item.stockNumber || '',
        itemName: item.itemName,
        quantityAvailable: Number(item.quantity || 0),
        serialNumbers: serialsArray,
        linkedToOrder: true,
        orderNumber: order.orderNumber   // ✅ إضافة رقم الأمر هنا
      };
  await firstValueFrom(
        this.http.post('http://localhost:3000/openingBalances', newBalance)
      );    }
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
