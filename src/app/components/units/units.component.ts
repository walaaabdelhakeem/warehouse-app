import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
  FormArray
} from '@angular/forms';
import { CommonModule, NgFor } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

interface Unit {
  id?: string;
  unitName: string;
  unitNumber: string;
  recipients?: string[];
}

@Component({
  selector: 'app-units',
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [HttpClientModule, CommonModule, NgFor, ReactiveFormsModule],
  templateUrl: './units.component.html',
  styleUrls: ['./units.component.css']
})
export class UnitsComponent implements OnInit {
  unitForm: FormGroup;
  units: Unit[] = [];
  submitted = false;
  recipientFields: string[] = [];

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.unitForm = this.fb.group({
      unitName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      unitNumber: ['', [Validators.required, Validators.min(1)]],
      recipientCount: [0, [Validators.required, Validators.min(1)]],
      recipients: this.fb.array([])
    });
    this.loadUnits();
  }

  ngOnInit(): void {
    // already initialized in constructor
  }

  get f() {
    return this.unitForm.controls;
  }

  get recipientsFormArray() {
    return this.unitForm.get('recipients') as FormArray;
  }

  onRecipientCountChange(): void {
    const count = +this.unitForm.get('recipientCount')?.value || 0;
    const recipientsArray = this.recipientsFormArray;

    while (recipientsArray.length < count) {
      recipientsArray.push(this.fb.control('', Validators.required));
    }

    while (recipientsArray.length > count) {
      recipientsArray.removeAt(recipientsArray.length - 1);
    }
  }

  loadUnits() {
    this.http.get<Unit[]>('http://localhost:3000/units').subscribe({
      next: (data) => {
        this.units = data;
      },
      error: err => {
        console.error('Error loading units:', err);
      }
    });
  }

saveUnit(unit: Unit) {
  let nextUnitNumber = '1'; // القيمة الافتراضية
  
  if (this.units.length > 0) {
const unitNumbers = this.units
  .map(u => parseInt(u.unitNumber || '0', 10))
  .filter(num => !isNaN(num)); // شيل أي قيم مش أرقام

const maxUnitNumber = unitNumbers.length > 0 ? Math.max(...unitNumbers) : 0;

nextUnitNumber = (maxUnitNumber + 1).toString();

  }

  unit.unitNumber = nextUnitNumber;

  this.http.post<Unit>('http://localhost:3000/units', unit).subscribe({
    next: () => {
      this.loadUnits();
    },
    error: err => {
      alert('حدث خطأ أثناء إضافة الوحدة.');
      console.error('POST error', err);
    }
  });
}
  deleteUnit(index: number) {
    const unit = this.units[index];
    if (unit && unit.id) {
      this.http.delete(`http://localhost:3000/units/${unit.id}`).subscribe({
        next: () => this.loadUnits(),
        error: err => {
          alert('حدث خطأ أثناء حذف الوحدة.');
          console.error('DELETE error', err);
        }
      });
    }
  }

 
editIndex: number | null = null; // عشان نعرف هل احنا في وضع تعديل

editUnit(index: number) {
  const unit = this.units[index];
  this.editIndex = index;

  this.unitForm.patchValue({
    unitName: unit.unitName,
    unitNumber: unit.unitNumber,
    recipientCount: unit.recipients ? unit.recipients.length : 0
  });

  this.recipientsFormArray.clear();
  if (unit.recipients && unit.recipients.length > 0) {
    unit.recipients.forEach(name => {
      this.recipientsFormArray.push(this.fb.control(name, Validators.required));
    });
  }
}

updateUnit() {
  if (this.editIndex === null) return;

  const unit = this.units[this.editIndex];
  const updatedUnit = {
    ...unit,
    unitName: this.unitForm.value.unitName,
    unitNumber: this.unitForm.value.unitNumber,
    recipients: this.recipientsFormArray.value
  };

  this.http.put(`http://localhost:3000/units/${unit.id}`, updatedUnit).subscribe({
    next: () => {
      alert('تم تعديل الوحدة بنجاح');
      this.loadUnits();
      this.unitForm.reset();
      this.recipientsFormArray.clear();
      this.editIndex = null;
    },
    error: err => {
      alert('حدث خطأ أثناء تعديل الوحدة.');
      console.error(err);
    }
  });
}

onSubmit(): void {
  if (this.editIndex !== null) {
    this.updateUnit(); // لو في وضع تعديل
    return;
  }

  // لو في وضع إضافة
  const formData = this.unitForm.value;
  const recipients = this.recipientsFormArray.controls.map(control => control.value).filter((name: string) => name && name.trim() !== '');
  
  const unitNumbers = this.units
    .map(u => parseInt(u.unitNumber || '0', 10))
    .filter(num => !isNaN(num));
  const maxUnitNumber = unitNumbers.length > 0 ? Math.max(...unitNumbers) : 0;
  const nextUnitNumber = (maxUnitNumber + 1).toString();

  const newUnit = {
    unitName: formData.unitName,
    unitNumber: nextUnitNumber,
    recipients
  };

  this.http.post('http://localhost:3000/units', newUnit).subscribe(response => {
    alert('تم حفظ بيانات الوحدة بنجاح');
    this.unitForm.reset();
    this.recipientsFormArray.clear();
    this.loadUnits();
  }, error => {
    alert('حدث خطأ أثناء حفظ بيانات الوحدة');
    console.error('Error saving unit:', error);
  });
}

}
