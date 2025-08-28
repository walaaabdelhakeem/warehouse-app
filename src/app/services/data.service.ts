import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = 'http://localhost:3000'; // json-server endpoint

  constructor(private http: HttpClient) {}

  getItems(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/items`);
  }

  getUnits(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/units`);
  }

  getExpenses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/expenses`);
  }

  getReturns(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/returns`);
  }

  /**
   * Get items currently assigned to a unit (for transfer of custody)
   */
  getAssignedItemsByUnit(unitId: string): Observable<any[]> {
    // Assuming assigned items are tracked in a 'assignments' endpoint in db.json
    return this.http.get<any[]>(`${this.apiUrl}/assignments?unitId=${unitId}`);
  }

  /**
   * Transfer custody of selected items to a new receiver
   */

transferCustody(products: any[], recipientId: string) {
  // نجهز مصفوفة الـ observables
  const requests = products.map(product => {
    const updatedProduct = {
      ...product,
      recipientId: recipientId,
      status: 'Transferred'
    };

    // استدعاء الـ API لتحديث المنتج
    return this.http.put(
      `${this.apiUrl}/products/${product.id}`,
      updatedProduct
    );
  });

  // نرجع forkJoin عشان كلهم يتنفذوا مع بعض
  return forkJoin(requests);
}


  /**
   * Dispose an item: mark as disposed and remove from assignments
   */
  disposeItem(disposalData: {
    unitId: string,
    receiver: string,
    item: any,
    quantity: number,
    reason: string,
    file?: File | null
  }): Observable<any> {
    // Mark as disposed in assignments (set status/disposed flag), and remove from assignments
    const patch = this.http.patch(`${this.apiUrl}/assignments/${disposalData.item.id}`, {
      ...disposalData.item,
      quantity: disposalData.item.quantity - disposalData.quantity,
      disposed: true,
      disposeReason: disposalData.reason
    });
    // Optionally, remove assignment if quantity is zero
    let deleteReq = null;
    if (disposalData.item.quantity - disposalData.quantity <= 0) {
      deleteReq = this.http.delete(`${this.apiUrl}/assignments/${disposalData.item.id}`);
    }
    // For demo, return patch or delete observable
    return deleteReq ? deleteReq : patch;
  }

  
  // جلب البيانات
  getRecords(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/custodyrecord`);
  }

  // إضافة بيانات جديدة
  addRecord(record: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/custodyrecord`, record);
  }

  // تعديل بيانات موجودة
  updateRecord(id: string, updatedData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/custodyrecord/${id}`, updatedData);
  }

  // حذف بيانات
  deleteRecord(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/custodyrecord/${id}`);
  }
}
