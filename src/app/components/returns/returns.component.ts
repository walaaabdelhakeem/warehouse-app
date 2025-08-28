// returns.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, firstValueFrom } from 'rxjs';
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
  isProcessing = false;

  constructor(private fb: FormBuilder, private returnsService: ReturnsService) {}

  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
  }

  private initForm(): void {
    this.returnsForm = this.fb.group({
      unitName: ['', Validators.required],
      receiverName: ['', Validators.required],
      receipt: [null],
      items: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]],
      reason: ['', Validators.required]
    });
  }

  private loadInitialData(): void {
    forkJoin({
      expenses: this.returnsService.getExpensesSummary(),
      returns: this.returnsService.getReturnsPaginated()
    }).subscribe({
      next: (data) => {
        this.expenses = data.expenses;
        this.returns = data.returns;
        this.initUnits();
      },
      error: (error) => console.error('Error loading data:', error)
    });
  }

  private initUnits(): void {
    const uniqueUnits = Array.from(new Set(this.expenses.map(e => e.unitName)));
    this.availableUnits = uniqueUnits.map(unitName => ({ unitName }));
  }

  onUnitChange(): void {
    const unit = this.returnsForm.get('unitName')?.value;
    const unitExpenses = this.expenses.filter(e => e.unitName === unit);
    this.recipients = [...new Set(unitExpenses.map(e => e.receiverName))];
  }

  onReceiverChange(): void {
    const unit = this.returnsForm.get('unitName')?.value;
    const receiver = this.returnsForm.get('receiverName')?.value;
    const expenses = this.expenses.filter(e => e.unitName === unit && e.receiverName === receiver);
    this.availableItems = expenses.flatMap(e => e.items);
  }

  onItemChange(): void {
    // ممكن تحط أي لوجيك إضافي هنا
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.uploadedFile = reader.result as string;
      this.returnsForm.patchValue({ receipt: file });
    };
    reader.readAsDataURL(file);
  }

  async onSubmit(): Promise<void> {
    if (this.returnsForm.invalid) {
      alert('❌ يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    this.isProcessing = true;
    const formData = this.returnsForm.value;

    try {
      const base64Receipt = formData.receipt
        ? await this.readFileAsBase64(formData.receipt)
        : null;

      const matchingExpenses = await firstValueFrom(
        this.returnsService.getMatchingExpenses(formData.unitName, formData.receiverName, formData.items)
      );

      if (!matchingExpenses || matchingExpenses.length === 0) {
        alert('❌ لا توجد مصروفات مطابقة');
        return;
      }

      const totalAvailableQty = this.calculateTotalQuantity(matchingExpenses, formData.items);
      const returnedQty = +formData.quantity;

      if (returnedQty > totalAvailableQty) {
        alert(`❌ الكمية (${returnedQty}) أكبر من المصروفات المتاحة (${totalAvailableQty})`);
        return;
      }

      const batchData = this.prepareBatchData(formData, matchingExpenses, returnedQty, base64Receipt);

     this.returnsService.processReturnBatch(batchData).subscribe({
  next: () => {
    alert('✅ تم الإرجاع بنجاح');
    this.resetForm();
    this.loadInitialData();
  },
  error: (error) => {
    console.error('Error processing return:', error);
    alert('❌ حدث خطأ أثناء عملية الإرجاع');
  },
  complete: () => {
    this.isProcessing = false;
  }
});


    } catch (error) {
      console.error('Error in onSubmit:', error);
      alert('❌ حدث خطأ غير متوقع');
      this.isProcessing = false;
    }
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private calculateTotalQuantity(expenses: any[], itemName: string): number {
    return expenses.reduce((total, expense) => {
      const item = expense.items.find((i: any) => i.itemName === itemName);
      return total + (item ? item.quantity : 0);
    }, 0);
  }

  private prepareBatchData(formData: any, expenses: any[], returnedQty: number, receipt: string | null): any {
    const expenseUpdates = [];
    const expenseDeletions = [];
    let remainingQty = returnedQty;

    for (const expense of expenses) {
      if (remainingQty <= 0) break;

      const itemIndex = expense.items.findIndex((i: any) => i.itemName === formData.items);
      if (itemIndex === -1) continue;

      const item = expense.items[itemIndex];
      const deduct = Math.min(remainingQty, item.quantity);

      item.quantity -= deduct;
      remainingQty -= deduct;

      if (item.quantity <= 0) {
        expense.items.splice(itemIndex, 1);
      }

      if (expense.items.length === 0) {
        expenseDeletions.push(expense.id);
      } else {
        expenseUpdates.push({ id: expense.id, data: expense });
      }
    }

    return {
      returnData: {
        unitName: formData.unitName,
        receiverName: formData.receiverName,
        receipt: receipt,
        items: formData.items,
        quantity: returnedQty,
        disposeReason: formData.reason,
        date: new Date().toISOString()
      },
      expenseUpdates,
      expenseDeletions
    };
  }

  private resetForm(): void {
    this.returnsForm.reset();
    this.uploadedFile = null;
    this.availableItems = [];
    this.recipients = [];
  }

  cancelReturn(returnItem: any): void {
    if (!confirm('هل أنت متأكد من إلغاء هذا الإرجاع؟')) return;

    this.returnsService.cancelReturnBatch({
      returnId: returnItem.id,
      expenseData: {
        unitName: returnItem.unitName,
        receiverName: returnItem.receiverName,
        items: [{ itemName: returnItem.items, quantity: returnItem.quantity }]
      }
    }).subscribe({
      next: () => {
        alert('✅ تم إلغاء الإرجاع');
        this.loadInitialData();
      },
      error: (error) => {
        console.error('Error canceling return:', error);
        alert('❌ حدث خطأ أثناء إلغاء الإرجاع');
      }
    });
  }
}
