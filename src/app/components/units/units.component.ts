import { Component } from '@angular/core';
import { FormBuilder,FormArray , FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, NgFor } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import '@angular/compiler';


interface Unit {
  id?: string;
  unitName: string;
  unitNumber: string;
}

@Component({
  selector: 'app-units',
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [HttpClientModule,CommonModule,NgFor,ReactiveFormsModule],
  templateUrl: './units.component.html',
  styleUrls: ['./units.component.css']
})
export class UnitsComponent {
  unitForm: FormGroup;
  units: Unit[] = [];
  submitted = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.unitForm = this.fb.group({
      unitName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      unitNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$'), this.duplicateUnitNumberValidator.bind(this)]]
    });
    this.loadUnits();
  }

  get f() {
    return this.unitForm.controls;
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

  duplicateUnitNumberValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const exists = this.units.some(unit => unit['unitNumber'] === control.value);
    return exists ? { duplicate: true } : null;
  }

  onSubmit() {
    this.submitted = true;
    if (this.unitForm.invalid) return;
    const { unitName, unitNumber } = this.unitForm.value;
    this.saveUnit({ unitName, unitNumber });
    this.unitForm.reset();
    this.submitted = false;
    this.f['unitNumber'].updateValueAndValidity();
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
}
