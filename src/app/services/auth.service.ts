
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { jwtDecode } from "jwt-decode";


@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/'; // json-server endpoint

  constructor(private router: Router, private http: HttpClient) { }

  login(data: object): Observable<any> {
    console.log('login')
    return this.http.post(`${this.apiUrl}Auth/login`, data)
  } 
  checkifuserExist(): string | null {
    console.log('checkifuserExist')
    if (typeof localStorage != 'undefined') {
      return localStorage.getItem('token')!
    }
    return null
  }
  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      this.userData = null
      this.router.navigate(['/login']);
    }
  }


  getRole(): string | null {
    const user = localStorage.getItem('role')!
    return user ? user : null;
  }
  private userData: any

  setLocalstorgeToken(token: string): void {
    try {
      if (typeof localStorage != 'undefined') {
        localStorage.setItem('token', token)
        this.userData = jwtDecode(localStorage.getItem('token')!);
        localStorage.setItem('id', this.userData.id)
        localStorage.setItem('role', this.userData.role)

        console.log(this.userData)
      }
    }
    catch { this.logout }
  }
}
