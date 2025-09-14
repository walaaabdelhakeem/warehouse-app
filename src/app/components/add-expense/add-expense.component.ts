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
  existingDocumentNumbers: string[] = [];
  customReceiver: string = ''; // إضافة متغير لحفظ اسم المستلم الجديد
  globalTransferDate: string = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.addExpenseForm = this.fb.group({
      unitName: ['', [Validators.required]],
      items: this.fb.array([]),
      receiver: ['', [Validators.required]],
      type: ['', [Validators.required]],
      documentNumber: ['', [this.documentNumberValidator.bind(this)]],
      attachment: [null, [Validators.required]],
      newReceiver: [''], // أضف هذا الحقل هنا

      dateForm: this.fb.group({
        day: ['', [Validators.required, Validators.min(1), Validators.max(31)]],
        month: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
        year: ['', [Validators.required, Validators.min(1900), Validators.max(2100)]],
      })
    });

  }
  getFullDate(): string {
    const { day, month, year } = this.addExpenseForm.get('dateForm')?.value;
    return `${day}.${month}.${year}`;
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
    const today = new Date();
    this.globalTransferDate = this.formatGregorianDate(today);

    this.loadExpenses(); // Load expenses from db.json on initialization
    this.fetchUnits();
    this.fetchItems();
  }
  formatGregorianDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  private addNewRecipient(newReceiver: string): void {
    const selectedUnitName = this.addExpenseForm.get('unitName')?.value;
    const selectedUnit = this.availableUnits.find(unit => unit.unitName === selectedUnitName);

    if (selectedUnit) {
      if (!Array.isArray(selectedUnit.recipients)) {
        selectedUnit.recipients = [];
      }

      if (!selectedUnit.recipients.includes(newReceiver)) {
        selectedUnit.recipients.push(newReceiver);
        this.http.put(`http://localhost:3000/units/${selectedUnit.id}`, selectedUnit).subscribe({
          next: () => {
            // تحديث قائمة المستلمين المعروضة
            this.recipients = [...selectedUnit.recipients];
          },
          error: (err) => console.error('Error updating recipients:', err)
        });
      }
    }
  }
  saveExpense(): void {
    const selectedType = this.addExpenseForm.get('type')?.value;
    const selectedReceiver = this.addExpenseForm.get('receiver')?.value;

    // ✅ بناء التاريخ من الفورم (day/month/year)
    if ((this.addExpenseForm.get('dateForm') as FormGroup).invalid) {
      alert('من فضلك أدخل تاريخ صحيح');
      return;
    }

    const { day, month, year } = this.addExpenseForm.get('dateForm')?.value;
    // التاريخ للتخزين (yyyy-MM-dd) عشان الفرز يشتغل
    const dbDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // التحقق من اسم المستلم إذا تم اختيار "آخر"
    if (selectedReceiver === 'other') {
      const newReceiver = this.addExpenseForm.get('newReceiver')?.value?.trim();
      if (!newReceiver) {
        alert('يرجى إدخال اسم المستلم الجديد');
        return;
      }
      this.addNewRecipient(newReceiver);
      this.addExpenseForm.get('receiver')?.setValue(newReceiver);
    }

    if (['مناقله', 'نموذج صرف', 'اخرى'].includes(selectedType)) {
      if (this.items.length === 0) {
        alert('يرجى إضافة عنصر واحد على الأقل.');
        return;
      }

      if (this.addExpenseForm.valid) {
        const newExpense = this.addExpenseForm.value;
        newExpense.date = dbDate;

        this.http.post('http://localhost:3000/expenses', newExpense).subscribe({
          next: () => {
            this.successMessage = 'تم إضافة المصروف بنجاح';
            this.resetForm();
            this.loadExpenses();
            setTimeout(() => this.successMessage = '', 3000);
          },
          error: (err) => {
            this.errorMessage = 'حدث خطأ أثناء إضافة المصروف';
            console.error('Error saving expense:', err);
            setTimeout(() => this.errorMessage = '', 3000);
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
      next: (data) => {
        // ترتيب من الأحدث للأقدم
        this.expenses = data
          .map(exp => ({
            ...exp,
            displayDate: this.formatDateToDDMMYYYY(
              new Date(exp.date).getDate(),
              new Date(exp.date).getMonth() + 1,
              new Date(exp.date).getFullYear()
            )
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


        this.existingDocumentNumbers = this.expenses
          .filter(exp => exp.type === 'نموذج صرف' && exp.documentNumber)
          .map(exp => exp.documentNumber.toString());
      },
      error: (err) => console.error('Error loading expenses from db.json:', err)
    });
  }
  documentNumberValidator(control: AbstractControl): ValidationErrors | null {
    const selectedType = this.addExpenseForm?.get('type')?.value;
    const enteredNumber = control.value?.toString().trim();

    if (selectedType === 'نموذج صرف' && this.existingDocumentNumbers.includes(enteredNumber)) {
      return { duplicateDocumentNumber: true };
    }

    return null;
  }

  resetForm(): void {
    this.addExpenseForm.reset({
      unitName: '',
      newReceiver: '',
      items: this.fb.array([]),
      receiver: '',
      type: '',
      documentNumber: '',
      attachment: null,
      dateForm: {
        day: '',
        month: '',
        year: ''
      }
    });
  }


  onUnitChange() {
    const selectedUnitName = this.addExpenseForm.get('unitName')?.value;
    const selectedUnit = this.availableUnits.find(unit => unit.unitName === selectedUnitName);

    if (selectedUnit) {
      // التأكد من وجود مصفوفة recipients
      if (!Array.isArray(selectedUnit.recipients)) {
        selectedUnit.recipients = [];
      }

      this.recipients = [...selectedUnit.recipients];
      this.addExpenseForm.get('receiver')?.enable();
      this.addExpenseForm.get('receiver')?.setValidators([Validators.required]);
      this.addExpenseForm.get('receiver')?.updateValueAndValidity();
    } else {
      this.recipients = [];
      this.addExpenseForm.get('receiver')?.disable();
      this.addExpenseForm.get('receiver')?.clearValidators();
      this.addExpenseForm.get('receiver')?.updateValueAndValidity();
    }

  }

  onTypeChange() {
    const selectedType = this.addExpenseForm.get('type')?.value;
    const docControl = this.addExpenseForm.get('documentNumber');

    if (selectedType === 'نموذج صرف') {
      docControl?.enable();
      docControl?.setValidators([
        Validators.required,
        this.documentNumberValidator.bind(this)
      ]);
    } else {
      docControl?.disable();
      docControl?.clearValidators();
    }

    docControl?.updateValueAndValidity();
  }

  async updateOpeningBalancesAfterExpense(items: any[]) {
    const openingBalances = await this.http.get<any[]>('http://localhost:3000/openingBalances').toPromise();

    for (const item of items) {
      const matched = openingBalances?.find(b => b.itemName === item.itemName);
      if (matched) {
        const updatedBalance = {
          ...matched,
          quantityAvailable: Math.max(0, Number(matched.quantityAvailable || 0) - Number(item.quantity || 0))
        };
        await this.http.put(`http://localhost:3000/openingBalances/${matched.id}`, updatedBalance).toPromise();
      }
    }
  }

  formatDateToDDMMYYYY(day: number, month: number, year: number): string {
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const yyyy = String(year);
    return `${dd}/${mm}/${yyyy}`;
  }

}
