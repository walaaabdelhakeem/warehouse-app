import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-disposal',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  templateUrl: './disposal.component.html',
  styleUrls: ['./disposal.component.css']
})
export class DisposalComponent implements OnInit {
  units: any[] = [];
  receivers: any[] = [];
  items: any[] = [];
  assignedItems: any[] = [];
  returns: any[] = [];
  filteredReturns: any[] = [];
  selectedUnit: any = null;
  selectedReceiver: any = null;
  selectedItem: any = null;
  quantity: number = 1;
  reason: string = '';
  fileToUpload: File | null = null;
  successMessage: string = '';
  private apiUrl = 'http://localhost:3000';
  reportType: string = '';
  reportData: any[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadReturns();
  }

  loadReturns() {
    this.http.get<any[]>(`${this.apiUrl}/returns`).subscribe((data: any[]) => {
      this.returns = data;
      // Only units found in returns
      const uniqueUnits = Array.from(new Set(data.map(r => r.unitName)));
      this.units = uniqueUnits.map(unitName => ({ unitName }));
    });
  }
  get disposedReturns() {
    return this.returns.filter(r => r.disposed);
  }

  onUnitChange() {
    this.selectedReceiver = null;
    this.receivers = [];
    this.items = [];
    this.selectedItem = null;
    if (this.selectedUnit) {
      // Receivers from returns for this unit
      this.receivers = Array.from(new Set(this.returns.filter(r => r.unitName === (this.selectedUnit.unitName || this.selectedUnit)).map(r => r.receiverName)));
      // Items from returns for this unit (all items, regardless of receiver)
      const unitName = this.selectedUnit.unitName || this.selectedUnit;
      this.items = this.returns
        .filter(r => r.unitName === unitName && r.quantity > 0);
    }
    this.filterReturns();
  }

  onReceiverChange() {
    // Items from returns for this unit and receiver
    if (this.selectedUnit && this.selectedReceiver) {
      const unitName = this.selectedUnit.unitName || this.selectedUnit;
      // Get all items (with name and quantity) for this unit and receiver
      this.items = this.returns
        .filter(r =>
          r.unitName === unitName &&
          r.receiverName === this.selectedReceiver &&
          r.disposed_quantity > 0 // 👈 هنا الشرط اللي يمنع العناصر بصفر
        );
      ; // Use the full return object so all fields are available
    } else {
      this.items = [];
    }
    this.selectedItem = null;
    this.filterReturns();
  }

  filterReturns() {
    if (this.selectedUnit) {
      const unitName = this.selectedUnit.unitName || this.selectedUnit;
      this.filteredReturns = this.returns.filter(r => r.unitName === unitName);
    } else {
      this.filteredReturns = [];
    }
  }

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.fileToUpload = event.target.files[0];
    }
  }

  onSubmit() {
    if (!this.selectedUnit || !this.selectedReceiver || !this.selectedItem || !this.quantity || !this.fileToUpload) {
      return;
    }

    const updated = {
      ...this.selectedItem,
      disposed_quantity: this.selectedItem.disposed_quantity - this.quantity,
      disposed: true,
      disposeReason: this.reason
    };

    this.http.patch(`${this.apiUrl}/returns/${this.selectedItem.id}`, updated).subscribe(() => {
      // ✅ حدّث العنصر في القائمة المحلية this.returns مباشرة
      const index = this.returns.findIndex(r => r.id === this.selectedItem.id);
      if (index !== -1) {
        this.returns[index] = updated;
      }

      // ✅ تحديث الجدول مباشرة
      this.filterReturns();

      this.successMessage = 'تم الإسقاط بنجاح!';
      this.selectedReceiver = null;
      this.selectedItem = null;
      this.quantity = 1;
      this.reason = '';
      this.fileToUpload = null;

      setTimeout(() => this.successMessage = '', 4000);
    }, error => {
      console.error('Disposal PATCH error:', error);
      this.successMessage = 'حدث خطأ أثناء الإسقاط!';
      setTimeout(() => this.successMessage = '', 4000);
    });
  }


  onItemChange() {
    // Automatically set quantity based on selected item
    if (this.selectedItem) {
      this.quantity = this.selectedItem.disposed_quantity;
      console.log('DEBUG: Selected item:', this.selectedItem, 'Auto-set quantity:', this.quantity);
    } else {
      this.quantity = 1;
      console.log('DEBUG: No item selected, quantity reset to 1');
    }
  }

  // Add this method to filter expenses by type
  onReportTypeChange(type: string) {
    this.reportType = type;
    this.http.get<any[]>(`${this.apiUrl}/expenses`).subscribe(data => {
      if (type === 'order') {
        this.reportData = data.filter(e => e.type === 'order');
      } else if (type === 'support') {
        this.reportData = data.filter(e => e.type === 'support');
      } else if (type === 'taameed') {
        this.reportData = data.filter(e => e.type === 'taameed');
      } else {
        this.reportData = [];
      }
    });
  }

  exportReportToPDF() {
    // Simple export using window.print for demo; replace with html2pdf or jsPDF for real PDF export
    window.print();
  }
}
