import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ReturnsService } from '../../services/returns.service';

@Component({
  selector: 'app-transfer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.css']
})
export class TransferComponent implements OnInit {
  units: any[] = [];
  fromUnit: any = null;
  newReceiver: string = '';
  expenses: any[] = [];
  groupedItems: any[] = [];
  fileToUpload: File | null = null;
  successMessage: string = '';
  transfers: any[] = [];
  recipients: any[] = [];
  itemsList: any[] = [];
  selectedReceiverOption: string = '';
  customReceiver: string = '';
  existingReceivers: string[] = [];
  globalTransferDate: string = '';
  isSubmitting: boolean = false;
  dateForm: FormGroup;

  constructor(private transferService: ReturnsService, private fb: FormBuilder) {
    this.dateForm = this.fb.group({
      day: ['', [Validators.required, Validators.min(1), Validators.max(31)]],
      month: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
      year: ['', [Validators.required, Validators.min(1900), Validators.max(2100)]],
    });
  }
  getFullDate(): string {
    const { day, month, year } = this.dateForm.value;
    return `${day}.${month}.${year}`;
  }
  ngOnInit() {
    const today = new Date();
    this.globalTransferDate = this.formatGregorianDate(today);

    this.loadUnits();
    this.loadTransfers();
    this.recipients = [];
    this.existingReceivers = [];
  }

  formatGregorianDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  loadUnits() {
    this.transferService.getUnits().subscribe(units => this.units = units);
  }

  loadTransfers() {
    this.transferService.getTransfers().subscribe(data => this.transfers = data);
  }

  onUnitNameChange(event: any): void {
    const selectedUnitName = event?.target?.value || '';
    const selectedUnit = this.units.find(unit => unit.unitName === selectedUnitName);

    if (selectedUnit && Array.isArray(selectedUnit.recipients)) {
      this.recipients = [...selectedUnit.recipients];
      this.existingReceivers = [...selectedUnit.recipients];
    } else {
      this.recipients = [];
      this.existingReceivers = [];
    }

    this.selectedReceiverOption = '';
    this.customReceiver = '';
  }

  onUnitChange() {
    this.groupedItems = [];

    if (this.fromUnit) {
      const unitName = this.fromUnit.unitName || this.fromUnit.name || this.fromUnit;
      const unit = this.units.find(u => u.unitName === unitName);
      this.existingReceivers = unit?.recipients || [];

      this.transferService.getExpensesbyunitName(unitName).subscribe(items => {
        this.expenses = items;

        const assignedItems = items.flatMap(expense =>
          (expense.items || []).map((item: any) => ({
            ...item,
            expenseId: expense.id,
            unitName: expense.unitName,
            receiver: expense.receiver,
            oldReceiver: expense.receiver,
            selected: false,
            newQuantity: item.quantity,
            originalQuantity: item.quantity,
            date: expense.date || null
          }))
        );

        this.groupAssignedItemsByDate(assignedItems);
      });
    }
  }
  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.fileToUpload = file;
      console.log('تم اختيار الملف:', file.name);
    }
  }
  async onSubmit() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      // بناء التاريخ من الفورم
      if (this.dateForm.invalid) {
        alert('من فضلك أدخل تاريخ صحيح');
        this.isSubmitting = false;
        return;
      }
      const { day, month, year } = this.dateForm.value;
      const transferDate = `${day}/${month}/${year}`;

      this.newReceiver = this.selectedReceiverOption === 'other'
        ? this.customReceiver.trim()
        : this.selectedReceiverOption;

      if (!this.newReceiver.trim()) {
        alert('يرجى إدخال اسم المستلم الجديد');
        this.isSubmitting = false;
        return;
      }

      const selectedGroups = this.groupedItems.filter(g =>
        g.items.some((i: any) => i.selected && i.newQuantity > 0)
      );
      if (selectedGroups.length === 0) {
        alert('اختر على الأقل صنف واحد للمناقلة');
        this.isSubmitting = false;
        return;
      }

      let fileBase64: string | null = null;
      if (this.fileToUpload) {
        fileBase64 = await this.convertFileToBase64(this.fileToUpload);
      }

      const requests = [];

      for (const group of selectedGroups) {
        for (const item of group.items) {
          if (!item.selected || item.newQuantity <= 0) continue;

          const req$ = this.transferService.getExpenseById(item.expenseId).pipe(
            switchMap(expense => {
              if (!expense || !expense.items) return [];

              // تعديل اسم المستلم
              expense.receiver = this.newReceiver;

              // تحديث الكمية للصنف المختار فقط
              const targetItem = expense.items.find((it: any) => it.itemName === item.itemName);
              if (targetItem) {
                targetItem.quantity = item.newQuantity;
              }

              return this.transferService.updateExpense(item.expenseId, expense);
            })
          );
          requests.push(req$);

          // تسجيل المناقلة
          const transferLog = {
            id: this.generateId(),
            unitName: group.unitName,
            receiverName: this.newReceiver,
            oldReceiver: group.receiver || '-',
            items: [{
              itemName: item.itemName,
              quantity: item.newQuantity
            }],
            date: transferDate,
            file: fileBase64 || null
          };
          requests.push(this.transferService.addTransfer(transferLog));
        }
      }

      forkJoin(requests).subscribe({
        next: () => {
          this.successMessage = 'تمت المناقلة بنجاح!';
          this.onUnitChange();
          this.loadTransfers();
          this.resetForm();
        },
        error: (err) => {
          console.error(err);
          alert('حدث خطأ أثناء الحفظ');
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء الحفظ');
      this.isSubmitting = false;
    }
  }


  resetForm() {
    this.newReceiver = '';
    this.fileToUpload = null;
    this.selectedReceiverOption = '';
    this.customReceiver = '';
    this.globalTransferDate = '';
    this.groupedItems.forEach(g => g.selected = false);
  }

  convertFileToBase64(file: File): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  generateId(): string {
    return Math.random().toString(36).substr(2, 6);
  }

  get hasSelectedItems(): boolean {
    return this.groupedItems && this.groupedItems.some(g => g.selected);
  }

  getFilteredTransfers() {
    return this.transfers.map(transfer => ({
      unitName: transfer.unitName,
      receiverName: transfer.receiverName,
      oldReceiver: transfer.oldReceiver || '-',
      items: transfer.items || [],
      transferDate: transfer.date,
      file: transfer.file
    }));
  }

  getCurrentRecipients(): string[] {
    if (!this.fromUnit) return [];
    const unitName = this.fromUnit.name || this.fromUnit.unitName || this.fromUnit;
    const unit = this.units.find(u => u.unitName === unitName);
    return unit && unit.recipients ? unit.recipients : [];
  }

  groupAssignedItemsByDate(items: any[]) {
    const grouped: any[] = [];

    items.forEach(item => {
      const key = (item.unitName || '') + '_' + (item.date || '') + '_' + (item.receiver || '');
      let group = grouped.find(g => g.key === key);

      if (group) {
        group.items.push(item);
      } else {
        grouped.push({
          key,
          unitName: item.unitName,
          date: item.date,
          receiver: item.receiver,
          items: [item],
          selected: false
        });
      }
    });

    this.groupedItems = grouped;
  }
}
