import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-returns',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  templateUrl: './returns.component.html',
  styleUrls: ['./returns.component.css']
})
export class ReturnsComponent implements OnInit {
  returnsForm!: FormGroup;
  availableItems: any[] = [];
  availableUnits: any[] = [];
  uploadedFile: string | null = null;
  returns: any[] = [];
  recipients: any[] = []; // Add recipients array

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.returnsForm = this.fb.group({
      unitName: ['', Validators.required],
      receiverName: [{ value: '', disabled: true }], // Disable receiverName by default
      receipt: [null],
      items: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]]
    });

    this.loadItemsAndUnits();
    this.loadReturns();
  }

  loadItemsAndUnits(): void {
    this.http.get<any[]>('http://localhost:3000/units').subscribe(data => {
      this.availableUnits = data; // Store full unit objects
      console.log('DEBUG: Loaded Units:', this.availableUnits); // Debugging log
    }, error => {
      console.error('Error loading units:', error);
    });

    this.http.get<any[]>('http://localhost:3000/items').subscribe(data => {
      this.availableItems = data.map((item: { itemName: string }) => item.itemName);
      console.log('DEBUG: Loaded Items:', this.availableItems); // Debugging log
    }, error => {
      console.error('Error loading items:', error);
    });
  }

  loadReturns(): void {
    this.http.get<any>('http://localhost:3000/returns').subscribe(data => {
      this.returns = data;
    }, error => {
      console.error('Error loading returns:', error);
    });
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.returnsForm.patchValue({ receipt: file });
    }
  }

  onUnitChange() {
    const selectedUnitName = this.returnsForm.get('unitName')?.value?.trim(); // Trim whitespace
    const selectedUnit = this.availableUnits.find(unit => unit.unitName?.trim() === selectedUnitName); // Compare unitName property
    console.log('DEBUG: Selected Unit Name:', selectedUnitName); // Debugging log
    console.log('DEBUG: Available Units:', this.availableUnits); // Debugging log
    console.log('DEBUG: Selected Unit:', selectedUnit); // Debugging log
    if (selectedUnit && selectedUnit.recipients) {
      console.log('DEBUG: Recipients:', selectedUnit.recipients); // Debugging log
      this.recipients = selectedUnit.recipients; // Ensure recipients are correctly populated
      this.returnsForm.get('receiverName')?.enable(); // Enable receiverName dropdown
      this.returnsForm.get('receiverName')?.setValidators([Validators.required]);
      this.returnsForm.get('receiverName')?.updateValueAndValidity();
    } else {
      console.log('DEBUG: No valid recipients found for the selected unit.'); // Debugging log
      this.recipients = []; // Clear recipients if no valid unit is selected
      this.returnsForm.get('receiverName')?.disable(); // Disable receiverName dropdown
      this.returnsForm.get('receiverName')?.clearValidators();
      this.returnsForm.get('receiverName')?.updateValueAndValidity();
    }
  }

  onSubmit(): void {
    const formData = this.returnsForm.value;
    const file: File = formData.receipt;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (file && validTypes.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Receipt = reader.result as string;

        const returnEntry = {
          unitName: formData.unitName,
          receiverName: formData.receiverName,
          receipt: base64Receipt,
          items: formData.items,
          quantity: formData.quantity
        };

        this.http.post('http://localhost:3000/returns', returnEntry).subscribe(response => {
          alert('تم حفظ البيانات بنجاح');
          this.uploadedFile = base64Receipt;
          this.returnsForm.reset();
          this.loadReturns(); // Refresh the returns list
        }, error => {
          alert('حدث خطأ أثناء حفظ البيانات');
          console.error('خطأ أثناء حفظ البيانات:', error);
        });
      };

      reader.readAsDataURL(file);
    } else {
      alert('يرجى إرفاق ملف بصيغة PDF أو صورة (JPG/PNG)');
    }
  }
}
