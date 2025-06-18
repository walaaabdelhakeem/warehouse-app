import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
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
  imports: [HttpClientModule, CommonModule, NgFor, ReactiveFormsModule],
  templateUrl: './units.component.html',
  styleUrls: ['./units.component.css']
})
export class UnitsComponent {
  unitForm: FormGroup;
  units: Unit[] = [];
  submitted = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.unitForm = this.fb.group({
      unitName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]]
      // unitNumber removed
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
    // Find the max unitNumber and increment
    let maxUnitNumber = 0;
    if (this.units.length > 0) {
      maxUnitNumber = Math.max(...this.units.map(u => +u.unitNumber || 0));
    }
    unit.unitNumber = (maxUnitNumber + 1).toString();
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
    return null; // No longer needed
  }

  onSubmit() {
    this.submitted = true;
    if (this.unitForm.invalid) return;
    const { unitName } = this.unitForm.value;
    // Pass empty string for unitNumber, will be set in saveUnit
    this.saveUnit({ unitName, unitNumber: '' });
    this.unitForm.reset();
    this.submitted = false;
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
