import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import html2pdf from 'html2pdf.js';
@Component({
  selector: 'app-timeline-report',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  templateUrl: './timeline-report.component.html',
  styleUrls: ['./timeline-report.component.css']
})
export class TimelineReportComponent implements OnInit {
  items: any[] = [];
  units: any[] = [];
  allData: any[] = [];
  filteredData: any[] = [];
  selectedItems: string[] = [];
  selectedUnits: string[] = [];
  fromDate: string = '';
  toDate: string = '';
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchItemsAndUnits();
    this.fetchAllData();
  }

  fetchItemsAndUnits() {
    // Get all units and their items from expenses
    this.http.get<any[]>('http://localhost:3000/expenses').subscribe(expenses => {
      const unitSet = new Set<string>();
      const itemSet = new Set<string>();
      expenses.forEach(e => {
        if (e.unitName) { unitSet.add(e.unitName); }
        if (Array.isArray(e.items)) {
          e.items.forEach((item: any) => {
            if (item.itemName) { itemSet.add(item.itemName); }
          });
        }
      });
      this.units = Array.from(unitSet).map(unitName => ({ unitName }));
      this.items = Array.from(itemSet).map(itemName => ({ itemName }));
    });
  }

  fetchAllData() {
    this.loading = true;
    this.http.get<any[]>('http://localhost:3000/expenses').toPromise().then(expenses => {
      // Normalize all data to {unitName, itemName, quantity, date}
      const all: any[] = [];
      (expenses || []).forEach(e => {
        if (Array.isArray(e.items)) {
          e.items.forEach((item: any) => {
            all.push({
              unitName: e.unitName,
              itemName: item.itemName,
              quantity: item.quantity,
              date: e.date
            });
          });
        }
      });
      this.allData = all;
      this.applyFilters();
      this.loading = false;
    });
  }

  applyFilters() {
    let data = this.allData;
    if (this.fromDate) {
      data = data.filter(d => d.date && d.date >= this.fromDate);
    }
    if (this.toDate) {
      data = data.filter(d => d.date && d.date <= this.toDate);
    }
    if (this.selectedItems.length > 0) {
      data = data.filter(d => this.selectedItems.includes(d.itemName));
    }
    if (this.selectedUnits.length > 0) {
      data = data.filter(d => this.selectedUnits.includes(d.unitName));
    }
    // Group by unitName, then by itemName, sum quantity
    const grouped: any = {};
    data.forEach(d => {
      if (!grouped[d.unitName]) { grouped[d.unitName] = {}; }
      if (!grouped[d.unitName][d.itemName]) { grouped[d.unitName][d.itemName] = 0; }
      grouped[d.unitName][d.itemName] += Number(d.quantity) || 0;
    });
    // Convert to array for table rendering
    this.filteredData = Object.keys(grouped).map((unit, i) => {
      return {
        unitName: unit,
        items: Object.keys(grouped[unit]).map(item => ({
          itemName: item,
          total: grouped[unit][item]
        }))
      };
    });
  }

  downloadPDF() {
    const element = document.getElementById('timeline-report-print');
    if (!element) { return; }
    const opt = {
      margin: 0.5,
      filename: 'timeline-report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  }

  today(): Date {
    return new Date();
  }
}
