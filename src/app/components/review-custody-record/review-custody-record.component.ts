import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-review-custody-record',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-custody-record.component.html',
  styleUrls: ['./review-custody-record.component.css']
})
export class ReviewCustodyRecordComponent implements OnInit {
  records: any[] = [];
  recordToDelete: string | null = null;
  originalRecordData: any = {};
  showDeleteModal = false;

  constructor(private custodyService: DataService) {}

  ngOnInit() {
    this.loadRecords();
  }

  loadRecords() {
    this.custodyService.getRecords().subscribe({
      next: (data) => {
        this.records = data.map(record => ({
          ...record,
          editing: false
        }));
      },
      error: (err) => console.error('Error loading records:', err)
    });
  }

  startEditing(record: any) {
    this.originalRecordData = { ...record };
    record.editing = true;
  }

  cancelEditing(record: any) {
    Object.assign(record, this.originalRecordData);
    record.editing = false;
  }

  saveChanges(record: any) {
    this.custodyService.updateRecord(record.id, {
      notes: record.notes,
      date: record.date
    }).subscribe({
      next: () => {
        record.editing = false;
        this.loadRecords();
      },
      error: (err) => console.error('Error updating record:', err)
    });
  }

  confirmDelete(id: string) {
    this.recordToDelete = id;
    this.showDeleteModal = true;
  }

  closeModal() {
    this.showDeleteModal = false;
    this.recordToDelete = null;
  }

  deleteRecord() {
    if (!this.recordToDelete) return;

    this.custodyService.deleteRecord(this.recordToDelete).subscribe({
      next: () => {
        this.loadRecords();
        this.closeModal();
      },
      error: (err) => console.error('Error deleting record:', err)
    });
  }

  viewFile(base64Data: string) {
    if (!base64Data) {
      console.error('لا يوجد ملف لعرضه');
      return;
    }

    try {
      // استخراج النوع
      const mimeType = base64Data.substring(
        base64Data.indexOf(':') + 1,
        base64Data.indexOf(';')
      );

      // فك base64
      const byteCharacters = atob(base64Data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      // فتح الملف زي PurchaseOrdersComponent
      window.open(blobUrl, '_blank');

    } catch (error) {
      console.error('خطأ أثناء عرض الملف:', error);
    }
  }
}
