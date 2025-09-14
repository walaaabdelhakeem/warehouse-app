import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ReturnsService } from '../../services/returns.service';

@Component({
  selector: 'app-returns',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './returns.component.html',
  styleUrls: ['./returns.component.css']
})
export class ReturnsComponent implements OnInit {
  returnsForm!: FormGroup;
  availableItems: any[] = [];
  availableUnits: any[] = [];
  uploadedFile: string | null = null;
  returns: any[] = [];
  recipients: any[] = [];
  expenses: any[] = [];

  constructor(private fb: FormBuilder, private returnsService: ReturnsService) {}

  ngOnInit(): void {
    this.returnsForm = this.fb.group({
      unitName: ['', Validators.required],
      receiverName: ['', Validators.required],
      receipt: [null],
      items: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]],
      reason: ['', Validators.required]
    });

    this.loadExpenses();
    this.loadReturns();
  }

  // ✅ تحميل المصروفات
  loadExpenses(): void {
    this.returnsService.getExpenses().subscribe(data => {
      this.expenses = data;
      const uniqueUnits = Array.from(new Set(data.map(e => e.unitName)));
      this.availableUnits = uniqueUnits.map(unitName => ({ unitName }));
    });
  }

  // ✅ تحميل آخر 10 إرجاعات فقط
  loadReturns(): void {
    this.returnsService.getReturns().subscribe(data => {
      this.returns = data.slice(-10).reverse();
    });
  }

  onUnitChange(): void {
    const selectedUnit = this.returnsForm.get('unitName')?.value;
    const unitExpenses = this.expenses.filter(e => e.unitName === selectedUnit);
    this.recipients = [...new Set(unitExpenses.map(e => e.receiver))];
    this.availableItems = [];
    this.returnsForm.patchValue({ items: '', quantity: '' });
  }

  onReceiverChange(): void {
    const unit = this.returnsForm.get('unitName')?.value;
    const receiver = this.returnsForm.get('receiverName')?.value;
    const expenses = this.expenses.filter(e => e.unitName === unit && e.receiver === receiver);
    this.availableItems = expenses.flatMap(e => e.items);
  }

  onItemChange(): void {
    const itemName = this.returnsForm.get('items')?.value;
    const selectedItem = this.availableItems.find(i => i.itemName === itemName);
    if (selectedItem) {
      this.returnsForm.patchValue({ quantity: selectedItem.quantity });
    }
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) this.returnsForm.patchValue({ receipt: file });
  }

  // ✅ تنفيذ الإرجاع
  onSubmit(): void {
    const formData = this.returnsForm.value;
    const file: File = formData.receipt;
    let returnedQty = +formData.quantity;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Receipt = file ? (reader.result as string) : null;
      const requests = [];

      const matchingExpenses = this.expenses.filter(e =>
        e.unitName === formData.unitName &&
        e.receiver === formData.receiverName &&
        e.items.some((i: any) => i.itemName === formData.items)
      );

      for (const expense of matchingExpenses) {
        for (const item of expense.items) {
          if (item.itemName === formData.items && returnedQty > 0) {
            const deduct = Math.min(returnedQty, item.quantity);
            item.quantity -= deduct;
            returnedQty -= deduct;

            if (item.quantity <= 0) {
              expense.items = expense.items.filter((i: any) => i.itemName !== formData.items);
            }
          }
        }

        if (expense.items.length === 0) {
          requests.push(this.returnsService.deleteExpense(expense.id));
        } else {
          requests.push(this.returnsService.updateExpense(expense.id, expense));
        }
        if (returnedQty <= 0) break;
      }

      if (returnedQty > 0) {
        alert('❌ الكمية أكبر من المصروفات');
        return;
      }

      const returnEntry = {
        unitName: formData.unitName,
        receiverName: formData.receiverName,
        receipt: base64Receipt,
        items: formData.items,
        quantity: +formData.quantity,
        disposeReason: formData.reason
      };

      // أولاً أضف الإرجاع
      requests.unshift(this.returnsService.addReturn(returnEntry));

      forkJoin(requests).subscribe({
        next: () => {
          alert('✅ تم الإرجاع');
          this.returnsForm.reset();
          this.uploadedFile = base64Receipt;
          this.loadReturns();
          this.loadExpenses();
        }
      });
    };
    if (file) reader.readAsDataURL(file);
  }

  // ✅ إلغاء الإرجاع
  cancelReturn(returnItem: any): void {
    const requests = [];
    requests.push(this.returnsService.deleteReturn(returnItem.id));

    let expense = this.expenses.find(e =>
      e.unitName === returnItem.unitName && e.receiver === returnItem.receiverName
    );

    if (expense) {
      const item = expense.items.find((i: any) => i.itemName === returnItem.items);
      if (item) {
        item.quantity += returnItem.quantity;
      } else {
        expense.items.push({ itemName: returnItem.items, quantity: returnItem.quantity });
      }
      requests.push(this.returnsService.updateExpense(expense.id, expense));
    } else {
      const newExpense = {
        unitName: returnItem.unitName,
        receiver: returnItem.receiverName,
        items: [{ itemName: returnItem.items, quantity: returnItem.quantity }]
      };
      requests.push(this.returnsService.addExpense(newExpense));
    }

    forkJoin(requests).subscribe({
      next: () => {
        alert('✅ تم إلغاء الإرجاع');
        this.loadReturns();
        this.loadExpenses();
      }
    });
  }
}
