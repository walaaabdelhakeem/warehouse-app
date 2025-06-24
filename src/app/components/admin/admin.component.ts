import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin',

     imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],

  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  users: any[] = [];
  items: any[] = [];
  orders: any[] = [];
  expenses: any[] = [];
  displayedExpenses: any[] = [];
  editRow: { [key: string]: any } = {};
  editType: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchAll();
  }

  fetchAll() {
    this.http.get<any[]>('http://localhost:3000/users').subscribe(data => this.users = data);
    this.http.get<any[]>('http://localhost:3000/items').subscribe(data => this.items = data);
    this.http.get<any[]>('http://localhost:3000/orders').subscribe(data => this.orders = data);
    this.http.get<any[]>('http://localhost:3000/expenses').subscribe(data => {
      this.expenses = data;
      // Flatten items for table display
      this.displayedExpenses = [];
      data.forEach(exp => {
        (exp.items || []).forEach((item: any) => {
          this.displayedExpenses.push({
            id: exp.id,
            itemName: item.itemName,
            unitName: exp.unitName,
            quantity: item.quantity
          });
        });
      });
    });
  }

  startEdit(type: string, row: any) {
    this.editType = type;
    this.editRow = { ...row };
  }

  saveEdit(type: string, id: any) {
    let url = `http://localhost:3000/${type}/${id}`;
    this.http.put(url, this.editRow).subscribe(() => {
      this.fetchAll();
      this.editRow = {};
      this.editType = '';
    });
  }

  cancelEdit() {
    this.editRow = {};
    this.editType = '';
  }

  deleteRecord(type: string, id: any) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      let url = `http://localhost:3000/${type}/${id}`;
      this.http.delete(url).subscribe(() => this.fetchAll());
    }
  }

  resetAll() {
    if (confirm('هل أنت متأكد من إعادة تعيين جميع البيانات؟ سيتم حذف كل شيء!')) {
      // For demo: just clear all tables (in real app, backend should handle this)
      ['users','items','orders','expenses'].forEach(type => {
        this.http.get<any[]>(`http://localhost:3000/${type}`).subscribe(list => {
          list.forEach((row: any) => {
            this.http.delete(`http://localhost:3000/${type}/${row.id}`).subscribe(() => this.fetchAll());
          });
        });
      });
    }
  }

  startAddUser() {
    this.editType = 'addUser';
    this.editRow = { username: '', role: 'User' };
  }

  saveAddUser() {
    if (!this.editRow['username'] || !this.editRow['role']) {
      return;
    }
    this.http.post('http://localhost:3000/users', this.editRow).subscribe(() => {
      this.fetchAll();
      this.editRow = {};
      this.editType = '';
    });
  }
}
