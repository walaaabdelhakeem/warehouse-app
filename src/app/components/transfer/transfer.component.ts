import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-transfer',
   standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.css']
})
export class TransferComponent implements OnInit {
  units: any[] = [];
  fromUnit: any = null;
  newReceiver: string = '';
  assignedItems: any[] = [];
  fileToUpload: File | null = null;
  successMessage: string = '';
  allTransfers: any[] = [];
  private apiUrl = 'http://localhost:3000'; // json-server endpoint

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUnits();
    this.loadAllTransfers();
  }

  loadUnits() {
    this.http.get<any[]>(`${this.apiUrl}/units`).subscribe(units => {
      this.units = units;
    });
  }

  loadAllTransfers() {
    this.http.get<any[]>(`${this.apiUrl}/dispatches`).subscribe(data => {
      this.allTransfers = data;
    });
  }

  onUnitChange() {
    this.assignedItems = [];
    if (this.fromUnit) {
      const unitName = this.fromUnit.name || this.fromUnit.unitName || this.fromUnit;
      this.http.get<any[]>(`${this.apiUrl}/dispatches?unitName=${encodeURIComponent(unitName)}&status=completed`).subscribe(items => {
        this.assignedItems = items.map(item => ({ ...item, selected: false }));
      });
    }
  }

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.fileToUpload = event.target.files[0];
    }
  }

  onSubmit() {
    const selectedItems = this.assignedItems.filter(item => item.selected);
    if (selectedItems.length === 0) { return; }
    // Simulate transfer by PATCHing each selected dispatch record (json-server limitation)
    const requests = selectedItems.map(item => {
      const updated = { ...item, receiverName: this.newReceiver };
      return this.http.patch(`${this.apiUrl}/dispatches/${item.id}`, updated).toPromise();
    });
    Promise.all(requests).then(() => {
      this.successMessage = 'تمت المناقلة بنجاح!';
      this.onUnitChange();
      this.newReceiver = '';
      this.fileToUpload = null;
      this.loadAllTransfers(); // Refresh all transfers after save
      setTimeout(() => this.successMessage = '', 4000);
    });
  }

  getCurrentRecipients(): string[] {
    if (!this.fromUnit) return [];
    const unitName = this.fromUnit.name || this.fromUnit.unitName || this.fromUnit;
    const unit = this.units.find(u => u.unitName === unitName);
    return unit && unit.recipients ? unit.recipients : [];
  }

  get hasSelectedItems(): boolean {
    return this.assignedItems && this.assignedItems.some(i => i.selected);
  }
}
