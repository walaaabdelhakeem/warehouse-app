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
    });
  }

  startEdit(type: string, row: any) {
  this.editType = type;
  if (type === 'expenses') {
      this.editType = type;
      this.editRow = JSON.parse(JSON.stringify(row)); // نسخ عميق للكائن
    } else {
    this.editRow = {...row};
  }
}

  validateData(type: string, data: any): boolean {
  switch(type) {
    case 'users':
      return !!data.username && !!data.role;
    case 'items':
      return !!data.itemName && !!data.stockNumber;
    case 'orders':
      return !!data.orderType && !!data.orderNumber;
    case 'expenses':
      return !!data.itemName && !!data.unitName && !isNaN(data.quantity);
    default:
      return false;
  }
}
  saveEdit(type: string, id: any) {
    if (type === 'expenses') {
      const url = `http://localhost:3000/expenses/${id}`;
      
      // التحقق من صحة البيانات
      if (!this.editRow['unitName'] || !this.editRow['items'] || this.editRow['items'].length === 0) {
        alert('البيانات غير مكتملة');
        return;
      }

      // التحقق من أن جميع العناصر تحتوي على بيانات صحيحة
      const invalidItem = this.editRow['items'].find((item: any) => 
        !item.itemName || isNaN(item.quantity) || item.quantity <= 0
      );

      if (invalidItem) {
        alert('يجب إدخال بيانات صحيحة لجميع الأصناف');
        return;
      }

      this.http.put(url, this.editRow).subscribe({
        next: () => {
          alert('تم تحديث المصروفات بنجاح');
          this.fetchAll();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('حدث خطأ أثناء الحفظ:', err);
          alert('حدث خطأ أثناء حفظ التعديلات');
        }
      });
    }

  let url = `http://localhost:3000/${type}/${id}`;
  this.http.put(url, this.editRow).subscribe(() => {
    this.fetchAll();
    this.editRow = {};
    this.editType = '';
  });
}

saveExpense(id: any) {
  const url = `http://localhost:3000/expenses/${id}`;
  
 

  this.http.put(url, this.editRow).subscribe({
    next: () => {
      alert('تم حفظ المصروفات بنجاح');
      this.fetchAll();
      this.editRow = {};
      this.editType = '';
    },
    error: (err) => {
      console.error('حدث خطأ أثناء حفظ المصروفات:', err);
      alert('حدث خطأ أثناء الحفظ');
    }
  });
}

  cancelEdit() {
    this.editRow = {};
    this.editType = '';
  }

  deleteRecord(type: string, id: any) {
  if (confirm('هل أنت متأكد من حذف هذه المصروفات؟')) {
    this.http.delete(`http://localhost:3000/${type}/${id}`).subscribe({
      next: () => {
        alert('تم الحذف بنجاح');
        this.fetchAll();
      },
      error: (err) => {
        console.error('حدث خطأ أثناء الحذف:', err);
        alert('حدث خطأ أثناء حذف المصروفات');
      }
    });
  }
}

  resetAll() {
  if (confirm('هل أنت متأكد من إعادة تعيين جميع البيانات؟ سيتم حذف كل شيء!')) {
    const types = ['users', 'items', 'orders', 'expenses'];
    let completed = 0;
    
    types.forEach(type => {
      this.http.get<any[]>(`http://localhost:3000/${type}`).subscribe({
        next: (list) => {
          if (list.length === 0) {
            completed++;
            return;
          }
          
          let deleted = 0;
          list.forEach((row: any) => {
            this.http.delete(`http://localhost:3000/${type}/${row.id}`).subscribe({
              next: () => {
                deleted++;
                if (deleted === list.length) {
                  completed++;
                  if (completed === types.length) {
                    alert('تم إعادة تعيين جميع البيانات بنجاح');
                    this.fetchAll();
                  }
                }
              },
              error: (err) => {
                console.error(`حدث خطأ أثناء حذف ${type}:`, err);
                completed++;
              }
            });
          });
        },
        error: (err) => {
          console.error(`حدث خطأ أثناء جلب ${type}:`, err);
          completed++;
        }
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
