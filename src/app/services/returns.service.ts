// src/app/services/returns.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReturnsService {
  private baseUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  // ✅ Returns - Existing functions
  getReturns(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/returns`);
  }

  addReturn(returnData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/returns`, returnData);
  }

  deleteReturn(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/returns/${id}`);
  }

  // ✅ Expenses - Existing functions
  getExpenses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/expenses`);
  }

  updateExpense(id: number, expense: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/expenses/${id}`, expense);
  }

  deleteExpense(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/expenses/${id}`);
  }

  addExpense(expense: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/expenses`, expense);
  }

  // ✅ Units - Existing functions
  getUnits(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/units`);
  }

  // 🔥 NEW: Batch Operations for better performance
  // ✅ معالجة الإرجاع في عملية مجمعة واحدة
 processReturnBatch(batchData: {
  returnData: any;
  expenseUpdates: any[];
  expenseDeletions: number[];
}): Observable<any> {
  const requests: Observable<any>[] = [];

  // تحديث المصروفات
  for (const update of batchData.expenseUpdates) {
    requests.push(this.updateExpense(update.id, update.data));
  }

  // حذف المصروفات
  for (const delId of batchData.expenseDeletions) {
    requests.push(this.deleteExpense(delId));
  }

  // إضافة الإرجاع
  requests.push(this.addReturn(batchData.returnData));

  // 🔥 تنفيذ الكل مرة واحدة
  return forkJoin(requests);
}


  // ✅ إلغاء الإرجاع في عملية مجمعة
  cancelReturnBatch(batchData: {
    returnId: number;
    expenseData?: any;
    newExpenseData?: any;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/returns/cancel-batch`, batchData);
  }

  // ✅ جلب البيانات الأساسية فقط (بدل كل شيء)
  getExpensesSummary(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/expenses-summary`);
  }

  // ✅ جلب الإرجاعات مع Pagination
  getReturnsPaginated(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/returns?_page=${page}&_limit=${limit}&_sort=id&_order=desc`);
  }

  // ✅ البحث عن مصروفات محددة
  getMatchingExpenses(unitName: string, receiverName: string, itemName: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/expenses?unitName=${unitName}&receiver=${receiverName}&items_like=${itemName}`
    );
  }
  
  // تحميل الوحدات
 
  // تحميل المناقلات
  getTransfers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/transfers`);
  }

  // تحميل المصروفات بناءً على اسم الوحدة
  getExpensesbyunitName(unitName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/expenses?unitName=${encodeURIComponent(unitName)}`);
  }

  // جلب مصروف محدد
  getExpenseById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/expenses/${id}`);
  }



  // إضافة مناقلة جديدة
  addTransfer(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/transfers`, data);
  }
}
