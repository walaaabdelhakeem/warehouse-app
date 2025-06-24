import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-search',
   standalone: true,
   imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.css']
})
export class UserSearchComponent implements OnInit {
  searchTerm: string = '';
  users: any[] = [];
  assignments: any[] = [];
  items: any[] = [];
  units: any[] = [];
  results: any[] = [];

  usersLoaded = false;
  assignmentsLoaded = false;
  itemsLoaded = false;
  unitsLoaded = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchAllData();
  }

  fetchAllData() {
    this.http.get<any[]>('http://localhost:3000/users').subscribe(users => {
      this.users = users;
      this.usersLoaded = true;
      console.log('Loaded users:', users);
    });
    this.http.get<any[]>('http://localhost:3000/assignments').subscribe(assignments => {
      this.assignments = assignments;
      this.assignmentsLoaded = true;
      console.log('Loaded assignments:', assignments);
    });
    this.http.get<any[]>('http://localhost:3000/items').subscribe(items => {
      this.items = items;
      this.itemsLoaded = true;
      console.log('Loaded items:', items);
    });
    this.http.get<any[]>('http://localhost:3000/units').subscribe(units => {
      this.units = units;
      this.unitsLoaded = true;
      console.log('Loaded units:', units);
    });
  }

  allDataLoaded() {
    return this.usersLoaded && this.assignmentsLoaded && this.itemsLoaded && this.unitsLoaded;
  }

  onSearch() {
    if (!this.unitsLoaded) {
      alert('البيانات لم تكتمل التحميل بعد. الرجاء الانتظار.');
      return;
    }
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.results = [];
      return;
    }
    // Search recipients in each unit
    this.results = [];
    this.units.forEach(unit => {
      if (Array.isArray(unit.recipients)) {
        unit.recipients.forEach((recipient: string) => {
          if (recipient.toLowerCase().includes(term)) {
            this.results.push({
              recipient: recipient,
              unitName: unit.unitName,
              unitNumber: unit.unitNumber
            });
          }
        });
      }
    });
    console.log('Search results:', this.results);
  }
}
