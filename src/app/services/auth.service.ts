
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface User {
  username: string;
  password: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000/users'; // json-server endpoint

  constructor(private router: Router, private http: HttpClient) {}

  login(username: string, password: string): Observable<boolean> {
    return this.http.get<User[]>(`${this.apiUrl}?username=${username}&password=${password}`).pipe(
      map(users => {
        if (users.length > 0&&typeof window !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(users[0]));
          return true;
        }
        return false;
      })
    );
  }

  logout() {
      if (typeof window !== 'undefined') {

    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);}
  }

 isLoggedIn(): boolean {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('currentUser');
  }
  return false;
}

getCurrentUser(): User | null {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }
  return null;
}

  getRole(): string | null {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }
}
