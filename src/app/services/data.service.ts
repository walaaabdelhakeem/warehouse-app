import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  transferCustody(transferData: {
    fromUnit: any,
    newReceiver: string,
    items: any[],
    file?: File | null
  }): Observable<any> {
    // For demo: update each assignment's receiver, optionally upload file
    const updateRequests = transferData.items.map(item => {
      const updated = { ...item, receiver: transferData.newReceiver };
      return this.http.patch(`${this.apiUrl}/assignments/${item.id}`, updated);
    });
    // If file upload is needed, you can add logic here (not supported by json-server by default)
    if (updateRequests.length) {
      // For demo, only return the first request's observable (in real app, use forkJoin for all)
      return updateRequests[0];
    } else {
      return new Observable(observer => { observer.next(null); observer.complete(); });
    }
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
}
